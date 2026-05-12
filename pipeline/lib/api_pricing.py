"""
api_pricing — read provider pricing from Supabase api_pricing_config.

Searchapi (and any future flat-rate provider) keeps its rate per unit
and monthly plan quota in api_pricing_config so a plan upgrade is a
single SQL UPDATE. OpenAI per-model rates stay in
web/lib/cost-tracking/calculator.ts (too many variants for a table).
Apify cost is read from the run's `usage.totalUsageUsd` directly.

Functions never raise; on any failure they return a documented fallback
so pipelines stay safe even if the config table is unreachable.
"""
from __future__ import annotations

import os
import time
from datetime import date
from typing import Optional, TypedDict

import httpx

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY", "")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)

# Searchapi.io Developer plan — falls through here when the config
# table is unreachable. Update the seed in the migration when you upgrade.
SEARCHAPI_FALLBACK_RATE = 0.0099
SEARCHAPI_FALLBACK_QUOTA = 10000

_CACHE_TTL_SECONDS = 300  # 5 minutes


class Pricing(TypedDict):
    rate_per_unit_usd: float
    monthly_quota_units: Optional[int]


_searchapi_cache: dict = {"value": None, "ts": 0.0}


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }


def get_searchapi_pricing() -> Pricing:
    """Return the latest active Searchapi rate + monthly quota.

    Reads `api_pricing_config` ordered by effective_from DESC. Cached
    5 minutes per process. Falls back to Developer-plan defaults on
    any error.
    """
    now = time.time()
    cached = _searchapi_cache["value"]
    if cached is not None and now - _searchapi_cache["ts"] < _CACHE_TTL_SECONDS:
        return cached  # type: ignore[no-any-return]

    fallback: Pricing = {
        "rate_per_unit_usd": SEARCHAPI_FALLBACK_RATE,
        "monthly_quota_units": SEARCHAPI_FALLBACK_QUOTA,
    }

    if not SUPABASE_URL or not SUPABASE_KEY:
        return fallback

    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/api_pricing_config",
            headers=_headers(),
            params={
                "select": "rate_per_unit_usd,monthly_quota_units,effective_from",
                "provider": "eq.searchapi",
                "unit_type": "eq.searches",
                "effective_from": f"lte.{date.today().isoformat()}",
                "order": "effective_from.desc",
                "limit": 1,
            },
            timeout=10,
        )
        if resp.status_code >= 400:
            return fallback
        rows = resp.json()
        if not rows:
            return fallback
        row = rows[0]
        value: Pricing = {
            "rate_per_unit_usd": float(row["rate_per_unit_usd"]),
            "monthly_quota_units": row.get("monthly_quota_units"),
        }
        _searchapi_cache["value"] = value
        _searchapi_cache["ts"] = now
        return value
    except Exception:  # noqa: BLE001 — pricing read must not crash pipelines
        return fallback
