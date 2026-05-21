#!/usr/bin/env python3
"""
openFDA device-recall ingestion for the Recall Watchlist.

Fetches from two openFDA endpoints and joins them:

  device/recall.json      — per-product recall rows (date, description, firm, etc.)
  device/enforcement.json — recall severity classification (Class I / II / III)

The recall endpoint does NOT carry a severity classification field; it only has
``openfda.device_class`` (device regulatory class — a different taxonomy).
Severity lives exclusively on the enforcement endpoint, joined on:

  enforcement.recall_number  =  recall.product_res_number

Recall severity semantics:
  Class I   = most serious — risk of serious injury or death
  Class II  = may cause temporary health problems
  Class III = unlikely to cause adverse health reactions

Rows whose ``product_res_number`` is absent from the enforcement endpoint are
stored as ``recall_class = "Unclassified"``.  This is expected for recent
recalls (~last 30 days) that haven't yet been entered into the enforcement
endpoint.

Usage:
    python -m pipelines.openfda_device_recalls
    python -m pipelines.openfda_device_recalls --dry-run
    python -m pipelines.openfda_device_recalls --since 2024-01-01 --classes "Class I"
    python -m pipelines.openfda_device_recalls --backfill-since 2010-01-01

Env:
    OPENFDA_API_KEY     optional; raises rate limit from 1,000/hr to 240/min
    OPENFDA_BASE_URL    optional, default https://api.fda.gov (AEMS adapter)
    SUPABASE_URL        required
    SUPABASE_SERVICE_KEY required
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone, timedelta

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
from lib.openfda_client import (  # noqa: E402
    DEFAULT_BASE_URL as _OPENFDA_DEFAULT_BASE_URL,
    DEVICE_ENFORCEMENT_PATH,
    DEVICE_RECALL_PATH,
    OpenFDAClient,
)

logger = logging.getLogger(__name__)

# Endpoint URL constants kept for backwards compatibility / greppability.
# The real source of truth is lib/openfda_client.py — base URL is
# configurable via OPENFDA_BASE_URL (AEMS migration adapter) and the
# path constants live in the shared client.
_OPENFDA_BASE_URL = os.environ.get("OPENFDA_BASE_URL") or _OPENFDA_DEFAULT_BASE_URL
OPENFDA_RECALL_BASE = f"{_OPENFDA_BASE_URL.rstrip('/')}{DEVICE_RECALL_PATH}"
OPENFDA_ENFORCEMENT_BASE = f"{_OPENFDA_BASE_URL.rstrip('/')}{DEVICE_ENFORCEMENT_PATH}"
OPENFDA_API_KEY = os.environ.get("OPENFDA_API_KEY", "")
PAGE_SIZE = 100              # openFDA max is 1000 but 100 keeps payloads manageable
MAX_PAGES = 200              # recall endpoint safety cap (~20k records)
ENFORCEMENT_MAX_PAGES = 500  # enforcement has ~38k total records; 500×100 = 50k cap
REQUEST_DELAY = 0.25         # polite pacing between pages
DEFAULT_LOOKBACK_DAYS = 5 * 365
# Recalls rows are wide (JSONB raw_payload + many text columns). Smaller chunks
# reduce the risk of Supabase statement timeouts on upsert. Override via env var
# if 200 still times out (tune down) or proves too conservative (tune up).
RECALLS_UPSERT_CHUNK_SIZE = int(os.environ.get("RECALLS_UPSERT_CHUNK_SIZE", "200"))

# Valid recall severity values — must exactly match CHECK constraint on
# public.recalls.recall_class.
_SEVERITY_CLASSES = frozenset({"Class I", "Class II", "Class III"})


# ---------------------------------------------------------------------------
# Manufacturer normalization
# ---------------------------------------------------------------------------

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
# openFDA pagination helper (kept as a thin wrapper around OpenFDAClient
# so existing call sites and any monkey-patches keep working unchanged).
# ---------------------------------------------------------------------------

def _client() -> OpenFDAClient:
    """Build a client honouring this module's globals.

    Reads ``OPENFDA_API_KEY`` at call time so tests / runs that mutate
    ``os.environ`` after import still see the right value, matching the
    pre-refactor behavior where ``OPENFDA_API_KEY`` was read at module
    load.
    """
    return OpenFDAClient(
        base_url=_OPENFDA_BASE_URL,
        api_key=OPENFDA_API_KEY or None,
    )


def _fetch_page(base_url: str, search: str, skip: int, limit: int) -> tuple[list[dict], int]:
    """Return (results, total_hits) from any openFDA endpoint.

    Thin wrapper preserved for backwards compatibility — callers may
    still pass a full base URL (``https://api.fda.gov/device/recall.json``)
    and this resolves the path portion against ``OpenFDAClient``.
    """
    # Map a full URL back to a path so OpenFDAClient can rebuild against
    # whatever base it's configured for. This keeps the AEMS adapter
    # honest even when callers hand us the full URL.
    path = base_url
    for prefix in (_OPENFDA_DEFAULT_BASE_URL, _OPENFDA_BASE_URL):
        prefix = prefix.rstrip("/")
        if path.startswith(prefix):
            path = path[len(prefix):]
            break
    return _client().fetch_page(path, search, skip=skip, limit=limit)


# ---------------------------------------------------------------------------
# device/recall.json fetch
# ---------------------------------------------------------------------------

def fetch_recalls(since: str) -> list[dict]:
    """Fetch device-recall rows from device/recall.json since `since`.

    Returns all rows without class filtering; severity is applied after
    joining with the enforcement endpoint.
    """
    date_end = datetime.now(timezone.utc).strftime("%Y%m%d")
    date_start = since.replace("-", "")
    search = f"event_date_initiated:[{date_start} TO {date_end}]"
    logger.info("openFDA recall search: %s", search)

    all_results: list[dict] = []
    total = 0
    for page, total in _client().paginate_skip(
        DEVICE_RECALL_PATH,
        search,
        page_size=PAGE_SIZE,
        max_pages=MAX_PAGES,
        request_delay=REQUEST_DELAY,
    ):
        all_results.extend(page)

    logger.info("Fetched %d device-recall rows (total reported=%s)", len(all_results), total)
    return all_results


# ---------------------------------------------------------------------------
# device/enforcement.json severity map
# ---------------------------------------------------------------------------

def fetch_enforcement_classifications(since: str) -> dict[str, str]:
    """Return {recall_number: classification} from device/enforcement.json.

    ``recall_number`` on this endpoint is the join key to ``product_res_number``
    on device/recall.json (1:many — one enforcement record covers one recall
    event, which may span many per-product recall rows).

    ``classification`` is the FDA recall severity class: "Class I", "Class II",
    or "Class III".  Records with unrecognised or missing classification are
    excluded from the map.
    """
    date_end = datetime.now(timezone.utc).strftime("%Y%m%d")
    date_start = since.replace("-", "")
    search = f"recall_initiation_date:[{date_start} TO {date_end}]"
    logger.info("openFDA enforcement search: %s", search)

    enforcement_map: dict[str, str] = {}
    total_seen = 0
    total = 0

    for page, total in _client().paginate_skip(
        DEVICE_ENFORCEMENT_PATH,
        search,
        page_size=PAGE_SIZE,
        max_pages=ENFORCEMENT_MAX_PAGES,
        request_delay=REQUEST_DELAY,
    ):
        for r in page:
            rn = (r.get("recall_number") or "").strip()
            cls = (r.get("classification") or "").strip()
            if rn and cls in _SEVERITY_CLASSES:
                enforcement_map[rn] = cls
        total_seen += len(page)

    logger.info(
        "Fetched %d enforcement records (total reported=%s); "
        "%d unique recall_numbers with valid classification",
        total_seen, total, len(enforcement_map),
    )
    dist = Counter(enforcement_map.values())
    for cls in sorted(dist):
        logger.info("  Enforcement: %s → %d records", cls, dist[cls])

    return enforcement_map


def _severity_for_recall(row: dict, enforcement_map: dict[str, str]) -> str:
    """Return the FDA recall severity class for a device/recall.json row.

    Looks up ``row["product_res_number"]`` in the enforcement_map built from
    device/enforcement.json.  Falls back to "Unclassified" for recalls whose
    ``product_res_number`` is absent from enforcement (typically the most recent
    ~30 days after initiation).

    NOTE: Do NOT use ``openfda.device_class`` here — that is the device
    regulatory class (an orthogonal taxonomy, 1/2/3 for general/special/PMA
    controls) and caused the historical mislabeling this function replaces.
    """
    product_res_number = (row.get("product_res_number") or "").strip()
    return enforcement_map.get(product_res_number, "Unclassified")


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


def ensure_manufacturer(raw_name: str, cache: dict[str, dict]) -> str | None:
    """Upsert a manufacturer and return its id.

    ``cache`` maps slug → {id, canonical_name, known_aliases} and is the
    sole authoritative source for alias state during a run.  Cache hits
    perform zero HTTP calls; only the first encounter per unique slug hits
    Supabase.
    """
    if not raw_name:
        return None
    canonical = canonicalize_manufacturer(raw_name)
    if not canonical:
        return None
    slug = slugify(canonical)

    if slug in cache:
        entry = cache[slug]
        manuf_id = entry["id"]
        if raw_name not in entry["known_aliases"] and raw_name != entry["canonical_name"]:
            new_aliases = sorted(entry["known_aliases"] | {raw_name})
            _update_aliases(manuf_id, new_aliases)
            entry["known_aliases"].add(raw_name)
        return manuf_id

    existing = _find_by_slug("recall_manufacturers", slug)
    if existing:
        entry = {
            "id": existing["id"],
            "canonical_name": existing.get("canonical_name", canonical),
            "known_aliases": set(existing.get("aliases") or []),
        }
        cache[slug] = entry
        if raw_name not in entry["known_aliases"] and raw_name != entry["canonical_name"]:
            new_aliases = sorted(entry["known_aliases"] | {raw_name})
            _update_aliases(existing["id"], new_aliases)
            entry["known_aliases"].add(raw_name)
        return existing["id"]

    if DRY_RUN:
        entry = {
            "id": f"dry-{slug}",
            "canonical_name": canonical,
            "known_aliases": {raw_name} if raw_name != canonical else set(),
        }
        cache[slug] = entry
        return entry["id"]

    url = f"{SUPABASE_URL}/rest/v1/recall_manufacturers"
    payload = {
        "canonical_name": canonical,
        "slug": slug,
        "aliases": [raw_name] if raw_name != canonical else [],
    }
    resp = httpx.post(url, headers={**_headers(want_return=True)}, json=payload, timeout=30)
    resp.raise_for_status()
    new_id = resp.json()[0]["id"]
    entry = {
        "id": new_id,
        "canonical_name": canonical,
        "known_aliases": {raw_name} if raw_name != canonical else set(),
    }
    cache[slug] = entry
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


def build_recall_row(event: dict, manufacturer_id: str | None, enforcement_map: dict[str, str]) -> dict:
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
        "recall_class": _severity_for_recall(event, enforcement_map),
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
    parser.add_argument(
        "--backfill-since", dest="backfill_since",
        help="ISO date YYYY-MM-DD. Use for one-time historical backfill of all existing "
             "rows. Overrides --since. Example: --backfill-since 2010-01-01",
    )
    parser.add_argument(
        "--classes", default="Class I,Class II,Class III",
        help="Comma-separated recall severity classes to ingest. "
             "Default is all three so nothing is silently filtered out.",
    )
    parser.add_argument("--limit", type=int, default=None, help="Cap total events upserted (for testing).")
    parser.add_argument("--dry-run", action="store_true", help="Alias for DRY_RUN=true.")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    since = (
        args.backfill_since
        or args.since
        or (datetime.now(timezone.utc) - timedelta(days=DEFAULT_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    )
    if args.backfill_since:
        logger.info("Backfill mode: lookback extended to %s", since)

    classes = [c.strip() for c in args.classes.split(",") if c.strip()]

    with PipelineRun("openfda_device_recalls", trigger="manual") as run:

        with run.step("fetch") as step:
            events = fetch_recalls(since=since)
            step.set_counts(rows_in=0, rows_out=len(events))

        with run.step("fetch_enforcement") as step:
            enforcement_map = fetch_enforcement_classifications(since=since)

            # Safety: a non-empty recall fetch requires a non-empty enforcement
            # map — otherwise every row would land as "Unclassified", which is
            # almost certainly a sign the enforcement endpoint is down or its
            # date field name has changed.
            if events and not enforcement_map:
                raise RuntimeError(
                    "Fetched recalls but enforcement endpoint returned no "
                    "classifications. Cannot proceed; recall_class would be all "
                    "Unclassified. Investigate enforcement endpoint health."
                )
            step.set_counts(rows_in=0, rows_out=len(enforcement_map))

        with run.step("normalize_manufacturers") as step:
            cache: dict[str, dict] = {}
            total_mfr_lookups = 0
            normalized: list[dict] = []
            wanted = set(classes) if classes else None
            unclassified_count = 0

            for ev in events:
                severity = _severity_for_recall(ev, enforcement_map)
                if severity == "Unclassified":
                    unclassified_count += 1
                # Class filter operates on joined severity, not on openfda.device_class.
                if wanted and severity not in wanted:
                    continue

                recalling_firm = ev.get("recalling_firm") or ""
                if not recalling_firm:
                    manuf_name_field = (ev.get("openfda") or {}).get("manufacturer_name")
                    if isinstance(manuf_name_field, list) and manuf_name_field:
                        recalling_firm = manuf_name_field[0]
                    elif isinstance(manuf_name_field, str):
                        recalling_firm = manuf_name_field
                if recalling_firm:
                    total_mfr_lookups += 1
                manuf_id = ensure_manufacturer(recalling_firm, cache) if recalling_firm else None
                normalized.append(build_recall_row(ev, manuf_id, enforcement_map))

            cache_misses = len(cache)  # each unique slug = exactly one first-fetch
            cache_hits = total_mfr_lookups - cache_misses
            logger.info(
                "normalize_manufacturers cache stats: hits=%d misses=%d total_lookups=%d",
                cache_hits, cache_misses, total_mfr_lookups,
            )

            if unclassified_count:
                logger.info(
                    "%d recall rows had no enforcement match (stored as Unclassified) — "
                    "typically recent recalls not yet entered in enforcement endpoint",
                    unclassified_count,
                )

            # Safety: if we fetched rows but ALL survived class filter as zero output,
            # that indicates a schema mismatch (enforcement join broken or class filter
            # too narrow). Refuse to upsert — a silent zero-row run would leave stale
            # data looking like a success.
            if events and not normalized:
                raise RuntimeError(
                    f"Class filter rejected ALL {len(events)} rows fetched. "
                    f"Classes requested: {classes}. "
                    f"Enforcement map had {len(enforcement_map)} entries. "
                    f"This indicates a schema mismatch. Refusing to upsert empty payload."
                )

            if args.limit:
                normalized = normalized[: args.limit]

            step.set_counts(rows_in=len(events), rows_out=len(normalized))

        with run.step("upsert_recalls") as step:
            sent = _bulk_insert(
                "recalls",
                normalized,
                on_conflict="source,external_id",
                resolution="merge-duplicates",
                chunk_size=RECALLS_UPSERT_CHUNK_SIZE,
            )
            step.set_counts(rows_in=len(normalized), rows_out=sent)

    return 0


if __name__ == "__main__":
    sys.exit(main())
