#!/usr/bin/env python3
"""
CPSC SaferProducts.gov Recalls ingest — Phase 1 of the CPSC -> FAERS -> MAUDE arc.

Endpoint: https://www.saferproducts.gov/RestWebServices/Recall?format=json
  * No auth required
  * Weekly upstream refresh; ~10K records cumulative, ~300/year new
  * Date filtering via RecallDateStart/End and LastPublishDateStart/End

Two ingest modes:

  Backfill (--backfill-since YYYY-MM-DD or --year YYYY):
    Pulls the full recall set within the requested window. Used for the
    initial 5-year backfill and for spot historical pulls (e.g. Rock 'n
    Play 2019, IKEA Malm 2016 for tort-signal backtest).

  Steady-state (no args, default 60-day rolling window):
    Filters by LastPublishDateStart so re-announced recalls surface even
    when their RecallDate falls outside the rolling window. The Fisher-
    Price Rock 'n Play 2023 re-announcement of the 2019 recall is the
    canonical case this handles (see docs/data-sources/cpsc.md §6).

Re-announcement detection: recall_id is the canonical upsert key
(cpsc_recall_id INTEGER UNIQUE). When LastPublishDate advances on an
existing recall, the publish step deletes all child rows for that recall
and re-inserts from the new payload so children stay in sync.

Manufacturer normalization: free-text manufacturer names are stripped of
legal suffixes, lowercased, and looked up in cpsc_manufacturer_aliases
(natural-key alias table populated by curators). Misses fall through to
recall_manufacturers.canonical_name. Unmatched rows preserve raw_name with
manufacturer_id = NULL; the pipeline NEVER auto-creates recall_manufacturers
rows. Misses surface in step metadata for manual curation.

URL filter: only records whose URL matches /Recalls/ are ingested.
Anti-fraud press releases on /Newsroom/News-Releases/ are excluded
(cpsc.md §6 "Other quality gotchas"). Skip count is logged.

Endpoint URL is read from CPSC_RECALLS_BASE so a CPSC -> HHS reorganization
(pending Congress as of May 2026) can be handled with an env var flip.

Usage:
    python -m pipelines.cpsc_recalls --dry-run
    python -m pipelines.cpsc_recalls                       # 60-day rolling
    python -m pipelines.cpsc_recalls --backfill-since 2021-01-01
    python -m pipelines.cpsc_recalls --year 2019

Env:
    SUPABASE_URL                required
    SUPABASE_SERVICE_KEY        required
    CPSC_RECALLS_BASE           optional; defaults to saferproducts.gov endpoint
    DRY_RUN                     optional; "true" skips DB writes
    PIPELINE_TRIGGER            scheduled | manual (workflow sets this)
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (  # noqa: E402
    DRY_RUN,
    PipelineRun,
    _bulk_insert,
    _delete,
    _get,
    _headers,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Endpoint adapter — flip via env if CPSC migrates to HHS (pending Congress).
CPSC_RECALLS_BASE = os.environ.get(
    "CPSC_RECALLS_BASE",
    "https://www.saferproducts.gov/RestWebServices/Recall",
)

# Inclusion URL pattern. Recall press releases live under /Recalls/YYYY/;
# anti-fraud and general newsroom releases live under /Newsroom/ and are
# co-mingled with real recalls per cpsc.md §6. Filter to /Recalls/ only.
RECALL_URL_INCLUSION_PATTERN = re.compile(r"/Recalls/", re.IGNORECASE)

# If the URL filter rejects more than this fraction of fetched records,
# log a WARNING and surface the count in step metadata — this is the
# tripwire for the anti-fraud sweep starting to swamp the real recall feed.
URL_FILTER_WARN_THRESHOLD = 0.50

# Default steady-state rolling window. Filters on LastPublishDate so
# re-announcements surface even when RecallDate is outside the window.
DEFAULT_ROLLING_WINDOW_DAYS = 60

# Default backfill horizon when --backfill-since is not provided and no
# rolling-window override is set. 5 years matches cpsc.md §8 Phase 1.
DEFAULT_BACKFILL_YEARS = 5

REQUEST_TIMEOUT = 90  # CPSC API can be slow on cold cache for full pulls
REQUEST_RETRY_DELAYS = (5, 15, 45)  # exponential backoff on 5xx / network

# Parent upsert chunk — wider than FDA recalls because cpsc_recalls rows are
# smaller (no thermometer denormalization columns). Tune via env if needed.
CPSC_UPSERT_CHUNK_SIZE = int(os.environ.get("CPSC_UPSERT_CHUNK_SIZE", "500"))

# ---------------------------------------------------------------------------
# Severity tier classification (cpsc.md §4)
# ---------------------------------------------------------------------------

DEATH_LANGUAGE_RE = re.compile(
    r"\b(died|death|deaths|fatal|fatality|fatalities|killed|deceased|infant deaths?|child deaths?)\b",
    re.IGNORECASE,
)
SERIOUS_INJURY_TITLE_RE = re.compile(
    r"\b(serious\s+injury|serious\s+injuries|injury\s+or\s+death)\b",
    re.IGNORECASE,
)

# Tier A hazards (life-threatening): exact-match against CPSC Hazard.Name
# values, case-insensitive. Comparison happens via lowercase set lookup.
TIER_A_HAZARDS = frozenset({
    "asphyxiation hazard",
    "asphyxiation",
    "strangulation hazard",
    "strangulation",
    "drowning hazard",
    "drowning",
    "suffocation hazard",
    "suffocation",
    "battery ingestion hazard",
    "battery ingestion",
})

# Tier B hazards (high-magnitude when paired with unit count): same exact
# match treatment as TIER_A_HAZARDS.
TIER_B_HAZARDS = frozenset({
    "fire hazard",
    "fire",
    "burn hazard",
    "burn",
    "entrapment hazard",
    "entrapment",
    "fall hazard",
    "fall",
    "laceration hazard",
    "laceration",
    "shock hazard",
    "electrical shock hazard",
})

TIER_B_UNITS_THRESHOLD = 10_000

# ---------------------------------------------------------------------------
# Manufacturer normalization
# ---------------------------------------------------------------------------

_LEGAL_SUFFIX_RE = re.compile(
    r"\b("
    r"inc\.?|incorporated|corp\.?|corporation|co\.?|company|llc|l\.l\.c\.?|"
    r"ltd\.?|limited|plc|gmbh|ag|sa|s\.a\.?|nv|bv|pty|group|holdings|"
    r"d/b/a|dba|"
    r"medical systems|medical|healthcare|health|systems|of the americas|"
    r"north america|americas|usa|u\.s\.a\.?"
    r")\b",
    re.IGNORECASE,
)

_PUNCT_RE = re.compile(r"[,;&./\\()\[\]]")
_WS_RE = re.compile(r"\s+")


def normalize_manufacturer_name(raw: str) -> str:
    """Normalize a CPSC free-text manufacturer name to its alias-table form.

    Lowercase, strip legal suffixes, strip punctuation, collapse whitespace,
    trim. Output is exactly the form stored in cpsc_manufacturer_aliases
    (which has a CHECK constraint enforcing canonical form).
    """
    if not raw:
        return ""
    s = raw.strip()
    s = _PUNCT_RE.sub(" ", s)
    s = _LEGAL_SUFFIX_RE.sub("", s)
    s = _WS_RE.sub(" ", s).strip().lower()
    return s


# ---------------------------------------------------------------------------
# Units-recalled parser
# ---------------------------------------------------------------------------

_UNITS_RE = re.compile(
    r"([\d,]+(?:\.\d+)?)\s*(thousand|million|billion)?",
    re.IGNORECASE,
)
_MULTIPLIERS = {None: 1, "thousand": 1_000, "million": 1_000_000, "billion": 1_000_000_000}


def _coerce_int(value: Any) -> int | None:
    """Coerce a loosely-typed CPSC integer field to ``int | None``.

    CPSC's API occasionally serializes integer fields (CategoryID, HazardTypeID)
    as empty strings instead of omitting them. Postgres then rejects the empty
    string with 22P02 "invalid input syntax for type integer". Normalize at the
    parse layer so every child-table insert path stays clean.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        try:
            return int(value)
        except (OverflowError, ValueError):
            return None
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        try:
            return int(s)
        except ValueError:
            try:
                return int(float(s))
            except (ValueError, OverflowError):
                return None
    return None


