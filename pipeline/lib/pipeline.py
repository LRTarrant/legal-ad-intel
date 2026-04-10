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
import sys
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


def _delete(table: str, params: dict) -> None:
    """Delete rows matching filter. In dry-run mode, logs instead."""
    if DRY_RUN:
        print(f"  [DRY RUN] Would delete from {table} where {params}")
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = httpx.delete(url, headers=_headers(), params=params, timeout=30)
    resp.raise_for_status()


def _bulk_insert(table: str, rows: list[dict]) -> int:
    """Bulk insert rows. In dry-run mode, logs summary. Returns count."""
    if not rows:
        return 0
    if DRY_RUN:
        print(f"  [DRY RUN] Would insert {len(rows)} rows into {table}")
        return len(rows)
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        **_headers(),
        "Prefer": "return=minimal,resolution=merge-duplicates",
    }
    resp = httpx.post(url, headers=headers, json=rows, timeout=60)
    resp.raise_for_status()
    return len(rows)


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

        # Pull source_domain from pipeline_configs
        configs = _get("pipeline_configs", {
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
            return True  # suppress exception so script exits cleanly

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
