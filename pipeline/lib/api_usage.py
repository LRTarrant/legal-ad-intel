"""
api_usage — provider-agnostic infra-cost logger for pipelines.

Mirrors web/lib/api-usage.ts. Writes to the `api_usage_log` Supabase
table. Distinct from `generation_costs`, which the web app populates
for per-user/per-campaign attribution.

Design:
  1. NEVER raises — cost logging is observability, not a transaction.
     Failures are printed and swallowed so they can't break a pipeline.
  2. Pass-through wrappers (`searchapi_get`, `run_apify_actor`) instrument
     calls automatically so individual pipelines don't have to remember
     to log.

Env:
  SUPABASE_URL / SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY):
    standard pipeline env. Reused via lib.pipeline helpers below.
  DRY_RUN: respected — skip inserts when set.
"""
from __future__ import annotations

import os
import time
import uuid
from typing import Any, Optional

import httpx

from .api_pricing import get_searchapi_pricing

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY", "")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() in ("true", "1", "yes")

APIFY_API_BASE = "https://api.apify.com/v2"


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def log_api_call(
    *,
    provider: str,
    operation: str,
    model_or_actor: str,
    units_consumed: float,
    unit_type: str,
    cost_usd: float,
    called_from: str,
    tenant_id: Optional[str] = None,
    request_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    """Record a single API call. Never raises.

    Args:
      provider: 'openai' | 'searchapi' | 'apify'.
      unit_type: 'tokens' | 'searches' | 'compute_units' | 'characters' |
                 'seconds' | 'images'.
      called_from: pipeline module name (e.g. 'pipelines.ad_intel_daily').
      request_id: provider's run id when known (Apify run id), else UUID.
    """
    if DRY_RUN:
        return
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[api-usage] missing Supabase env; skipping log")
        return

    row = {
        "provider": provider,
        "operation": operation,
        "model_or_actor": model_or_actor,
        "units_consumed": units_consumed,
        "unit_type": unit_type,
        "cost_usd": cost_usd,
        "request_id": request_id or str(uuid.uuid4()),
        "called_from": called_from,
        "tenant_id": tenant_id,
        "metadata": metadata or {},
    }

    try:
        resp = httpx.post(
            f"{SUPABASE_URL}/rest/v1/api_usage_log",
            headers=_headers(),
            json=row,
            timeout=15,
        )
        if resp.status_code >= 400:
            print(f"[api-usage] insert failed {resp.status_code}: {resp.text[:200]}")
    except Exception as e:  # noqa: BLE001 — observability path must not crash pipelines
        print(f"[api-usage] insert threw: {e}")


# ---------------------------------------------------------------------------
# Searchapi wrapper — one log row per successful GET
# ---------------------------------------------------------------------------


def searchapi_get(
    url: str,
    params: dict[str, Any],
    *,
    called_from: str,
    operation: str,
    timeout: int = 30,
) -> httpx.Response:
    """GET against Searchapi.io and log a usage row on 2xx.

    Returns the raw httpx.Response so callers can keep their existing
    .json() / .raise_for_status() flow. Failures are not logged
    (don't pay for retries twice in the dashboard).
    """
    resp = httpx.get(url, params=params, timeout=timeout)
    if 200 <= resp.status_code < 300:
        rate = get_searchapi_pricing()
        log_api_call(
            provider="searchapi",
            operation=operation,
            model_or_actor=str(params.get("engine", "search")),
            units_consumed=1,
            unit_type="searches",
            cost_usd=rate["rate_per_unit_usd"],
            called_from=called_from,
            metadata={"engine": params.get("engine"), "q": params.get("q")},
        )
    return resp


# ---------------------------------------------------------------------------
# Apify wrapper — cost is read from the run's terminal-state usage field
# ---------------------------------------------------------------------------


def run_apify_actor(
    actor_id: str,
    actor_input: dict,
    *,
    label: str,
    called_from: str,
    apify_token: str,
    run_timeout_seconds: int = 300,
    poll_interval: int = 5,
) -> list[dict]:
    """Run an Apify actor end-to-end and log the cost reported by Apify.

    Cost is captured from `usage.totalUsageUsd` on the run record
    once it reaches a terminal state — same poll loop we already do,
    so no extra latency.

    Returns the dataset items the actor produced (or [] if none).
    Raises on failure / timeout, exactly like the legacy helper.
    """
    run_resp = httpx.post(
        f"{APIFY_API_BASE}/acts/{actor_id}/runs",
        params={"token": apify_token},
        json=actor_input,
        timeout=60,
    )
    run_resp.raise_for_status()
    run_data = run_resp.json().get("data", {})
    run_id = run_data.get("id")
    if not run_id:
        raise ValueError(f"Apify actor run id missing for {label}")

    started = time.time()
    while True:
        status_resp = httpx.get(
            f"{APIFY_API_BASE}/actor-runs/{run_id}",
            params={"token": apify_token},
            timeout=60,
        )
        status_resp.raise_for_status()
        run_info = status_resp.json().get("data", {})
        status = run_info.get("status")

        if status == "SUCCEEDED":
            _log_apify_run(run_info, actor_id, called_from, label)
            dataset_id = run_info.get("defaultDatasetId")
            if not dataset_id:
                return []
            items_resp = httpx.get(
                f"{APIFY_API_BASE}/datasets/{dataset_id}/items",
                params={"token": apify_token},
                timeout=120,
            )
            items_resp.raise_for_status()
            return items_resp.json()

        if status in {"FAILED", "ABORTED", "TIMED-OUT"}:
            # Still log so the dashboard surfaces wasted spend on failed runs.
            _log_apify_run(run_info, actor_id, called_from, label)
            raise RuntimeError(f"Apify actor {label} ended with status={status}")

        if time.time() - started >= run_timeout_seconds:
            raise TimeoutError(
                f"Apify actor {label} exceeded {run_timeout_seconds}s timeout"
            )

        time.sleep(poll_interval)


def _log_apify_run(
    run_info: dict,
    actor_id: str,
    called_from: str,
    label: str,
) -> None:
    """Read cost off an Apify run record and log it."""
    usage = run_info.get("usage") or {}
    usage_totals = run_info.get("usageTotalUsd")
    cost_usd: float
    if isinstance(usage_totals, (int, float)):
        cost_usd = float(usage_totals)
    elif isinstance(usage.get("totalUsageUsd"), (int, float)):
        cost_usd = float(usage["totalUsageUsd"])
    else:
        cost_usd = 0.0

    compute_units = usage.get("ACTOR_COMPUTE_UNITS") or run_info.get("computeUnits") or 0

    log_api_call(
        provider="apify",
        operation=label,
        model_or_actor=actor_id,
        units_consumed=float(compute_units),
        unit_type="compute_units",
        cost_usd=cost_usd,
        called_from=called_from,
        request_id=str(run_info.get("id") or uuid.uuid4()),
        metadata={
            "status": run_info.get("status"),
            "dataset_id": run_info.get("defaultDatasetId"),
            "started_at": run_info.get("startedAt"),
            "finished_at": run_info.get("finishedAt"),
        },
    )