def parse_units_recalled(raw: str | None) -> int | None:
    """Best-effort parse of a CPSC NumberOfUnits string.

    Examples:
      "About 34,000"                       -> 34000
      "Approximately 250"                  -> 250
      "About 8.2 million"                  -> 8200000
      "About 34,000 (in addition to 9,450 in Canada)"
                                           -> 34000  (first match wins)
      ""                                   -> None
    """
    if not raw:
        return None
    m = _UNITS_RE.search(raw)
    if not m:
        return None
    num_str, suffix = m.group(1), m.group(2)
    try:
        n = float(num_str.replace(",", ""))
    except ValueError:
        return None
    suffix_key = suffix.lower() if suffix else None
    multiplier = _MULTIPLIERS.get(suffix_key, 1)
    try:
        # round() to avoid float-precision underflow (e.g. 8.2 * 1_000_000
        # → 8199999.999... → int(...) = 8199999 without rounding).
        return int(round(n * multiplier))
    except (OverflowError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Injury / death count parsing from CPSC Injuries[] free text
# ---------------------------------------------------------------------------

_DEATH_COUNT_RE = re.compile(
    r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+"
    # Optional descriptors: "reported", "infant", "child", "children",
    # "adult", "user", in any order/repetition before the death word.
    r"(?:(?:reported|infant|child|children|adult|user)\s+){0,3}"
    r"(?:death|deaths|fatality|fatalities|died|dies|killed)\b",
    re.IGNORECASE,
)
_INJURY_COUNT_RE = re.compile(
    r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+"
    r"(?:reports?\s+of\s+)?(?:injury|injuries|injured)\b",
    re.IGNORECASE,
)
_WORD_TO_INT = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


def _parse_count_word(s: str) -> int | None:
    try:
        return int(s.replace(",", ""))
    except ValueError:
        return _WORD_TO_INT.get(s.lower())


def parse_death_count(injuries_text: str) -> int | None:
    """Sum the largest count mentioned across all death-language matches."""
    if not injuries_text:
        return None
    counts: list[int] = []
    for m in _DEATH_COUNT_RE.finditer(injuries_text):
        n = _parse_count_word(m.group(1))
        if n is not None:
            counts.append(n)
    return max(counts) if counts else None


def parse_injury_count(injuries_text: str) -> int | None:
    if not injuries_text:
        return None
    counts: list[int] = []
    for m in _INJURY_COUNT_RE.finditer(injuries_text):
        n = _parse_count_word(m.group(1))
        if n is not None:
            counts.append(n)
    return max(counts) if counts else None


# ---------------------------------------------------------------------------
# Severity tier
# ---------------------------------------------------------------------------

def compute_severity_tier(
    title: str,
    injuries_text: str,
    hazards: list[str],
    units_int: int | None,
    death_count: int | None,
) -> str:
    """Return severity tier 'A'..'D' per cpsc.md §4.

    Tier A: death_count > 0, OR any hazard in TIER_A_HAZARDS,
            OR injuries_text mentions death (a real reported death, not the
            "risk of death" boilerplate that often appears in titles).
    Tier B: title matches "serious injury or death" language AND units > 10k,
            OR any hazard in TIER_B_HAZARDS AND units > 10k.
    Tier C: any injuries_text present.
    Tier D: otherwise (most defect-only / no-injury recalls).

    Note on title vs injuries scope: CPSC titles frequently contain "risk of
    death" or "risk of serious injury or death" as a hazard descriptor —
    that's not a reported death, so DEATH_LANGUAGE_RE only triggers Tier A
    when found in injuries_text. Real reported deaths in the title (e.g.
    Peloton's "After One Child Died") flow through parse_death_count
    upstream, which sets death_count > 0.
    """
    hazard_set = {h.strip().lower() for h in hazards if h}

    # Tier A
    if death_count and death_count > 0:
        return "A"
    if hazard_set & TIER_A_HAZARDS:
        return "A"
    if injuries_text and DEATH_LANGUAGE_RE.search(injuries_text):
        return "A"

    # Tier B
    haystacks = " ".join(filter(None, [title, injuries_text]))
    if SERIOUS_INJURY_TITLE_RE.search(haystacks) and (units_int or 0) > TIER_B_UNITS_THRESHOLD:
        return "B"
    if (hazard_set & TIER_B_HAZARDS) and (units_int or 0) > TIER_B_UNITS_THRESHOLD:
        return "B"

    # Tier C — any injury report at all
    if injuries_text and injuries_text.strip():
        return "C"

    return "D"


# ---------------------------------------------------------------------------
# HTTP fetch
# ---------------------------------------------------------------------------

def _fetch_recalls(params: dict[str, str]) -> list[dict]:
    """GET CPSC Recalls API with retry on 5xx and transient network errors.

    Returns the raw JSON list. CPSC returns an array at the top level.
    """
    params = {**params, "format": "json"}
    last_exc: Exception | None = None
    for attempt in range(len(REQUEST_RETRY_DELAYS) + 1):
        if attempt > 0:
            delay = REQUEST_RETRY_DELAYS[attempt - 1]
            logger.warning(
                "Retrying CPSC fetch (attempt %d/%d) in ~%ds",
                attempt, len(REQUEST_RETRY_DELAYS), delay,
            )
            time.sleep(delay)
        try:
            resp = httpx.get(CPSC_RECALLS_BASE, params=params, timeout=REQUEST_TIMEOUT)
            if resp.status_code >= 500:
                last_exc = httpx.HTTPStatusError(
                    f"CPSC {resp.status_code}", request=resp.request, response=resp,
                )
                continue
            resp.raise_for_status()
            data = resp.json()
            if not isinstance(data, list):
                raise ValueError(
                    f"CPSC returned non-list payload: {type(data).__name__}"
                )
            return data
        except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.NetworkError) as exc:
            last_exc = exc
    assert last_exc is not None
    raise last_exc


