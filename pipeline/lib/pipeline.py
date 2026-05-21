"""
Pipeline runner library for legal-ad-intel.

Handles creating/updating pipeline_runs and pipeline_run_steps in Supabase.
Every pipeline script should use PipelineRun as a context manager so that
runs are always marked finished—even on unhandled exceptions.

Usage:
    from lib.pipeline import PipelineRun

    with PipelineRun("ad_intel_daily", trigger="scheduled") as run:
        with run.step("fetch_raw") as step:
            rows = fetch_from_api()
            step.set_counts(rows_in=0, rows_out=len(rows))

        with run.step("normalize") as step:
            normalized = normalize(rows)
            step.set_counts(rows_in=len(rows), rows_out=len(normalized))

Environment variables:
    SUPABASE_URL             — Supabase project URL (required)
    SUPABASE_SERVICE_KEY     — Supabase service role key (required)
    DRY_RUN                  — Set to "true" to skip all DB writes (optional)
"""

from __future__ import annotations

import os
import random
import re
import sys
import time
import traceback
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import httpx

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY", "")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() in ("true", "1", "yes")


def _check_config():
    """Fail fast if required env vars are missing."""
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)")
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Supabase REST helpers
# ---------------------------------------------------------------------------

def _headers(*, want_return: bool = False) -> dict[str, str]:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if want_return:
        h["Prefer"] = "return=representation"
    return h


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _post(table: str, data: dict) -> dict:
    """Insert a row and return it. In dry-run mode, returns a fake row."""
    if DRY_RUN:
        from uuid import uuid4
        fake = {**data, "id": str(uuid4())}
        print(f"  [DRY RUN] Would insert into {table}: {list(data.keys())}")
        return fake
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = httpx.post(url, headers=_headers(want_return=True), json=data, timeout=30)
    resp.raise_for_status()
    return resp.json()[0]


def _patch(table: str, row_id: str, data: dict) -> None:
    """Update a row by ID. In dry-run mode, logs instead."""
    if DRY_RUN:
        print(f"  [DRY RUN] Would update {table} id={row_id[:8]}… with: {list(data.keys())}")
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}"
    resp = httpx.patch(url, headers=_headers(), json=data, timeout=30)
    resp.raise_for_status()


