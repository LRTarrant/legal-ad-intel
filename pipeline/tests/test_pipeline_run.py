"""Tests for lib.pipeline.PipelineRun lifecycle — exit code propagation.

Regression guards for the silent-green-CI bug: when a step inside a
PipelineRun fails (either by raising or by calling step.finish('failed')
manually), the surrounding script must exit non-zero so GitHub Actions
turns the workflow run red. Prior to this PR, PipelineRun.__exit__
returned True on the exception path (swallowing the exception) and
False on the partial_success path (no exception to suppress, no signal
to caller) — both ended with main() returning 0 and CI showing green.

These tests pin the new contract: any step failure raises SystemExit(1)
on __exit__, which `sys.exit(main())` translates to a non-zero shell
exit without printing a noisy Python traceback.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# lib.pipeline reads env at import — provide harmless placeholders.
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-key")

import lib.pipeline as pipeline_mod  # noqa: E402
from lib.pipeline import PipelineRun  # noqa: E402


# ---------------------------------------------------------------------------
# Mock harness — stub out every Supabase round-trip PipelineRun makes.
# ---------------------------------------------------------------------------

@pytest.fixture
def stub_db(monkeypatch):
    """Replace _post / _patch / _get_with_retry with in-memory stubs.

    PipelineRun.__init__ pulls pipeline_configs; __enter__ POSTs to
    pipeline_runs; step.start POSTs pipeline_run_steps; step.finish and
    run._finish_run PATCH the respective rows. We don't need the DB to
    test exit-code propagation — only that the PipelineRun lifecycle
    runs without trying to hit Supabase.

    Also stubs the module-level SUPABASE_URL / SUPABASE_KEY constants —
    lib.pipeline reads env vars at import time, and the first import may
    happen before this test file sets its env defaults.
    """
    calls: dict[str, list] = {"post": [], "patch": [], "get": []}
    next_id = iter(range(1, 1_000_000))

    def fake_get_with_retry(table, params):
        calls["get"].append((table, params))
        return [{
            "source_domain": "ad_intelligence",
            "step_definitions": [
                {"step_name": "fetch_raw", "step_order": 1},
                {"step_name": "normalize", "step_order": 2},
            ],
        }]

    def fake_post(table, data):
        calls["post"].append((table, data))
        return {**data, "id": f"row-{next(next_id)}"}

    def fake_patch(table, row_id, data):
        calls["patch"].append((table, row_id, data))

    monkeypatch.setattr(pipeline_mod, "SUPABASE_URL", "https://fake.supabase.co")
    monkeypatch.setattr(pipeline_mod, "SUPABASE_KEY", "fake-key")
    monkeypatch.setattr(pipeline_mod, "_get_with_retry", fake_get_with_retry)
    monkeypatch.setattr(pipeline_mod, "_post", fake_post)
    monkeypatch.setattr(pipeline_mod, "_patch", fake_patch)
    return calls


# ---------------------------------------------------------------------------
# Bug 2 regression — exception path
# ---------------------------------------------------------------------------

class TestExitCodeOnException:
    def test_step_exception_raises_systemexit_one(self, stub_db):
        """A step body that raises must propagate as SystemExit(1).

        Previously: __exit__ returned True, swallowed the exception, and
        the script exited 0 → green CI on a failed run.
        """
        with pytest.raises(SystemExit) as exc_info:
            with PipelineRun("test_pipeline", trigger="manual") as run:
                with run.step("fetch_raw"):
                    raise RuntimeError("openfda HTTP 500")

        assert exc_info.value.code == 1

    def test_run_row_marked_failed_in_db(self, stub_db):
        """Friendly logging path still updates pipeline_runs.status='failed'."""
        with pytest.raises(SystemExit):
            with PipelineRun("test_pipeline", trigger="manual") as run:
                with run.step("fetch_raw"):
                    raise RuntimeError("boom")

        # Find the PATCH that finalised pipeline_runs.
        run_patches = [
            data for (table, _, data) in stub_db["patch"]
            if table == "pipeline_runs"
        ]
        assert run_patches, "expected pipeline_runs PATCH on exit"
        assert run_patches[-1]["status"] == "failed"
        assert "error_summary" in run_patches[-1]

    def test_error_summary_includes_exception_message(self, stub_db):
        """error_summary on the run row preserves the exception text."""
        with pytest.raises(SystemExit):
            with PipelineRun("test_pipeline", trigger="manual") as run:
                with run.step("fetch_raw"):
                    raise ValueError("specific failure message")

        run_patches = [
            data for (table, _, data) in stub_db["patch"]
            if table == "pipeline_runs"
        ]
        assert "specific failure message" in run_patches[-1]["error_summary"]


# ---------------------------------------------------------------------------
# Bug 2 regression — partial_success path (step failed without raising)
# ---------------------------------------------------------------------------

class TestExitCodeOnPartialSuccess:
    def test_manual_step_failure_without_raise_still_exits_one(self, stub_db):
        """Step that calls finish('failed') without raising must still exit 1.

        Behavior change vs prior PipelineRun: previously a step that marked
        itself failed without raising left the run as 'partial_success' and
        the script exited 0 → green CI. We treat partial_success as a CI
        failure now. From the 19-pipeline grep, no current pipeline relies
        on the old behavior, but this test pins the new contract.
        """
        with pytest.raises(SystemExit) as exc_info:
            with PipelineRun("test_pipeline", trigger="manual") as run:
                with run.step("fetch_raw") as step:
                    step.finish("failed", error="manual failure, no raise")

        assert exc_info.value.code == 1

    def test_partial_success_status_recorded_in_db(self, stub_db):
        """Run row reflects partial_success even though we exit 1."""
        with pytest.raises(SystemExit):
            with PipelineRun("test_pipeline", trigger="manual") as run:
                with run.step("fetch_raw") as step:
                    step.finish("failed", error="manual")
                with run.step("normalize"):
                    pass  # this one succeeds

        run_patches = [
            data for (table, _, data) in stub_db["patch"]
            if table == "pipeline_runs"
        ]
        # Final status should be partial_success (mixed step outcomes), even
        # though we exit 1.
        assert run_patches[-1]["status"] == "partial_success"


# ---------------------------------------------------------------------------
# Happy path — all-success runs must still exit 0
# ---------------------------------------------------------------------------

class TestExitCodeOnSuccess:
    def test_all_steps_succeed_no_systemexit(self, stub_db):
        """Successful runs must NOT raise SystemExit — sys.exit(main()) returns 0."""
        # If __exit__ raised SystemExit here it would propagate; assert it
        # doesn't by simply running the with block.
        with PipelineRun("test_pipeline", trigger="manual") as run:
            with run.step("fetch_raw") as step:
                step.set_counts(rows_in=0, rows_out=10)
            with run.step("normalize") as step:
                step.set_counts(rows_in=10, rows_out=10)
        # If we got here without SystemExit, the test passes.

    def test_skipped_steps_count_as_success(self, stub_db):
        """A run with only success+skipped steps must NOT exit 1."""
        with PipelineRun("test_pipeline", trigger="manual") as run:
            with run.step("fetch_raw") as step:
                step.set_counts(rows_in=0, rows_out=10)
            run.skip_step("normalize", reason="nothing to normalize")