def fetch_window(
    *,
    date_start: date | None = None,
    date_end: date | None = None,
    by_field: str = "LastPublishDate",
) -> list[dict]:
    """Fetch recalls within an inclusive date window.

    by_field is either "RecallDate" (for backfill / spot pulls) or
    "LastPublishDate" (default, for steady-state delta to catch
    re-announcements).
    """
    params: dict[str, str] = {}
    if date_start:
        params[f"{by_field}Start"] = date_start.isoformat()
    if date_end:
        params[f"{by_field}End"] = date_end.isoformat()
    logger.info(
        "Fetching CPSC recalls: %s..%s by %s",
        date_start, date_end, by_field,
    )
    return _fetch_recalls(params)


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

def _safe_date(raw: str | None) -> str | None:
    """Parse CPSC ISO-ish datetime to YYYY-MM-DD. None on failure."""
    if not raw:
        return None
    s = raw.strip()
    # CPSC returns e.g. "2019-04-12T00:00:00" — slice to date.
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date().isoformat()
    except (ValueError, TypeError):
        try:
            return datetime.strptime(s[:10], "%Y-%m-%d").date().isoformat()
        except ValueError:
            return None


def _collect_injuries_text(raw: dict) -> str:
    """Flatten Injuries[] free-text into a single string for parsing."""
    items = raw.get("Injuries") or []
    parts = []
    for item in items:
        name = (item or {}).get("Name") or ""
        if name:
            parts.append(name)
    return " ".join(parts)


