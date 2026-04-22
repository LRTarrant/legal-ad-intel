#!/usr/bin/env python3
"""
Enrich recall_cases with plaintiff firm data via CourtListener /parties/ + /attorneys/.

Day 4 fix: the original courtlistener_recall_cases pipeline only gets attorney
data if it happens to be embedded in the search response, which is rare. This
pipeline walks recall_cases rows missing plaintiff_firm_name, fetches the
docket's parties + attorneys via CL REST, finds the Plaintiff party, extracts
the lead attorney's firm, and flips is_specialty_firm if it matches any row in
recall_specialty_firms.

This feeds the `specialty_firm_count` signal on the parent recall, unblocking
Hot / Boiling stages in the Five-Stage Thermometer.

Usage:
    python -m pipelines.courtlistener_recall_case_parties
    python -m pipelines.courtlistener_recall_case_parties --dry-run
    python -m pipelines.courtlistener_recall_case_parties --limit 50
    python -m pipelines.courtlistener_recall_case_parties --recall-id <uuid>
    python -m pipelines.courtlistener_recall_case_parties --all       # re-enrich even rows that already have firm

Env:
    COURTLISTENER_API_TOKEN   required
    SUPABASE_URL              required
    SUPABASE_SERVICE_KEY      required
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (  # noqa: E402
    PipelineRun,
    SUPABASE_URL,
    SUPABASE_KEY,
    _get,
    _headers,
)

# Reuse the proven helpers from the attorneys pipeline.
from pipelines.courtlistener_attorneys import (  # noqa: E402
    fetch_parties_for_docket,
    fetch_attorneys_for_docket,
    _build_attorney_lookup_by_party,
    _party_identifiers,
    _extract_firm_name,
    _first_non_empty_str,
)

logger = logging.getLogger(__name__)

CL_API_TOKEN = os.environ.get("COURTLISTENER_API_TOKEN", "")

# Party types that count as "plaintiff" for specialty-firm attribution.
PLAINTIFF_PARTY_TYPES = {
    "plaintiff",
    "petitioner",
    "claimant",
    "plaintiff-appellant",
    "plaintiff-appellee",
}


# ---------------------------------------------------------------------------
# Specialty-firm matching (mirrors courtlistener_recall_cases.py)
# ---------------------------------------------------------------------------

def _load_specialty_firms() -> list[dict]:
    rows = _get(
        "recall_specialty_firms",
        {"select": "firm_name,aliases", "active": "eq.true"},
    )
    return rows or []


def _match_specialty_firm(plaintiff_firm: str | None, specialty_rows: list[dict]) -> bool:
    if not plaintiff_firm:
        return False
    needle = plaintiff_firm.lower()
    for s in specialty_rows:
        if s["firm_name"].lower() in needle:
            return True
        for a in (s.get("aliases") or []):
            if a and a.lower() in needle:
                return True
    return False


# ---------------------------------------------------------------------------
# Case row selection
# ---------------------------------------------------------------------------

def _load_cases_to_enrich(
    recall_id: str | None,
    limit: int | None,
    include_already_enriched: bool,
) -> list[dict]:
    params = {
        "select": "id,external_id,recall_id,plaintiff_firm_name,is_specialty_firm",
        "source": "eq.courtlistener",
        "order": "case_filed_date.desc.nullslast",
    }
    if recall_id:
        params["recall_id"] = f"eq.{recall_id}"
    if not include_already_enriched:
        # Only rows that still need enrichment
        params["plaintiff_firm_name"] = "is.null"
    if limit:
        params["limit"] = str(limit)
    return _get("recall_cases", params) or []


# ---------------------------------------------------------------------------
# Plaintiff firm extraction
# ---------------------------------------------------------------------------

def _is_plaintiff_party(party: dict) -> bool:
    party_types = party.get("party_types") or []
    for pt in party_types:
        if not isinstance(pt, dict):
            continue
        name = (pt.get("name") or "").strip().lower()
        if name in PLAINTIFF_PARTY_TYPES:
            return True
        # Fallback fuzzy: anything starting with "plaintiff"
        if name.startswith("plaintiff"):
            return True
    return False


def _extract_plaintiff_firm_from_docket(
    cl_docket_id: int,
) -> str | None:
    """Fetch parties + attorneys for a docket, return the first plaintiff
    party's lead attorney firm name (or None)."""
    try:
        parties = fetch_parties_for_docket(cl_docket_id)
    except Exception as e:
        logger.warning("  parties fetch failed for docket %s: %s", cl_docket_id, e)
        return None

    plaintiff_parties = [p for p in parties if _is_plaintiff_party(p)]
    if not plaintiff_parties:
        return None

    try:
        attorneys = fetch_attorneys_for_docket(cl_docket_id)
    except Exception as e:
        logger.warning("  attorneys fetch failed for docket %s: %s", cl_docket_id, e)
        return None

    attorney_by_party = _build_attorney_lookup_by_party(attorneys)

    # Try each plaintiff party; return the first firm we can extract.
    for party in plaintiff_parties:
        for identifier in _party_identifiers(party):
            reps = attorney_by_party.get(identifier) or []
            for rep in reps:
                attorney_payload = rep.get("attorney") or {}
                representation = rep.get("representation") or {}
                firm = _extract_firm_name(representation, attorney_payload, None)
                if firm:
                    return firm
    return None


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

