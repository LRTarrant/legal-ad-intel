#!/usr/bin/env python3
"""
openFDA device-recall ingestion for the Recall Watchlist.

Pulls from https://api.fda.gov/device/recall.json (no API key required; rate
limit is 1,000 req/hr without key, 240/min with). We only ingest Class I + II
recalls initiated within the last 5 years — these are the severity tiers that
actually drive mass-tort activity.

Usage:
    python -m pipelines.openfda_device_recalls
    python -m pipelines.openfda_device_recalls --dry-run
    python -m pipelines.openfda_device_recalls --since 2024-01-01 --classes "Class I"
    python -m pipelines.openfda_device_recalls --limit 500

Env:
    OPENFDA_API_KEY     optional; raises rate limit
    SUPABASE_URL        required
    SUPABASE_SERVICE_KEY required
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta
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

OPENFDA_BASE = "https://api.fda.gov/device/recall.json"
OPENFDA_API_KEY = os.environ.get("OPENFDA_API_KEY", "")
PAGE_SIZE = 100           # openFDA max is 1000 but 100 keeps payloads manageable
MAX_PAGES = 200           # safety cap (~20k recalls)
REQUEST_DELAY = 0.25      # polite pacing
DEFAULT_LOOKBACK_DAYS = 5 * 365

# openFDA returns device_class as string digits: "1", "2", "3". Map to our
# check-constraint labels.
CLASS_MAP = {
    "1":   "Class I",
    "2":   "Class II",
    "3":   "Class III",
    "Class I":   "Class I",
    "Class II":  "Class II",
    "Class III": "Class III",
}

# ---------------------------------------------------------------------------
# Manufacturer normalization
# ---------------------------------------------------------------------------

# Lightweight cleanup: strip legal suffixes + collapse whitespace so two
# variants of the same manufacturer collide on the same canonical key.
_LEGAL_SUFFIX_RE = re.compile(
    r"\b("
    r"inc\.?|incorporated|corp\.?|corporation|co\.?|company|llc|l\.l\.c\.?|"
    r"ltd\.?|limited|plc|gmbh|ag|sa|s\.a\.?|nv|bv|pty|group|holdings|"
    r"medical systems|medical|healthcare|health|systems|of the americas|"
    r"north america|americas|usa|u\.s\.a\.?"
    r")\b",
    re.IGNORECASE,
)


def canonicalize_manufacturer(raw: str) -> str:
    if not raw:
        return ""
    s = raw.strip()
    s = _LEGAL_SUFFIX_RE.sub("", s)
    s = re.sub(r"[,\.]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s.title()


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


# ---------------------------------------------------------------------------
# openFDA fetch
# ---------------------------------------------------------------------------

def _fetch_page(search: str, skip: int, limit: int) -> tuple[list[dict], int]:
    """Return (results, total_hits). total_hits comes from meta.results.total."""
    params = {"search": search, "limit": limit, "skip": skip}
    if OPENFDA_API_KEY:
        params["api_key"] = OPENFDA_API_KEY
    resp = httpx.get(OPENFDA_BASE, params=params, timeout=60)
    if resp.status_code == 404:
        # openFDA returns 404 when the query has zero results. Treat as empty.
        return [], 0
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", []) or [], int(data.get("meta", {}).get("results", {}).get("total", 0))


def _event_class_label(event: dict) -> str:
    """Pull the device class out of openfda.device_class and normalize."""
    dc = (event.get("openfda") or {}).get("device_class")
    if isinstance(dc, list):
        dc = dc[0] if dc else None
    return CLASS_MAP.get(str(dc) if dc is not None else "", "Unclassified")


def fetch_recalls(since: str, classes: list[str]) -> list[dict]:
    """Fetch all device recalls since `since` and filter to requested classes.

    openFDA returns one row per affected product_code; a single recall event
    (res_event_number) can span many rows. We fetch broadly by date, then
    filter class client-side using openfda.device_class.
    """
    date_end = datetime.now(timezone.utc).strftime("%Y%m%d")
    date_start = since.replace("-", "")
    search = f"event_date_initiated:[{date_start} TO {date_end}]"
    logger.info("openFDA search: %s", search)

    all_results: list[dict] = []
    skip = 0
    pages = 0
    total = None
    while pages < MAX_PAGES:
        results, total = _fetch_page(search, skip, PAGE_SIZE)
        if not results:
            break
        all_results.extend(results)
        skip += len(results)
        pages += 1
        if total is not None and skip >= total:
            break
        if len(results) < PAGE_SIZE:
            break
        time.sleep(REQUEST_DELAY)

    logger.info("Fetched %d device-recall rows from openFDA (total reported=%s)", len(all_results), total)
    if classes:
        wanted = set(classes)
        filtered = [r for r in all_results if _event_class_label(r) in wanted]
        logger.info("After class filter (%s): %d rows", wanted, len(filtered))
        return filtered
    return all_results


# ---------------------------------------------------------------------------
# Supabase upserts
# ---------------------------------------------------------------------------

def _find_by_slug(table: str, slug: str) -> dict | None:
    rows = _get(table, {"slug": f"eq.{slug}", "select": "id,slug,canonical_name,aliases"})
    return rows[0] if rows else None


def _update_aliases(manuf_id: str, aliases: list[str]) -> None:
    if not aliases:
        return
    url = f"{SUPABASE_URL}/rest/v1/recall_manufacturers?id=eq.{manuf_id}"
    resp = httpx.patch(url, headers=_headers(), json={"aliases": aliases}, timeout=30)
    resp.raise_for_status()


def ensure_manufacturer(raw_name: str, cache: dict[str, str]) -> str | None:
    """Upsert a manufacturer and return its id. Uses an in-memory cache to
    avoid hammering the API during a single run."""
    if not raw_name:
        return None
    canonical = canonicalize_manufacturer(raw_name)
    if not canonical:
        return None
    slug = slugify(canonical)
    if slug in cache:
        manuf_id = cache[slug]
        # Merge new alias in if not present.
        existing = _find_by_slug("recall_manufacturers", slug)
        if existing and raw_name not in (existing.get("aliases") or []) and raw_name != existing.get("canonical_name"):
            new_aliases = list(set((existing.get("aliases") or []) + [raw_name]))
            _update_aliases(manuf_id, new_aliases)
        return manuf_id

    existing = _find_by_slug("recall_manufacturers", slug)
    if existing:
        cache[slug] = existing["id"]
        if raw_name not in (existing.get("aliases") or []) and raw_name != existing.get("canonical_name"):
            new_aliases = list(set((existing.get("aliases") or []) + [raw_name]))
            _update_aliases(existing["id"], new_aliases)
        return existing["id"]

    # Insert new.
    if DRY_RUN:
        cache[slug] = f"dry-{slug}"
        return cache[slug]
    url = f"{SUPABASE_URL}/rest/v1/recall_manufacturers"
    payload = {
        "canonical_name": canonical,
        "slug": slug,
        "aliases": [raw_name] if raw_name != canonical else [],
    }
    resp = httpx.post(url, headers={**_headers(want_return=True)}, json=payload, timeout=30)
    resp.raise_for_status()
    new_id = resp.json()[0]["id"]
    cache[slug] = new_id
    return new_id


def parse_date(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = str(raw).strip()
    for fmt in ("%Y%m%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def build_recall_row(event: dict, manufacturer_id: str | None) -> dict:
    openfda = event.get("openfda") or {}
    k_numbers = event.get("k_numbers") or openfda.get("k_number") or []
    if isinstance(k_numbers, str):
        k_numbers = [k_numbers]

    # external_id: use product_res_number (the per-product Z-number) since
    # openFDA emits one row per affected product; res_event_number alone
    # collides across multi-product recalls.
    external_id = (
        event.get("product_res_number")
        or event.get("cfres_id")
        or str(event.get("res_event_number"))
    )

    product_code = event.get("product_code")
    if isinstance(product_code, list):
        product_code = product_code[0] if product_code else None

    return {
        "source": "openfda_device",
        "external_id": str(external_id),
        "manufacturer_id": manufacturer_id,
        "product_description": (event.get("product_description") or "")[:2000] or None,
        "product_code": product_code,
        "recall_class": _event_class_label(event),
        "reason_for_recall": (event.get("reason_for_recall") or "")[:2000] or None,
        "event_date_initiated": parse_date(event.get("event_date_initiated")),
        "event_date_posted": parse_date(event.get("event_date_posted")),
        "event_date_terminated": parse_date(event.get("event_date_terminated")),
        "status": event.get("recall_status") or event.get("status"),
        "distribution_pattern": (event.get("distribution_pattern") or "")[:2000] or None,
        "k_numbers": k_numbers if isinstance(k_numbers, list) else [],
        "root_cause_description": event.get("root_cause_description"),
        "raw_payload": event,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--since", help="ISO date YYYY-MM-DD. Default = 5 years ago.")
    parser.add_argument("--classes", default="Class I,Class II", help="Comma-separated classes.")
    parser.add_argument("--limit", type=int, default=None, help="Cap total events inserted (for testing).")
    parser.add_argument("--dry-run", action="store_true", help="Alias for DRY_RUN=true.")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    since = args.since or (datetime.now(timezone.utc) - timedelta(days=DEFAULT_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    classes = [c.strip() for c in args.classes.split(",") if c.strip()]

    with PipelineRun("openfda_device_recalls", trigger="manual") as run:
        with run.step("fetch") as step:
            events = fetch_recalls(since=since, classes=classes)
            if args.limit:
                events = events[: args.limit]
            step.set_counts(rows_in=0, rows_out=len(events))

        with run.step("normalize_manufacturers") as step:
            cache: dict[str, str] = {}
            normalized: list[dict] = []
            for ev in events:
                recalling_firm = ev.get("recalling_firm") or ""
                if not recalling_firm:
                    manuf_name_field = (ev.get("openfda") or {}).get("manufacturer_name")
                    if isinstance(manuf_name_field, list) and manuf_name_field:
                        recalling_firm = manuf_name_field[0]
                    elif isinstance(manuf_name_field, str):
                        recalling_firm = manuf_name_field
                manuf_id = ensure_manufacturer(recalling_firm, cache) if recalling_firm else None
                normalized.append(build_recall_row(ev, manuf_id))
            step.set_counts(rows_in=len(events), rows_out=len(normalized))

        with run.step("upsert_recalls") as step:
            sent = _bulk_insert(
                "recalls",
                normalized,
                on_conflict="source,external_id",
                resolution="merge-duplicates",
            )
            step.set_counts(rows_in=len(normalized), rows_out=sent)

    return 0


if __name__ == "__main__":
    sys.exit(main())