def _pick_primary_manufacturer_role(raw: dict) -> tuple[list[dict], str]:
    """Return (list_of_company_dicts, role) for normalization.

    Manufacturers[] is the canonical source. Falls back to Importers[],
    Distributors[], then Retailers[] when empty (cpsc.md §3:
    "Empty Manufacturers[] common in older recalls and Amazon-listed
    products. Backstop via Importers[]/Distributors[].").
    """
    for role, key in (
        ("manufacturer", "Manufacturers"),
        ("importer", "Importers"),
        ("distributor", "Distributors"),
        ("retailer", "Retailers"),
    ):
        rows = raw.get(key) or []
        if rows:
            return rows, role
    return [], "manufacturer"


def normalize_recall(
    raw: dict,
    *,
    alias_map: dict[str, str],
    canonical_map: dict[str, str],
) -> dict | None:
    """Project a raw CPSC payload into the table-row dicts we'll insert.

    Returns a dict with keys: parent, products, manufacturers, hazards,
    retailers, remedies, images, unmatched_manufacturers.

    Returns None if the record should be skipped (e.g. URL filter rejection,
    missing RecallID or RecallDate).
    """
    rid = raw.get("RecallID")
    if not isinstance(rid, int):
        return None
    rdate = _safe_date(raw.get("RecallDate"))
    if not rdate:
        return None

    url = raw.get("URL") or ""
    if not RECALL_URL_INCLUSION_PATTERN.search(url):
        return None

    title = raw.get("Title") or ""
    injuries_text = _collect_injuries_text(raw)
    hazards = [(h or {}).get("Name", "") for h in (raw.get("Hazards") or [])]
    units_text = ""
    products = raw.get("Products") or []
    # Take the first non-empty NumberOfUnits as canonical for the recall.
    for p in products:
        nu = (p or {}).get("NumberOfUnits") or ""
        if nu:
            units_text = nu
            break
    units_int = parse_units_recalled(units_text)
    # Parse death/injury counts across both title and injuries text. Titles
    # sometimes carry the only specific death count (Peloton: "After One
    # Child Died and More Than 70 Incidents Reported").
    count_haystack = " ".join(filter(None, [title, injuries_text]))
    death_count = parse_death_count(count_haystack)
    injury_count = parse_injury_count(count_haystack)
    severity_tier = compute_severity_tier(
        title=title,
        injuries_text=injuries_text,
        hazards=hazards,
        units_int=units_int,
        death_count=death_count,
    )

    parent = {
        "source": "cpsc_recall",
        "cpsc_recall_id": rid,
        "recall_number": str(raw.get("RecallNumber") or rid),
        "recall_date": rdate,
        "last_publish_date": _safe_date(raw.get("LastPublishDate")),
        "title": title,
        "description": raw.get("Description") or None,
        "consumer_contact": raw.get("ConsumerContact") or None,
        "cpsc_url": url or None,
        "severity_tier": severity_tier,
        "death_count": death_count,
        "injury_count": injury_count,
        "units_recalled_text": units_text or None,
        "units_recalled_int": units_int,
        "is_warning_only": False,
        "raw_json": raw,
    }

    products_rows = [
        {
            "category_id": _coerce_int((p or {}).get("CategoryID")),
            "name": (p or {}).get("Name") or None,
            "type": (p or {}).get("Type") or None,
            "model": (p or {}).get("Model") or None,
            "description": (p or {}).get("Description") or None,
            "units_text": (p or {}).get("NumberOfUnits") or None,
        }
        for p in products
    ]

    # Manufacturer collection: primary list (Manufacturers[] with backstop
    # cascade) plus any non-primary roles for completeness.
    primary_list, primary_role = _pick_primary_manufacturer_role(raw)
    mfr_rows: list[dict] = []
    unmatched: list[str] = []
    countries = [
        (c or {}).get("Country") or ""
        for c in (raw.get("ManufacturerCountries") or [])
    ]
    country = countries[0] if countries else None

    for company in primary_list:
        raw_name = (company or {}).get("Name") or ""
        if not raw_name:
            continue
        normalized = normalize_manufacturer_name(raw_name)
        mfr_id = alias_map.get(normalized) or canonical_map.get(normalized)
        if not mfr_id:
            unmatched.append(raw_name)
        mfr_rows.append({
            "manufacturer_id": mfr_id,
            "raw_name": raw_name,
            "country": country,
            "role": primary_role,
        })

    # Also surface importers / distributors / retailers when distinct from
    # primary so the cross-role join data is preserved for analysts.
    seen_keys = {(r["raw_name"], r["role"]) for r in mfr_rows}
    for role, key in (
        ("importer", "Importers"),
        ("distributor", "Distributors"),
        ("retailer", "Retailers"),
    ):
        if role == primary_role:
            continue
        for company in (raw.get(key) or []):
            raw_name = (company or {}).get("Name") or ""
            if not raw_name or (raw_name, role) in seen_keys:
                continue
            seen_keys.add((raw_name, role))
            normalized = normalize_manufacturer_name(raw_name)
            mfr_id = alias_map.get(normalized) or canonical_map.get(normalized)
            mfr_rows.append({
                "manufacturer_id": mfr_id,
                "raw_name": raw_name,
                "country": None,
                "role": role,
            })

    hazards_rows = [
        {
            "hazard_type_id": _coerce_int((h or {}).get("HazardTypeID")),
            "name": (h or {}).get("Name") or "",
        }
        for h in (raw.get("Hazards") or [])
        if (h or {}).get("Name")
    ]
    retailers_rows = [
        {
            "raw_name": (r or {}).get("Name") or "",
            "raw_company_id": str((r or {}).get("CompanyID") or "") or None,
        }
        for r in (raw.get("Retailers") or [])
        if (r or {}).get("Name")
    ]
    remedies_rows = [
        {"name": (r or {}).get("Name") or ""}
        for r in (raw.get("Remedies") or [])
        if (r or {}).get("Name")
    ]
    images_rows = [
        {"url": (i or {}).get("URL") or ""}
        for i in (raw.get("Images") or [])
        if (i or {}).get("URL")
    ]

    return {
        "parent": parent,
        "products": products_rows,
        "manufacturers": mfr_rows,
        "hazards": hazards_rows,
        "retailers": retailers_rows,
        "remedies": remedies_rows,
        "images": images_rows,
        "unmatched_manufacturers": unmatched,
    }