def _get(table: str, params: dict) -> list[dict]:
    """Query rows from a table. Always hits the DB (reads are safe in dry-run)."""
    _check_config()
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = httpx.get(url, headers=_headers(), params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


# Backoff (seconds) for the initial pipeline_configs read in PipelineRun.__init__.
# Guards against a sibling job's crash leaving Supabase briefly degraded — without
# this, the next job dies on its very first read and the whole chain unravels.
_CONFIG_GET_RETRY_DELAYS: tuple[int, ...] = (5, 15, 30)


def _get_with_retry(table: str, params: dict) -> list[dict]:
    """`_get` with bounded retries for transient 5xx / network errors.

    Only retries server-side / network failures; 4xx propagates immediately.
    """
    import logging
    logger = logging.getLogger(__name__)
    last_exc: Exception | None = None
    for attempt in range(len(_CONFIG_GET_RETRY_DELAYS) + 1):
        if attempt > 0:
            delay = _CONFIG_GET_RETRY_DELAYS[attempt - 1]
            logger.warning(
                "Retrying GET %s (attempt %d/%d) in ~%ds",
                table, attempt, len(_CONFIG_GET_RETRY_DELAYS), delay,
            )
            _retry_sleep(delay)
        try:
            return _get(table, params)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code < 500:
                raise
            last_exc = exc
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            last_exc = exc
    assert last_exc is not None
    raise last_exc


def _delete(table: str, params: dict) -> None:
    """Delete rows matching filter. In dry-run mode, logs instead."""
    if DRY_RUN:
        print(f"  [DRY RUN] Would delete from {table} where {params}")
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = httpx.delete(url, headers=_headers(), params=params, timeout=30)
    resp.raise_for_status()


# ---------------------------------------------------------------------------
# Text normalization helpers
# ---------------------------------------------------------------------------

_MULTI_WS_RE = re.compile(r"\s+")


def _canonicalize_name(text: str | None) -> str:
    """Lowercase, trim, collapse internal whitespace to single spaces.

    Matches the canonical alias_text form enforced by CHECK constraints on
    public.cpsc_manufacturer_aliases and public.drug_manufacturer_aliases —
    both require ``alias_text = lower(trim(alias_text))`` and reject any
    run of 2+ whitespace.

    Pipelines compose this with their own domain-specific normalization
    (e.g. legal-suffix stripping for CPSC company names) and use the
    result as the lookup key into the alias table.

    Returns "" for None/empty input.
    """
    if not text:
        return ""
    return _MULTI_WS_RE.sub(" ", text.strip().lower())


# ---------------------------------------------------------------------------
# Bulk insert
# ---------------------------------------------------------------------------

BULK_CHUNK_SIZE = 500

# Per-chunk retry delays (seconds) for transient 5xx / network errors.
# Widened in response to recall-watchlist run 25741922002, where a Cloudflare
# 502/500 storm in front of Supabase blew through the old (1,4,16) sequence
# in under 22s and crashed upsert_recalls mid-batch.
_BULK_CHUNK_RETRY_DELAYS: tuple[int, ...] = (5, 15, 45, 90)

# Per-request httpx timeout (seconds) for bulk POST and per-row fallback
# inside _bulk_insert. Long enough to ride through Cloudflare slow paths
# without a client-side timeout cutting an in-flight request short.
_BULK_REQUEST_TIMEOUT: int = 60


def _retry_sleep(delay: int) -> None:
    """Sleep `delay` seconds plus 0–25% jitter to desynchronize retries."""
    time.sleep(delay + random.uniform(0, delay * 0.25))


def _dedup_rows(rows: list[dict], keys: tuple[str, ...]) -> list[dict]:
    """Return rows deduplicated on the given key columns (last-wins per key).

    Defends against PostgREST 409 Conflict when a batch contains duplicate
    natural-key values. PostgREST's `Prefer: resolution=ignore-duplicates`
    only handles cross-row conflicts when `on_conflict=` is set, and even
    then a within-batch duplicate can still surface as a constraint
    violation depending on the underlying constraint type. Dedup the batch
    in Python first; pass `on_conflict` to `_bulk_insert` for cross-day
    conflicts.

    Args:
        rows: Row dicts.
        keys: Column names that form the natural key.

    Returns:
        New list with duplicates collapsed (last occurrence wins).
    """
    if not rows or not keys:
        return rows
    by_key: dict[tuple, dict] = {}
    for r in rows:
        k = tuple(r.get(c) for c in keys)
        by_key[k] = r
    return list(by_key.values())


def _bulk_insert(
    table: str,
    rows: list[dict],
    *,
    on_conflict: str | None = None,
    resolution: str = "ignore-duplicates",
    skip_existing: bool = False,
    chunk_size: int | None = None,
) -> int:
    """Bulk insert rows in chunks with per-chunk retry on 5xx/network errors.

    Args:
        table: Supabase table name.
        rows: List of row dicts to insert.
        on_conflict: Comma-separated column names for the ON CONFLICT target.
                     Required when the table has multiple unique constraints.
                     Must reference an actual UNIQUE constraint or matching
                     unique INDEX. Note: PostgREST 42P10 errors mean the
                     column list does not match a constraint Postgres can
                     use for ON CONFLICT inference (e.g., partial index).
        resolution: PostgREST resolution strategy.
                    'ignore-duplicates' (default) — skip rows that conflict
                                                     (only when on_conflict
                                                     is set and matches).
                    'merge-duplicates' — upsert (update on conflict).
        skip_existing: When true, on a 409 (unique-constraint violation),
                       fall back to per-row inserts within the failing
                       chunk so the rest of the batch lands. Use for
                       tables where the natural-key index can't be
                       referenced via on_conflict (e.g., partial unique
                       indexes) but we still want re-runs to be idempotent.
        chunk_size: Override the default BULK_CHUNK_SIZE for this call.
                    Useful when a specific table needs smaller batches to
                    avoid statement timeouts (e.g., wide JSONB rows).
    Returns:
        Number of rows actually written (excludes skipped duplicates).
    """
    if not rows:
        return 0
    if DRY_RUN:
        print(f"  [DRY RUN] Would insert {len(rows)} rows into {table}")
        return len(rows)

    effective_chunk_size = chunk_size if chunk_size is not None else BULK_CHUNK_SIZE

    base_url = f"{SUPABASE_URL}/rest/v1/{table}"
    params: list[str] = []
    if on_conflict:
        params.append(f"on_conflict={on_conflict}")
    if params:
        base_url += "?" + "&".join(params)
    prefer_parts = ["return=minimal"]
    if resolution:
        prefer_parts.append(f"resolution={resolution}")
    headers = {
        **_headers(),
        "Prefer": ",".join(prefer_parts),
    }
    import logging
    logger = logging.getLogger(__name__)
    total_sent = 0
    skipped_dupes = 0

    for i in range(0, len(rows), effective_chunk_size):
        chunk = rows[i : i + effective_chunk_size]
        logger.info("Inserting chunk %d-%d of %d into %s", i, i + len(chunk), len(rows), table)

        # Per-chunk retry loop: up to len(_BULK_CHUNK_RETRY_DELAYS) retries on
        # 5xx server errors and transient network failures.  4xx client errors
        # are not retried — they indicate data problems, not transient issues.
        resp = None
        for attempt in range(len(_BULK_CHUNK_RETRY_DELAYS) + 1):
            if attempt > 0:
                delay = _BULK_CHUNK_RETRY_DELAYS[attempt - 1]
                logger.warning(
                    "Chunk %d-%d: retry %d/%d in ~%ds",
                    i, i + len(chunk), attempt, len(_BULK_CHUNK_RETRY_DELAYS), delay,
                )
                _retry_sleep(delay)
            try:
                resp = httpx.post(base_url, headers=headers, json=chunk, timeout=_BULK_REQUEST_TIMEOUT)
            except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
                if attempt < len(_BULK_CHUNK_RETRY_DELAYS):
                    logger.warning(
                        "Chunk %d-%d network error (%s), will retry",
                        i, i + len(chunk), type(exc).__name__,
                    )
                    continue
                raise
            # 4xx: don't retry (includes 409 handled below and real client errors)
            if resp.status_code < 500:
                break
            # 5xx: retry if attempts remain, otherwise fall through to raise
            if attempt < len(_BULK_CHUNK_RETRY_DELAYS):
                logger.warning(
                    "Chunk %d-%d server error %d, will retry",
                    i, i + len(chunk), resp.status_code,
                )
                continue
            break  # all retries exhausted; raise_for_status below

        if resp is None:
            raise RuntimeError(f"_bulk_insert: no response after retry loop for {table}")

        if resp.status_code == 409 and skip_existing:
            # Chunk had at least one row that violates a unique constraint.
            # Fall back to per-row inserts so the non-duplicate rows land.
            logger.warning(
                "Chunk had unique-constraint violation; falling back to "
                "per-row insert for %s (chunk size=%d)", table, len(chunk),
            )
            for row in chunk:
                row_resp = httpx.post(base_url, headers=headers, json=[row], timeout=_BULK_REQUEST_TIMEOUT)
                if row_resp.status_code == 409:
                    skipped_dupes += 1
                    continue
                if row_resp.status_code >= 400:
                    logger.error(
                        "Per-row insert error %d for %s: %s",
                        row_resp.status_code, table, row_resp.text[:500],
                    )
                    row_resp.raise_for_status()
                total_sent += 1
            continue

        if resp.status_code >= 400:
            logger.error(
                "Bulk insert error %d for %s: %s",
                resp.status_code, table, resp.text[:500],
            )
        resp.raise_for_status()
        total_sent += len(chunk)

    if skipped_dupes:
        logger.info("Skipped %d duplicate rows on %s", skipped_dupes, table)
    return total_sent


# ---------------------------------------------------------------------------
# PipelineStep
# ---------------------------------------------------------------------------

class PipelineStep:
    """Tracks a single step inside a pipeline run."""

    def __init__(self, run_id: str, step_name: str, step_order: int):
        self.run_id = run_id
        self.step_name = step_name
        self.step_order = step_order
        self.row_id: Optional[str] = None
        self.rows_in = 0
        self.rows_out = 0
        self.rows_rejected = 0
        self._status = "pending"
        self._error: Optional[str] = None
        self._error_details: Optional[dict] = None
        self._metadata: dict[str, Any] = {}

    def start(self) -> "PipelineStep":
        row = _post("pipeline_run_steps", {
            "run_id": self.run_id,
            "step_name": self.step_name,
            "step_order": self.step_order,
            "status": "running",
            "started_at": _now_iso(),
        })
        self.row_id = row["id"]
        self._status = "running"
        print(f"  ▸ Step {self.step_order}: {self.step_name} → running")
        return self

    def set_counts(self, *, rows_in: int = 0, rows_out: int = 0, rows_rejected: int = 0):
        self.rows_in = rows_in
        self.rows_out = rows_out
        self.rows_rejected = rows_rejected

    def set_metadata(self, data: dict):
        self._metadata.update(data)

    def set_error_details(self, details: dict):
        self._error_details = details

    def finish(self, status: str, error: Optional[str] = None):
        if not self.row_id:
            return
        self._status = status
        self._error = error
        payload: dict[str, Any] = {
            "status": status,
            "finished_at": _now_iso(),
            "rows_in": self.rows_in,
            "rows_out": self.rows_out,
            "rows_rejected": self.rows_rejected,
        }
        if self._metadata:
            payload["metadata"] = self._metadata
        if error:
            payload["error_message"] = error[:4000]
        if self._error_details:
            payload["error_details"] = self._error_details
        _patch("pipeline_run_steps", self.row_id, payload)
        symbol = "✓" if status == "success" else "✗" if status == "failed" else "⊘"
        print(f"  {symbol} Step {self.step_order}: {self.step_name} → {status}  "
              f"(in={self.rows_in}, out={self.rows_out}, rejected={self.rows_rejected})")


# ---------------------------------------------------------------------------
# PipelineRun
# ---------------------------------------------------------------------------

class PipelineRun:
    """
    Context manager that wraps an entire pipeline execution.

    On __exit__, it auto-marks the run as 'success', 'partial_success',
    or 'failed' depending on step outcomes.
    """

    def __init__(self, pipeline_name: str, *, trigger: str = "scheduled",
                 retry_of: Optional[str] = None, attempt: int = 1,
                 metadata: Optional[dict] = None):
        _check_config()
        self.pipeline_name = pipeline_name
        self.trigger = trigger
        self.retry_of = retry_of
        self.attempt = attempt
        self.run_id: Optional[str] = None
        self._steps: list[PipelineStep] = []
        self._metadata = metadata or {}

        if DRY_RUN:
            self._metadata["dry_run"] = True

        # Pull source_domain from pipeline_configs. Wrap in retry so a transient
        # Supabase blip — e.g. a sibling job crashing and briefly degrading the
        # PostgREST instance — doesn't kill this job before it even starts.
        configs = _get_with_retry("pipeline_configs", {
            "pipeline_name": f"eq.{pipeline_name}",
            "select": "source_domain,step_definitions",
        })
        if not configs:
            raise ValueError(f"No pipeline_config found for '{pipeline_name}'")
        self.source_domain = configs[0]["source_domain"]
        self.step_definitions = configs[0].get("step_definitions", [])

    # -- totals helpers ------------------------------------------------

    @property
    def total_ingested(self) -> int:
        return sum(s.rows_out for s in self._steps if s.step_name == "fetch_raw")

    @property
    def total_normalized(self) -> int:
        return sum(s.rows_out for s in self._steps if s.step_name == "normalize")

    @property
    def total_scored(self) -> int:
        return sum(s.rows_out for s in self._steps if s.step_name == "score")

    @property
    def total_rejected(self) -> int:
        return sum(s.rows_rejected for s in self._steps)

    # -- lifecycle -----------------------------------------------------

    def __enter__(self) -> "PipelineRun":
        row = _post("pipeline_runs", {
            "pipeline_name": self.pipeline_name,
            "source_domain": self.source_domain,
            "trigger_type": self.trigger,
            "status": "running",
            "started_at": _now_iso(),
            "attempt_number": self.attempt,
            "retry_of": self.retry_of,
            "metadata": self._metadata,
        })
        self.run_id = row["id"]
        mode = " [DRY RUN]" if DRY_RUN else ""
        print(f"\n{'='*60}")
        print(f"Pipeline: {self.pipeline_name}  (run={self.run_id[:8]}…){mode}")
        print(f"Domain:   {self.source_domain}  |  Trigger: {self.trigger}")
        print(f"{'='*60}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Failure surfacing rule: any step failure (raised exception OR a
        # step that called .finish('failed') manually) must propagate as a
        # non-zero shell exit so CI turns red. The previous version returned
        # True here, swallowing the exception, and the no-exception
        # partial_success path returned False without signalling — both
        # caused green CI on failed runs ("silent green" observability bug).
        # We preserve the friendly logging + DB update, then raise
        # SystemExit(1) so the script exits non-zero without printing a
        # noisy Python traceback (Python's interpreter handles SystemExit
        # specially — no traceback when the value is an int).
        if exc_type:
            error_msg = f"{exc_type.__name__}: {exc_val}"
            tb = "".join(traceback.format_exception(exc_type, exc_val, exc_tb))
            # Mark any running steps as failed
            for s in self._steps:
                if s._status == "running":
                    s.finish("failed", error=error_msg)
            self._finish_run("failed", error=error_msg)
            self._metadata["traceback"] = tb[:4000]
            print(f"\n✗ Pipeline FAILED: {error_msg}")
            raise SystemExit(1)

        # Determine final status from step outcomes
        statuses = [s._status for s in self._steps]
        if all(s in ("success", "skipped") for s in statuses):
            final = "success"
        elif any(s == "failed" for s in statuses):
            final = "partial_success"
        else:
            final = "success"

        self._finish_run(final)
        symbol = "✓" if final == "success" else "◐"
        print(f"\n{symbol} Pipeline finished: {final}")
        print(f"  Ingested={self.total_ingested}  Normalized={self.total_normalized}  "
              f"Scored={self.total_scored}  Rejected={self.total_rejected}")
        if final != "success":
            # partial_success: at least one step manually marked itself
            # failed without raising. Treat as a failure for CI purposes —
            # see the failure-surfacing rule comment above.
            raise SystemExit(1)
        return False

    def _finish_run(self, status: str, error: Optional[str] = None):
        if not self.run_id:
            return
        payload: dict[str, Any] = {
            "status": status,
            "finished_at": _now_iso(),
            "rows_ingested": self.total_ingested,
            "rows_normalized": self.total_normalized,
            "rows_scored": self.total_scored,
            "rows_rejected": self.total_rejected,
        }
        if error:
            payload["error_summary"] = error[:2000]
        if self._metadata:
            payload["metadata"] = self._metadata
        _patch("pipeline_runs", self.run_id, payload)

    # -- step management -----------------------------------------------

    @contextmanager
    def step(self, step_name: str):
        """
        Context manager for a pipeline step. Auto-determines step_order
        from step_definitions, starts the step, and finishes it on exit.
        """
        # Find step_order from config
        step_order = None
        for defn in self.step_definitions:
            if defn["step_name"] == step_name:
                step_order = defn["step_order"]
                break
        if step_order is None:
            step_order = len(self._steps) + 1

        s = PipelineStep(self.run_id, step_name, step_order)
        self._steps.append(s)
        s.start()

        try:
            yield s
            if s._status == "running":  # not already finished by user
                s.finish("success")
        except Exception as e:
            s.finish("failed", error=f"{type(e).__name__}: {e}")
            raise  # re-raise so PipelineRun.__exit__ sees it

    def skip_step(self, step_name: str, reason: str = ""):
        """Mark a step as skipped without executing it."""
        step_order = None
        for defn in self.step_definitions:
            if defn["step_name"] == step_name:
                step_order = defn["step_order"]
                break
        if step_order is None:
            step_order = len(self._steps) + 1

        s = PipelineStep(self.run_id, step_name, step_order)
        self._steps.append(s)
        s.start()
        s.set_metadata({"skip_reason": reason})
        s.finish("skipped")
