#!/usr/bin/env python3
"""
CourtListener party-search → recall_cases pipeline.

For each manufacturer in public.recall_manufacturers, query CourtListener's
search API (type=r, recap dockets) with the manufacturer's canonical_name and
aliases as defendant-party queries. Upsert each matching docket into
public.recall_cases, linked to the manufacturer's most-recent still-open recall
as a heuristic. (Finer recall-event linking lands in Day 4.)

Usage:
    python -m pipelines.courtlistener_recall_cases
    python -m pipelines.courtlistener_recall_cases --dry-run
    python -m pipelines.courtlistener_recall_cases --limit-mfrs 5
    python -m pipelines.courtlistener_recall_cases --mfr "Philips"
    python -m pipelines.courtlistener_recall_cases --since 2023-01-01

Env:
    COURTLISTENER_API_TOKEN   required (free; raises limit to 5k/hr)
    SUPABASE_URL              required
    SUPABASE_SERVICE_KEY      required
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from datetime import datetime, date, timezone, timedelta
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
)

logger = logging.getLogger(__name__)

CL_API_TOKEN = os.environ.get("COURTLISTENER_API_TOKEN", "")
CL_BASE = "https://www.courtlistener.com/api/rest/v4"
REQUEST_DELAY_SECONDS = 1.5        # 5k/hr = ~1.4 req/s; stay polite
RATE_LIMIT_WAIT_SECONDS = 60
MAX_RETRIES = 3

# Default lookback window for case search. We care about post-recall filings.
DEFAULT_SINCE_YEARS = 3

# If a manufacturer name is shorter than this, require exact-phrase match to
# avoid absurdly broad hits (e.g. "3M" or "GE").
SHORT_NAME_THRESHOLD = 4

_last_api_call_at = 0.0


# ---------------------------------------------------------------------------
# CourtListener HTTP
# ---------------------------------------------------------------------------

def _cl_headers() -> dict[str, str]:
    h = {"Accept": "application/json"}
    if CL_API_TOKEN:
        h["Authorization"] = f"Token {CL_API_TOKEN}"
    return h


def _rate_limited_sleep() -> None:
    global _last_api_call_at
    now = time.monotonic()
    elapsed = now - _last_api_call_at
    if elapsed < REQUEST_DELAY_SECONDS:
        time.sleep(REQUEST_DELAY_SECONDS - elapsed)


def _cl_get(url: str, params: dict | None = None) -> dict | None:
    global _last_api_call_at
    for attempt in range(MAX_RETRIES):
        _rate_limited_sleep()
        try:
            resp = httpx.get(url, headers=_cl_headers(), params=params, timeout=30)
            _last_api_call_at = time.monotonic()
            if resp.status_code == 429:
                wait = RATE_LIMIT_WAIT_SECONDS * (attempt + 1)
                logger.warning("CL 429 rate-limit; sleeping %ss", wait)
                time.sleep(wait)
                continue
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            logger.warning("CL request failed (attempt %d): %s", attempt + 1, e)
            time.sleep(2 ** attempt)
    return None


# ---------------------------------------------------------------------------
# Search helpers
# ---------------------------------------------------------------------------

def _build_party_query(name: str, aliases: list[str]) -> str:
    """Build CL search query string targeting defendant party names."""
    names = [name] + [a for a in (aliases or []) if a and a.strip()]
    # Deduplicate, keep order
    seen: set[str] = set()
    clean: list[str] = []
    for n in names:
        n = n.strip()
        key = n.lower()
        if key and key not in seen:
            seen.add(key)
            clean.append(n)
    # Short names (e.g. "GE", "3M") → exact phrase match only
    quoted = []
    for n in clean:
        if len(n) < SHORT_NAME_THRESHOLD or " " not in n:
            quoted.append(f'"{n}"')
        else:
            quoted.append(f'"{n}"')  # always exact; reduces false positives
    return " OR ".join(quoted)


def _search_cl_for_mfr(query: str, since: date, max_pages: int = 5) -> list[dict]:
    """Search CL /search/ with type=r (RECAP dockets), filter to defendant party."""
    results: list[dict] = []
    url = f"{CL_BASE}/search/"
    page = 1
    while page <= max_pages:
        params = {
            "type": "r",
            "q": query,
            "party_name": query,              # narrow to party field
            "filed_after": since.isoformat(),
            "order_by": "dateFiled desc",
            "page": page,
        }
        data = _cl_get(url, params=params)
        if not data:
            break
        hits = data.get("results") or []
        if not hits:
            break
        results.extend(hits)
        if not data.get("next"):
            break
        page += 1
    return results


# ---------------------------------------------------------------------------
# Specialty-firm matching
# ---------------------------------------------------------------------------

def _load_specialty_firms() -> list[dict]:
    rows = _get("recall_specialty_firms", {"select": "firm_name,aliases", "active": "eq.true"})
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
# Manufacturer loading
# ---------------------------------------------------------------------------

def _load_manufacturers(mfr_filter: str | None, limit: int | None) -> list[dict]:
    params = {
        "select": "id,canonical_name,aliases",
        "order": "canonical_name.asc",
    }
    if mfr_filter:
        # simple substring match
        params["canonical_name"] = f"ilike.*{mfr_filter}*"
    if limit:
        params["limit"] = str(limit)
    return _get("recall_manufacturers", params) or []


def _most_recent_open_recall(manufacturer_id: str) -> str | None:
    """Pick the manufacturer's most recent still-open Class I/II recall.
    Falls back to most recent overall if none are open."""
    rows = _get("recalls", {
        "select": "id,status,event_date_initiated",
        "manufacturer_id": f"eq.{manufacturer_id}",
        "order": "event_date_initiated.desc.nullslast",
        "limit": "5",
    }) or []
    if not rows:
        return None
    for r in rows:
        s = (r.get("status") or "").lower()
        if s and "open" in s:
            return r["id"]
    return rows[0]["id"]


# ---------------------------------------------------------------------------
# Case row extraction
# ---------------------------------------------------------------------------

_STATE_FROM_COURT = re.compile(r"^([a-z]{2,4})d?$")  # pae, cand, nyed etc.


def _extract_state_from_court(court_id: str | None) -> str | None:
    if not court_id:
        return None
    # crude mapping: first 2 letters of court slug are usually state ISO
    m = _STATE_FROM_COURT.match(court_id.lower())
    if not m:
        return None
    prefix = m.group(1)
    return prefix[:2].upper() if len(prefix) >= 2 else None


def _extract_plaintiff_firm(hit: dict) -> str | None:
    # CL search hits don't carry attorney data directly; try nested fields that
    # may be present when the search include_attorneys flag is set server-side.
    firms: list[str] = []
    for attorney in (hit.get("attorneys") or []):
        f = attorney.get("firm_name") or attorney.get("firm")
        if f:
            firms.append(f)
    if firms:
        return firms[0]
    # Some hits embed this in case_name suffix, skip silently otherwise.
    return None


def _hit_to_row(
    hit: dict,
    recall_id: str | None,
    specialty_firms: list[dict],
) -> dict | None:
    docket_id = hit.get("docket_id") or hit.get("id")
    if not docket_id:
        return None
    case_name = hit.get("caseName") or hit.get("case_name")
    court_id = hit.get("court_id") or hit.get("court")
    court_name = hit.get("court")
    filed_str = hit.get("dateFiled") or hit.get("date_filed")
    filed_date = None
    if filed_str:
        try:
            filed_date = datetime.fromisoformat(filed_str.replace("Z", "+00:00")).date()
        except Exception:
            try:
                filed_date = datetime.strptime(filed_str[:10], "%Y-%m-%d").date()
            except Exception:
                filed_date = None
    plaintiff_firm = _extract_plaintiff_firm(hit)
    is_specialty = _match_specialty_firm(plaintiff_firm, specialty_firms)
    docket_abs = hit.get("docket_absolute_url") or hit.get("absolute_url") or ""
    docket_url = f"https://www.courtlistener.com{docket_abs}" if docket_abs else None
    # Keep raw_payload small — store key identifiers only, not the whole CL
    # response (which can include large nested recap_documents arrays).
    slim_payload = {
        "docket_id": hit.get("docket_id"),
        "docket_number": hit.get("docketNumber"),
        "case_name_full": hit.get("case_name_full"),
        "pacer_case_id": hit.get("pacer_case_id"),
        "party": hit.get("party") or [],
        "court": hit.get("court"),
        "assigned_to": hit.get("assignedTo"),
    }
    return {
        "recall_id": recall_id,
        "source": "courtlistener",
        "external_id": str(docket_id),
        "case_name": case_name,
        "court_id": court_id if isinstance(court_id, str) else None,
        "court_name": court_name if isinstance(court_name, str) else None,
        "state_code": _extract_state_from_court(court_id if isinstance(court_id, str) else None),
        "case_filed_date": filed_date.isoformat() if filed_date else None,
        "defendants": hit.get("party") or [],
        "plaintiff_firm_name": plaintiff_firm,
        "is_specialty_firm": is_specialty,
        "docket_url": docket_url,
        "raw_payload": slim_payload,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit-mfrs", type=int, default=None,
                    help="Only process first N manufacturers (by name).")
    ap.add_argument("--mfr", type=str, default=None,
                    help="Only process manufacturers with name containing this substring.")
    ap.add_argument("--since", type=str, default=None,
                    help="ISO date; only search cases filed after this date.")
    ap.add_argument("--max-pages", type=int, default=3,
                    help="Max CL search pages per manufacturer (20 hits/page).")
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

    since = (
        datetime.strptime(args.since, "%Y-%m-%d").date()
        if args.since
        else (datetime.now(timezone.utc).date() - timedelta(days=365 * DEFAULT_SINCE_YEARS))
    )

    with PipelineRun("courtlistener_recall_cases", trigger="manual") as run:
        with run.step("fetch_raw") as step:
            mfrs = _load_manufacturers(args.mfr, args.limit_mfrs)
            specialty_firms = _load_specialty_firms()
            logger.info("Loaded %d manufacturers, %d specialty firms", len(mfrs), len(specialty_firms))

            all_hits: list[tuple[dict, str]] = []  # (hit, recall_id)
            mfr_with_hits = 0

            for idx, mfr in enumerate(mfrs, 1):
                name = mfr["canonical_name"]
                aliases = mfr.get("aliases") or []
                query = _build_party_query(name, aliases)
                logger.info("[%d/%d] %s — q=%s", idx, len(mfrs), name, query)

                hits = _search_cl_for_mfr(query, since, max_pages=args.max_pages)
                if not hits:
                    continue

                recall_id = _most_recent_open_recall(mfr["id"])
                if not recall_id:
                    logger.info("  no recall to link for %s; skipping %d hits", name, len(hits))
                    continue

                mfr_with_hits += 1
                for h in hits:
                    all_hits.append((h, recall_id))

            step.set_counts(rows_in=len(mfrs), rows_out=len(all_hits))
            step.set_metadata({
                "manufacturers_queried": len(mfrs),
                "manufacturers_with_hits": mfr_with_hits,
            })

        with run.step("normalize") as step:
            rows: list[dict] = []
            seen_external_ids: set[str] = set()
            for h, recall_id in all_hits:
                row = _hit_to_row(h, recall_id, specialty_firms)
                if not row:
                    continue
                # Dedupe within batch; Postgres upsert can't handle duplicate
                # conflict-target keys in the same statement.
                key = f"{row['source']}::{row['external_id']}"
                if key in seen_external_ids:
                    continue
                seen_external_ids.add(key)
                rows.append(row)
            step.set_counts(rows_in=len(all_hits), rows_out=len(rows))

        with run.step("publish") as step:
            inserted = _bulk_insert(
                "recall_cases",
                rows,
                on_conflict="source,external_id",
                resolution="merge-duplicates",
            )
            step.set_counts(rows_in=len(rows), rows_out=inserted)

    return 0


if __name__ == "__main__":
    sys.exit(main())