# ---------------------------------------------------------------------------
# Alias / canonical name lookup
# ---------------------------------------------------------------------------

def load_alias_map() -> dict[str, str]:
    """Load cpsc_manufacturer_aliases -> {normalized_alias: manufacturer_id_uuid}."""
    rows = _get("cpsc_manufacturer_aliases", {
        "select": "alias_text,manufacturer_id",
        "limit": "100000",
    })
    return {r["alias_text"]: r["manufacturer_id"] for r in rows}


def load_canonical_map() -> dict[str, str]:
    """Load recall_manufacturers canonical names -> {normalized_canonical: id}.

    Provides a second-tier match when an alias hasn't been curated yet but
    the canonical name happens to match the normalized form.
    """
    rows = _get("recall_manufacturers", {
        "select": "id,canonical_name,aliases",
        "limit": "10000",
    })
    out: dict[str, str] = {}
    for r in rows:
        names = [r.get("canonical_name") or ""] + list(r.get("aliases") or [])
        for n in names:
            normalized = normalize_manufacturer_name(n)
            if normalized:
                out.setdefault(normalized, r["id"])
    return out


# ---------------------------------------------------------------------------
# Pre-/post-upsert state lookup
# ---------------------------------------------------------------------------

def fetch_existing_state(cpsc_recall_ids: list[int]) -> dict[int, tuple[str, str | None]]:
    """Return {cpsc_recall_id: (uuid_id, last_publish_date or None)} for the
    subset that already exist in cpsc_recalls. Done in chunks to avoid
    PostgREST URL length limits.
    """
    if not cpsc_recall_ids:
        return {}
    out: dict[int, tuple[str, str | None]] = {}
    for i in range(0, len(cpsc_recall_ids), 200):
        chunk = cpsc_recall_ids[i:i + 200]
        param_vals = ",".join(str(x) for x in chunk)
        rows = _get("cpsc_recalls", {
            "select": "id,cpsc_recall_id,last_publish_date",
            "cpsc_recall_id": f"in.({param_vals})",
        })
        for r in rows:
            out[r["cpsc_recall_id"]] = (r["id"], r.get("last_publish_date"))
    return out


