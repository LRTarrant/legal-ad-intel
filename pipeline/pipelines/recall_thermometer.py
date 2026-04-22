#!/usr/bin/env python3
"""
Five-Stage Thermometer scoring for recalls.

Reads recall_cases, specialty-firm flags, and MDL signals to compute a 1-5
heat stage per recall, writing back to public.recalls (stage, stage_label,
case_count, state_count, specialty_firm_count, last_scored_at) and inserting
a public.recall_stage_history row when the stage changes.

Stage thresholds (v1, intentionally conservative):

  1 COLD      — no cases on file
  2 WARMING   — 1-4 cases, fewer than 3 states, no specialty firms
  3 WARM      — 5-24 cases OR 3+ states OR 1+ specialty firm
  4 HOT       — 25+ cases AND 5+ states AND 2+ specialty firms
                OR mdl_petition_filed = true
  5 BOILING   — mdl_formed = true
                OR (50+ cases AND 10+ states AND 4+ specialty firms)

Usage:
    python -m pipelines.recall_thermometer
    python -m pipelines.recall_thermometer --dry-run
    python -m pipelines.recall_thermometer --recall-id <uuid>

Env:
    SUPABASE_URL             required
    SUPABASE_SERVICE_KEY     required
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (  # noqa: E402
    PipelineRun,
    DRY_RUN,
    SUPABASE_URL,
    SUPABASE_KEY,
    _bulk_insert,
    _get,
    _headers,
)

logger = logging.getLogger(__name__)

STAGE_LABELS = {
    1: "cold",
    2: "warming",
    3: "warm",
    4: "hot",
    5: "boiling",
}


# ---------------------------------------------------------------------------
# Scoring logic
# ---------------------------------------------------------------------------

def compute_stage(
    case_count: int,
    state_count: int,
    specialty_firm_count: int,
    mdl_petition_filed: bool,
    mdl_formed: bool,
) -> int:
    if mdl_formed:
        return 5
    if case_count >= 50 and state_count >= 10 and specialty_firm_count >= 4:
        return 5
    if mdl_petition_filed:
        return 4
    if case_count >= 25 and state_count >= 5 and specialty_firm_count >= 2:
        return 4
    if case_count >= 5 or state_count >= 3 or specialty_firm_count >= 1:
        return 3
    if case_count >= 1:
        return 2
    return 1


def reason_for_change(
    prev_stage: int,
    new_stage: int,
    prev_case_count: int,
    new_case_count: int,
    prev_specialty_count: int,
    new_specialty_count: int,
    mdl_petition_filed: bool,
    mdl_formed: bool,
) -> str:
    if mdl_formed and prev_stage < 5:
        return "mdl_formed"
    if mdl_petition_filed and prev_stage < 4:
        return "jpml_petition"
    if new_specialty_count > prev_specialty_count:
        return "specialty_firm"
    if new_case_count > prev_case_count:
        return "new_case"
    return "recompute"


# ---------------------------------------------------------------------------
# Aggregation helpers (client-side, since PostgREST has no GROUP BY)
# ---------------------------------------------------------------------------

def _fetch_all(table: str, params: dict, page_size: int = 1000) -> list[dict]:
    """Paginate through a PostgREST table."""
    all_rows: list[dict] = []
    offset = 0
    while True:
        p = dict(params)
        p["limit"] = str(page_size)
        p["offset"] = str(offset)
        rows = _get(table, p) or []
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return all_rows


def _aggregate_cases_by_recall() -> dict[str, dict]:
    """Return dict keyed by recall_id with aggregated case stats."""
    cases = _fetch_all("recall_cases", {
        "select": "recall_id,state_code,is_specialty_firm,case_filed_date",
    })
    agg: dict[str, dict] = {}
    for c in cases:
        rid = c.get("recall_id")
        if not rid:
            continue
        a = agg.setdefault(rid, {
            "case_count": 0,
            "states": set(),
            "specialty_count": 0,
            "first_case_filed": None,
            "last_case_filed": None,
        })
        a["case_count"] += 1
        if c.get("state_code"):
            a["states"].add(c["state_code"])
        if c.get("is_specialty_firm"):
            a["specialty_count"] += 1
        d = c.get("case_filed_date")
        if d:
            if not a["first_case_filed"] or d < a["first_case_filed"]:
                a["first_case_filed"] = d
            if not a["last_case_filed"] or d > a["last_case_filed"]:
                a["last_case_filed"] = d
    return agg


# ---------------------------------------------------------------------------
# Recall update + stage history
# ---------------------------------------------------------------------------

def _patch_recall(recall_id: str, patch: dict) -> None:
    if DRY_RUN:
        logger.info("  [DRY] patch recalls %s %s", recall_id, patch)
        return
    url = f"{SUPABASE_URL}/rest/v1/recalls?id=eq.{recall_id}"
    resp = httpx.patch(
        url,
        headers={**_headers(), "Prefer": "return=minimal"},
        json=patch,
        timeout=30,
    )
    resp.raise_for_status()


def _insert_stage_history(rows: list[dict]) -> int:
    if not rows:
        return 0
    return _bulk_insert(
        "recall_stage_history",
        rows,
        # no unique constraint — stage_history is append-only
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--recall-id", type=str, default=None,
                    help="Only re-score this specific recall UUID.")
    args = ap.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "1"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(message)s",
    )

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL / SUPABASE_SERVICE_KEY not set")
        return 1

    with PipelineRun("recall_thermometer", trigger="manual") as run:
        history_rows: list[dict] = []
        changed = 0

        with run.step("score") as step:
            recall_params: dict[str, str] = {
                "select": ("id,stage,stage_label,case_count,state_count,"
                           "specialty_firm_count,mdl_petition_filed,mdl_formed,"
                           "first_case_filed_at,last_case_filed_at"),
            }
            if args.recall_id:
                recall_params["id"] = f"eq.{args.recall_id}"
            recalls = _fetch_all("recalls", recall_params)
            logger.info("Scoring %d recalls", len(recalls))

            agg = _aggregate_cases_by_recall()
            now_iso = datetime.now(timezone.utc).isoformat()

            for r in recalls:
                rid = r["id"]
                a = agg.get(rid, {
                    "case_count": 0,
                    "states": set(),
                    "specialty_count": 0,
                    "first_case_filed": None,
                    "last_case_filed": None,
                })
                new_cc = a["case_count"]
                new_sc = len(a["states"])
                new_spc = a["specialty_count"]
                mdl_pet = bool(r.get("mdl_petition_filed"))
                mdl_frm = bool(r.get("mdl_formed"))

                new_stage = compute_stage(new_cc, new_sc, new_spc, mdl_pet, mdl_frm)
                new_label = STAGE_LABELS[new_stage]
                prev_stage = int(r.get("stage") or 1)
                prev_label = r.get("stage_label") or STAGE_LABELS[prev_stage]

                patch = {
                    "case_count": new_cc,
                    "state_count": new_sc,
                    "specialty_firm_count": new_spc,
                    "stage": new_stage,
                    "stage_label": new_label,
                    "first_case_filed_at": a["first_case_filed"],
                    "last_case_filed_at": a["last_case_filed"],
                    "last_scored_at": now_iso,
                }
                _patch_recall(rid, patch)

                if new_stage != prev_stage:
                    changed += 1
                    history_rows.append({
                        "recall_id": rid,
                        "from_stage": prev_stage,
                        "to_stage": new_stage,
                        "from_label": prev_label,
                        "to_label": new_label,
                        "trigger_reason": reason_for_change(
                            prev_stage, new_stage,
                            int(r.get("case_count") or 0), new_cc,
                            int(r.get("specialty_firm_count") or 0), new_spc,
                            mdl_pet, mdl_frm,
                        ),
                    })

            step.set_counts(rows_in=len(recalls), rows_out=len(recalls))
            step.set_metadata({"stage_changes": changed})

        with run.step("publish") as step:
            inserted = _insert_stage_history(history_rows)
            step.set_counts(rows_in=len(history_rows), rows_out=inserted)

    return 0


if __name__ == "__main__":
    sys.exit(main())