def _update_case(case_id: str, firm: str | None, is_specialty: bool) -> bool:
    url = f"{SUPABASE_URL}/rest/v1/recall_cases?id=eq.{case_id}"
    body: dict = {
        "plaintiff_firm_name": firm,
        "is_specialty_firm": is_specialty,
    }
    resp = httpx.patch(url, headers=_headers(), json=body, timeout=30)
    if resp.status_code >= 400:
        logger.warning("  failed to update case %s: %s", case_id, resp.text[:200])
        return False
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None,
                    help="Max cases to enrich in this run.")
    ap.add_argument("--recall-id", type=str, default=None,
                    help="Only enrich cases linked to this recall UUID.")
    ap.add_argument("--all", action="store_true",
                    help="Re-enrich even cases that already have plaintiff_firm_name.")
    args = ap.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "1"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(message)s",
    )

    if not CL_API_TOKEN:
        logger.error("COURTLISTENER_API_TOKEN not set")
        return 1
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL / SUPABASE_SERVICE_KEY not set")
        return 1

    dry_run = os.environ.get("DRY_RUN") == "1"

    with PipelineRun("courtlistener_recall_case_parties", trigger="manual") as run:
        with run.step("fetch_raw") as step:
            cases = _load_cases_to_enrich(
                recall_id=args.recall_id,
                limit=args.limit,
                include_already_enriched=args.all,
            )
            specialty_firms = _load_specialty_firms()
            logger.info(
                "Loaded %d cases to enrich (%d specialty firms)",
                len(cases),
                len(specialty_firms),
            )
            step.set_counts(rows_in=len(cases), rows_out=len(cases))

        # Stream-write each enriched row to Supabase as soon as it’s extracted,
        # so a cancelled / timed-out job still persists partial progress.
        with run.step("normalize_and_publish") as step:
            enriched_rows: list[dict] = []
            fetch_failed = 0
            no_firm = 0
            updated = 0
            update_failed = 0
            specialty_matches = 0

            for idx, case in enumerate(cases, 1):
                external_id = case.get("external_id") or ""
                try:
                    cl_docket_id = int(external_id)
                except (TypeError, ValueError):
                    logger.warning(
                        "[%d/%d] skipping non-numeric external_id=%r",
                        idx, len(cases), external_id,
                    )
                    fetch_failed += 1
                    continue

                firm = _extract_plaintiff_firm_from_docket(cl_docket_id)
                if firm is None:
                    # Could be no plaintiff found OR no firm extractable — we
                    # don’t differentiate here. The pipeline is idempotent so
                    # re-runs with --all will retry.
                    no_firm += 1
                    logger.info(
                        "[%d/%d] docket=%s no plaintiff firm",
                        idx, len(cases), cl_docket_id,
                    )
                    continue

                is_specialty = _match_specialty_firm(firm, specialty_firms)
                enriched_rows.append(
                    {
                        "id": case["id"],
                        "plaintiff_firm_name": firm,
                        "is_specialty_firm": is_specialty,
                    }
                )
                if is_specialty:
                    specialty_matches += 1

                # Stream-write: PATCH to Supabase inline so we don’t lose work
                # if the job is cancelled before finishing all cases.
                if dry_run:
                    logger.info(
                        "[%d/%d] docket=%s firm=%r specialty=%s  DRY-RUN",
                        idx, len(cases), cl_docket_id, firm, is_specialty,
                    )
                    updated += 1
                else:
                    ok = _update_case(case["id"], firm, is_specialty)
                    if ok:
                        updated += 1
                        logger.info(
                            "[%d/%d] docket=%s firm=%r specialty=%s  OK",
                            idx, len(cases), cl_docket_id, firm, is_specialty,
                        )
                    else:
                        update_failed += 1
                        logger.warning(
                            "[%d/%d] docket=%s firm=%r specialty=%s  UPDATE_FAILED",
                            idx, len(cases), cl_docket_id, firm, is_specialty,
                        )

            step.set_counts(rows_in=len(cases), rows_out=updated)
            step.set_metadata({
                "fetch_failed": fetch_failed,
                "no_plaintiff_firm": no_firm,
                "specialty_matches": specialty_matches,
                "update_failed": update_failed,
                "enriched_total": len(enriched_rows),
            })

    return 0


if __name__ == "__main__":
    sys.exit(main())