# ---------------------------------------------------------------------------
# Child refresh
# ---------------------------------------------------------------------------

CHILD_TABLES: tuple[str, ...] = (
    "cpsc_recall_products",
    "cpsc_recall_manufacturers",
    "cpsc_recall_hazards",
    "cpsc_recall_retailers",
    "cpsc_recall_remedies",
    "cpsc_recall_images",
)


def delete_children_for(recall_uuids: list[str]) -> None:
    """Delete all child rows for the given parent uuids, one table at a time.

    Chunked to avoid PostgREST URL length limits.
    """
    if not recall_uuids:
        return
    for table in CHILD_TABLES:
        for i in range(0, len(recall_uuids), 100):
            chunk = recall_uuids[i:i + 100]
            param_vals = ",".join(chunk)
            _delete(table, {"recall_id": f"in.({param_vals})"})


# ---------------------------------------------------------------------------
# Argparse / window resolution
# ---------------------------------------------------------------------------

def resolve_window(
    *, backfill_since: str | None, year: int | None, rolling_days: int,
) -> tuple[date | None, date, str]:
    """Return (start, end, by_field) given CLI args.

    Precedence:
      --year YYYY              -> Jan 1..Dec 31 of that year, by RecallDate
      --backfill-since YYYY-..  -> since..today, by RecallDate
      otherwise                -> (today - rolling_days)..today, by LastPublishDate
    """
    today = datetime.now(timezone.utc).date()
    if year is not None:
        return date(year, 1, 1), date(year, 12, 31), "RecallDate"
    if backfill_since:
        try:
            since = datetime.strptime(backfill_since, "%Y-%m-%d").date()
        except ValueError as e:
            raise SystemExit(f"--backfill-since must be YYYY-MM-DD: {e}")
        return since, today, "RecallDate"
    return today - timedelta(days=rolling_days), today, "LastPublishDate"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true",
                    help="Set DRY_RUN=true for this process (no DB writes).")
    ap.add_argument("--backfill-since", default=None, metavar="YYYY-MM-DD",
                    help="Backfill from this date (RecallDateStart). "
                         "Overrides the default rolling window.")
    ap.add_argument("--year", type=int, default=None,
                    help="Backfill a single calendar year by RecallDate. "
                         "Useful for historical spot pulls.")
    ap.add_argument("--rolling-days", type=int, default=DEFAULT_ROLLING_WINDOW_DAYS,
                    help=f"Steady-state rolling window in days (default "
                         f"{DEFAULT_ROLLING_WINDOW_DAYS}).")
    args = ap.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        # Re-import the flag binding so PipelineRun sees the new value.
        import importlib
        import lib.pipeline as _p
        importlib.reload(_p)

    # Default backfill: if no flags AND PIPELINE_TRIGGER!=scheduled, leave as
    # rolling; we keep the "5-year default backfill" as a documented, opt-in
    # behavior via --backfill-since rather than something the cron triggers
    # automatically.
    start, end, by_field = resolve_window(
        backfill_since=args.backfill_since,
        year=args.year,
        rolling_days=args.rolling_days,
    )

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")
    with PipelineRun(
        "cpsc_recalls",
        trigger=trigger,
        metadata={
            "window_start": start.isoformat() if start else None,
            "window_end": end.isoformat(),
            "window_field": by_field,
            "endpoint": CPSC_RECALLS_BASE,
        },
    ) as run:
        # Step 1: fetch raw
        with run.step("fetch_raw") as step:
            raw_records = fetch_window(date_start=start, date_end=end, by_field=by_field)
            step.set_counts(rows_in=0, rows_out=len(raw_records))

        # Step 2: normalize
        with run.step("normalize") as step:
            alias_map = load_alias_map() if not DRY_RUN else {}
            canonical_map = load_canonical_map() if not DRY_RUN else {}
            step.set_metadata({
                "alias_map_size": len(alias_map),
                "canonical_map_size": len(canonical_map),
            })

            normalized: list[dict] = []
            url_filter_skipped = 0
            id_skipped = 0
            unmatched_counter: Counter[str] = Counter()
            for raw in raw_records:
                norm = normalize_recall(
                    raw, alias_map=alias_map, canonical_map=canonical_map,
                )
                if norm is None:
                    url = raw.get("URL") or ""
                    if url and not RECALL_URL_INCLUSION_PATTERN.search(url):
                        url_filter_skipped += 1
                    else:
                        id_skipped += 1
                    continue
                normalized.append(norm)
                for name in norm["unmatched_manufacturers"]:
                    unmatched_counter[name] += 1

            total_seen = len(raw_records)
            filter_fraction = (url_filter_skipped / total_seen) if total_seen else 0.0
            if filter_fraction > URL_FILTER_WARN_THRESHOLD:
                logger.warning(
                    "URL filter rejected %.0f%% of records (%d/%d) — anti-fraud "
                    "sweep may be swamping the feed; investigate",
                    filter_fraction * 100, url_filter_skipped, total_seen,
                )

            step.set_metadata({
                "url_filter_skipped": url_filter_skipped,
                "id_or_date_skipped": id_skipped,
                "url_filter_fraction": round(filter_fraction, 4),
                "unmatched_manufacturer_count": len(unmatched_counter),
                "top_unmatched_manufacturers": unmatched_counter.most_common(20),
            })
            step.set_counts(rows_in=total_seen, rows_out=len(normalized))

        # Step 3: publish
        with run.step("publish") as step:
            if not normalized:
                step.set_counts(rows_in=0, rows_out=0)
                step.set_metadata({"reason": "no_normalized_records"})
                return 0

            cpsc_ids = [n["parent"]["cpsc_recall_id"] for n in normalized]
            pre_state = fetch_existing_state(cpsc_ids) if not DRY_RUN else {}

            # Decide which recalls need a child refresh: brand-new OR
            # last_publish_date advanced. Compare ISO strings, which are
            # lexicographically date-ordered.
            to_refresh: set[int] = set()
            for n in normalized:
                cid = n["parent"]["cpsc_recall_id"]
                new_lpd = n["parent"]["last_publish_date"]
                if cid not in pre_state:
                    to_refresh.add(cid)
                    continue
                old_lpd = pre_state[cid][1]
                if (new_lpd or "") != (old_lpd or ""):
                    to_refresh.add(cid)

            parent_rows = [n["parent"] for n in normalized]
            written = _bulk_insert(
                "cpsc_recalls",
                parent_rows,
                on_conflict="cpsc_recall_id",
                resolution="merge-duplicates",
                chunk_size=CPSC_UPSERT_CHUNK_SIZE,
            )

            # Map cpsc_recall_id -> uuid for child writes (uuid changes only
            # for first-time inserts; for upserts merge-duplicates retains it).
            post_state = fetch_existing_state(cpsc_ids) if not DRY_RUN else {
                cid: (f"dry-{cid}", None) for cid in cpsc_ids
            }

            # Delete children for refresh set.
            refresh_uuids = [
                post_state[cid][0] for cid in to_refresh
                if cid in post_state
            ]
            if not DRY_RUN:
                delete_children_for(refresh_uuids)

            # Insert children for refresh set only.
            refresh_set = set(to_refresh)
            child_buckets: dict[str, list[dict]] = {t: [] for t in CHILD_TABLES}
            for n in normalized:
                cid = n["parent"]["cpsc_recall_id"]
                if cid not in refresh_set:
                    continue
                uuid_id = post_state.get(cid, (None,))[0]
                if not uuid_id:
                    continue
                for row in n["products"]:
                    child_buckets["cpsc_recall_products"].append({**row, "recall_id": uuid_id})
                for row in n["manufacturers"]:
                    child_buckets["cpsc_recall_manufacturers"].append({**row, "recall_id": uuid_id})
                for row in n["hazards"]:
                    child_buckets["cpsc_recall_hazards"].append({**row, "recall_id": uuid_id})
                for row in n["retailers"]:
                    child_buckets["cpsc_recall_retailers"].append({**row, "recall_id": uuid_id})
                for row in n["remedies"]:
                    child_buckets["cpsc_recall_remedies"].append({**row, "recall_id": uuid_id})
                for row in n["images"]:
                    child_buckets["cpsc_recall_images"].append({**row, "recall_id": uuid_id})

            child_counts = {}
            for table, rows in child_buckets.items():
                if not rows:
                    child_counts[table] = 0
                    continue
                _bulk_insert(table, rows, chunk_size=CPSC_UPSERT_CHUNK_SIZE)
                child_counts[table] = len(rows)

            step.set_counts(rows_in=len(parent_rows), rows_out=written)
            step.set_metadata({
                "refreshed_recall_count": len(refresh_uuids),
                "child_row_counts": child_counts,
            })

    return 0


if __name__ == "__main__":
    sys.exit(main())
