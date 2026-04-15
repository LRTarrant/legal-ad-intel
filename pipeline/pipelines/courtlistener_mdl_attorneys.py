#!/usr/bin/env python3
"""
CourtListener MDL member-case attorney pipeline.

Collects the FULL list of plaintiff attorneys across all member dockets
for each MDL, not just the leadership on the master docket.

Two-phase approach:
  Phase 1 — Discovery: Use the public RECAP search API to find all member
            docket IDs and their flat attorney/firm lists.
  Phase 2 — Classification: Sample a subset of dockets via the authenticated
            /parties/ endpoint to build a defendant-firm set, then classify
            every attorney not on the defendant side as plaintiff-side.

Usage:
    python -m pipelines.courtlistener_mdl_attorneys --mdl 3140
    python -m pipelines.courtlistener_mdl_attorneys --mdl 3140 --dry-run
    python -m pipelines.courtlistener_mdl_attorneys  # all MDLs with cl_docket_id
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (  # noqa: E402
    PipelineRun,
    DRY_RUN,
    _bulk_insert,
    _get,
)

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)

CL_API_TOKEN = os.environ.get("COURTLISTENER_API_TOKEN", "")
CL_BASE = "https://www.courtlistener.com/api/rest/v4"
SEARCH_URL = f"{CL_BASE}/search/"

REQUEST_DELAY_SECONDS = 2.0  # polite delay between API calls
RATE_LIMIT_WAIT_SECONDS = 60
MAX_RETRIES = 3
SEARCH_PAGE_SIZE = 20
SAMPLE_DOCKETS_FOR_DEFENDANTS = 30  # how many dockets to sample to build defendant set

_last_api_call_at = 0.0


# ---------------------------------------------------------------------------
# Known MDL -> CourtListener master docket id mapping.
# These are the master/lead dockets, not the member cases.
# ---------------------------------------------------------------------------
KNOWN_CL_DOCKETS = {
    3140: 69674950,
    2873: 8408916,
    3060: 71987157,
    2738: 295567,
    3047: 65407433,
    2741: 5981306,
    3004: 59988561,
    2974: 44788596,
    2666: 4514197,
    3084: 67856158,
}


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _rate_limited_sleep() -> None:
    global _last_api_call_at
    now = time.monotonic()
    elapsed = now - _last_api_call_at
    if elapsed < REQUEST_DELAY_SECONDS:
        time.sleep(REQUEST_DELAY_SECONDS - elapsed)


def _http_get(url: str, *, params: dict | None = None, auth: bool = False) -> dict:
    """Generic GET with rate limiting and 429 handling."""
    global _last_api_call_at

    headers = {"Accept": "application/json"}
    if auth and CL_API_TOKEN:
        headers["Authorization"] = f"Token {CL_API_TOKEN}"

    for attempt in range(1, MAX_RETRIES + 1):
        _rate_limited_sleep()
        resp = None
        try:
            resp = httpx.get(url, headers=headers, params=params, timeout=45)
            _last_api_call_at = time.monotonic()

            if resp.status_code == 429:
                if attempt >= MAX_RETRIES:
                    logger.warning("429 persisted after %d retries for %s", MAX_RETRIES, url)
                    return {}
                logger.warning("429 — waiting %ss before retry %d/%d",
                               RATE_LIMIT_WAIT_SECONDS, attempt + 1, MAX_RETRIES)
                time.sleep(RATE_LIMIT_WAIT_SECONDS)
                continue

            resp.raise_for_status()
            return resp.json() if resp.content else {}
        except httpx.HTTPError as exc:
            if attempt >= MAX_RETRIES:
                status = resp.status_code if resp is not None else "n/a"
                logger.error("Request failed (%s): %s", status, exc)
                return {}
            logger.warning("Request failed (attempt %d/%d): %s", attempt, MAX_RETRIES, exc)
            time.sleep(2)

    return {}


# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------

_SUFFIX_RE = re.compile(
    r"\s*,?\s+(Jr\.?|Sr\.?|I{1,3}|IV|V|VI{0,3}|[0-9]+(?:st|nd|rd|th)?)\s*$",
    re.IGNORECASE,
)

_NJ_BAR_PREFIX_RE = re.compile(
    r"^Counsel\s+Not\s+Admitted\s+to\s+Usdc-?Nj\s*(?:Bar)?\s*,?\s*",
    re.IGNORECASE,
)


def _normalize_name(name: str | None) -> str | None:
    """Title-case a person name, preserving suffixes."""
    if not name or not name.strip():
        return None
    name = name.strip()

    # Extract suffix
    suffix_match = _SUFFIX_RE.search(name)
    suffix = ""
    if suffix_match:
        suffix = suffix_match.group(1).strip()
        name = name[: suffix_match.start()].strip()
        # Clean comma before suffix
        name = name.rstrip(",").strip()

    # Title-case
    parts = name.split()
    cased = []
    for part in parts:
        if part.upper() == part and len(part) > 2:
            # ALL CAPS — title-case it
            cased.append(part.capitalize())
        elif len(part) <= 2 and part.upper() == part:
            # Initials like "A." or "M." — keep as-is
            cased.append(part)
        else:
            cased.append(part)
    result = " ".join(cased)

    if suffix:
        result += f" {suffix}"

    return result or None


# Regex: location suffixes appended by CourtListener, e.g.
#   "Williams & Connolly LLP - Washington Dc"
#   "Dechert LLP Los Angeles Ca"
#   "Ub Greensfelder LLP Cleveland Oh"
#   "Scharf Banks Marmor LLC Chicago Il"
# Pattern: optional " - ", then City(+State) at the end.
_LOCATION_SUFFIX_RE = re.compile(
    r",?\s+[A-Z][a-z]+,\s+[A-Z]{2}\s*$",  # "City, ST" (with comma before state)
)

# Firm-name tokens that should stay uppercase.
_KEEP_UPPER_TOKENS = {
    "LLC", "LLP", "PC", "PA", "PLLC", "LTD", "INC", "US", "LPA",
    "P.C.", "P.A.", "L.L.C.", "L.L.P.",
}


def _normalize_firm(firm: str | None) -> str | None:
    """Normalize a firm name: strip NJ bar prefix, location suffix, title-case."""
    if not firm or not firm.strip():
        return None
    firm = firm.strip()

    # Strip "Counsel Not Admitted to Usdc-Nj Bar, " prefix
    firm = _NJ_BAR_PREFIX_RE.sub("", firm).strip()
    if not firm:
        return None

    # Strip location after " - " (everything after dash separator is always a
    # location in CourtListener data, e.g. "Weitz & Luxenberg PC - New York, NY")
    dash_idx = firm.find(" - ")
    if dash_idx > 0:
        before = firm[:dash_idx].strip()
        if before and len(before.split()) >= 2:
            firm = before

    # Strip trailing "City, ST" patterns (with comma before state)
    stripped = _LOCATION_SUFFIX_RE.sub("", firm).strip().rstrip(",").strip()
    if stripped and len(stripped.split()) >= 2:
        firm = stripped

    # Strip trailing "City St" (no comma) — only when the last token looks
    # like a title-cased state (e.g. "Ca", "Oh", "Il") and is NOT a legal
    # suffix like PA/PC/LLC. This catches "Dechert LLP Los Angeles Ca".
    words = firm.split()
    if len(words) >= 3:
        last = words[-1]
        # Title-case 2-letter token that isn't a legal suffix
        if (len(last) == 2
                and last[0].isupper() and last[1].islower()
                and last.upper() not in _KEEP_UPPER_TOKENS):
            # Walk backward to find where the city name starts — city words
            # are title-cased non-legal-suffix words (e.g. "Los Angeles")
            trim_from = len(words) - 1  # start at the state token
            for k in range(len(words) - 2, 0, -1):
                w = words[k]
                if (len(w) >= 2 and w[0].isupper() and w[1:].islower()
                        and w.upper() not in _KEEP_UPPER_TOKENS):
                    trim_from = k
                else:
                    break
            candidate = " ".join(words[:trim_from])
            if candidate and len(candidate.split()) >= 2:
                firm = candidate

    # If ALL CAPS, title-case while preserving legal abbreviations
    if firm.upper() == firm and len(firm) > 3:
        words = firm.split()
        cased = []
        for w in words:
            clean = w.rstrip(".,")
            if clean.upper() in _KEEP_UPPER_TOKENS:
                cased.append(w)
            elif w.startswith("(") or w.startswith("'"):
                cased.append(w)  # preserve quoted/paren items
            else:
                cased.append(w.capitalize())
        firm = " ".join(cased)

    # Normalize whitespace
    firm = re.sub(r"\s+", " ", firm).strip()

    return firm or None


def _firm_fingerprint(name: str) -> str:
    """
    Create a canonical fingerprint for fuzzy firm matching.

    Strips '&', 'and', punctuation, lowercases, sorts words.
    e.g. "Weitz & Luxenberg PC" -> "luxenberg pc weitz"
         "Weitz Luxenberg P.C." -> "luxenberg pc weitz"
         "Weitz and Luxenburg PC" -> "luxenburg pc weitz"
    """
    s = name.lower()
    # Remove '&' and 'and' as connectors
    s = re.sub(r'\band\b', '', s)
    s = s.replace('&', '')
    # Remove all punctuation except alphanumeric and spaces
    s = re.sub(r'[^\w\s]', '', s)
    # Split, sort, rejoin
    words = sorted(s.split())
    return " ".join(words)


def _edit_distance(a: str, b: str) -> int:
    """Compute Levenshtein edit distance between two strings."""
    if len(a) < len(b):
        return _edit_distance(b, a)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca == cb else 1
            curr.append(min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost))
        prev = curr
    return prev[-1]


# ---------------------------------------------------------------------------
# Firm registry: firm_id -> canonical name, with fuzzy merge
# ---------------------------------------------------------------------------

_LEADERSHIP_KEYWORDS = (
    "lead counsel", "co-lead counsel", "liaison counsel",
    "steering committee", "executive committee",
    "plaintiffs' counsel", "plaintiff's counsel",
)


def _build_firm_registry(
    member_dockets: list[dict],
) -> tuple[dict[int, str], dict[str, str]]:
    """
    Build two mappings for firm deduplication:

    1. firm_id -> canonical_name: maps each CL firm_id to its best display name
    2. fingerprint -> canonical_name: maps fuzzy fingerprints so that different
       firm_ids with near-identical names merge to one canonical name

    Returns (firm_id_to_name, fingerprint_to_canonical).
    """
    # Collect: firm_id -> list of (normalized_name, count)
    fid_name_counts: dict[int, Counter] = defaultdict(Counter)

    for docket in member_dockets:
        firm_names = docket.get("firm_names", [])
        firm_ids = docket.get("firm_ids", [])
        for i, fid in enumerate(firm_ids):
            fid = int(fid)
            raw = firm_names[i] if i < len(firm_names) else None
            normed = _normalize_firm(raw)
            if normed:
                fid_name_counts[fid][normed] += 1

    # Pick best name per firm_id: most common normalized variant
    firm_id_to_name: dict[int, str] = {}
    for fid, counter in fid_name_counts.items():
        best_name = counter.most_common(1)[0][0]
        firm_id_to_name[fid] = best_name

    # Fuzzy merge: group firm_ids whose best names have the same fingerprint
    fp_groups: dict[str, list[int]] = defaultdict(list)
    for fid, name in firm_id_to_name.items():
        fp = _firm_fingerprint(name)
        fp_groups[fp].append(fid)

    # Second pass: merge fingerprints that are within edit distance 2 of each
    # other (catches spelling variants like "Luxenberg" vs "Luxenburg")
    fps = sorted(fp_groups.keys())
    merged: dict[str, str] = {}  # fp -> canonical fp
    for i, fp_a in enumerate(fps):
        if fp_a in merged:
            continue
        for fp_b in fps[i + 1:]:
            if fp_b in merged:
                continue
            if abs(len(fp_a) - len(fp_b)) > 2:
                continue
            if _edit_distance(fp_a, fp_b) <= 2:
                # Merge fp_b into fp_a
                merged[fp_b] = fp_a
                fp_groups[fp_a].extend(fp_groups[fp_b])

    for fp in merged:
        del fp_groups[fp]

    # For each fingerprint group, pick the canonical name (most common, shortest)
    fingerprint_to_canonical: dict[str, str] = {}
    for fp, fids in fp_groups.items():
        # Collect all name variants across all firm_ids in this group
        all_names: Counter = Counter()
        for fid in fids:
            all_names.update(fid_name_counts[fid])
        # Pick: most common, then shortest as tiebreaker
        canonical = max(all_names, key=lambda n: (all_names[n], -len(n)))
        fingerprint_to_canonical[fp] = canonical
        # Also map any merged fingerprints to the same canonical
        for other_fp, target_fp in merged.items():
            if target_fp == fp:
                fingerprint_to_canonical[other_fp] = canonical
        # Update all firm_ids in this group to the canonical
        for fid in fids:
            firm_id_to_name[fid] = canonical

    return firm_id_to_name, fingerprint_to_canonical


# ---------------------------------------------------------------------------
# Phase 1: Discovery via RECAP search API (no auth needed)
# ---------------------------------------------------------------------------


def discover_member_dockets(mdl_number: int) -> list[dict]:
    """
    Page through the RECAP search API to find all member dockets for an MDL.

    Returns a list of dicts, each with:
      docket_id, case_name, attorney_names, attorney_ids, firm_names, firm_ids, party_names
    """
    dockets: list[dict] = []
    page = 1

    while True:
        data = _http_get(SEARCH_URL, params={
            "q": f'"MDL {mdl_number}"',
            "type": "d",
            "page_size": SEARCH_PAGE_SIZE,
            "page": page,
        })

        results = data.get("results", [])
        if not results:
            break

        for r in results:
            dockets.append({
                "docket_id": r.get("docket_id"),
                "case_name": r.get("caseName", ""),
                "attorney_names": r.get("attorney", []),
                "attorney_ids": r.get("attorney_id", []),
                "firm_names": r.get("firm", []),
                "firm_ids": r.get("firm_id", []),
                "party_names": r.get("party", []),
            })

        total = data.get("count", 0)
        logger.info(
            "Discovery page %d: %d results (total %d, collected %d)",
            page, len(results), total, len(dockets),
        )

        if not data.get("next"):
            break
        page += 1

    logger.info("Discovered %d member dockets for MDL %d", len(dockets), mdl_number)
    return dockets


# ---------------------------------------------------------------------------
# Phase 2: Build defendant firm set from sample dockets (needs auth)
# ---------------------------------------------------------------------------


def _fetch_parties_for_docket(cl_docket_id: int) -> list[dict]:
    """Fetch all parties (with nested attorneys) for a docket."""
    parties: list[dict] = []
    url = f"{CL_BASE}/parties/"
    params = {"docket": cl_docket_id}

    while url:
        data = _http_get(url, params=params, auth=True)
        params = None  # next URL has params embedded

        if not isinstance(data, dict):
            break

        parties.extend(data.get("results", []))
        url = data.get("next")

    return parties


def build_defendant_set(
    member_dockets: list[dict],
    master_docket_id: int,
) -> tuple[set[int], set[int]]:
    """
    Sample dockets to identify defendant attorneys and firms.

    Returns (defendant_attorney_ids, defendant_firm_ids).
    """
    defendant_attorney_ids: set[int] = set()
    defendant_firm_ids: set[int] = set()

    # Always sample the master docket + a random subset of member dockets
    docket_ids_to_sample = [master_docket_id]
    for d in member_dockets[:SAMPLE_DOCKETS_FOR_DEFENDANTS]:
        did = d.get("docket_id")
        if did and did != master_docket_id:
            docket_ids_to_sample.append(did)

    logger.info("Sampling %d dockets to build defendant set", len(docket_ids_to_sample))

    for docket_id in docket_ids_to_sample:
        parties = _fetch_parties_for_docket(docket_id)
        for party in parties:
            party_types = party.get("party_types", [])
            type_names = {
                (t.get("name") or "").strip().lower()
                for t in party_types
                if isinstance(t, dict)
            }

            # Is this a defendant-side party?
            is_defendant = bool(type_names & {
                "defendant", "respondent", "third party defendant",
                "cross-defendant", "appellee",
            })

            if not is_defendant:
                continue

            # Collect attorney IDs from this defendant party
            for atty_entry in party.get("attorneys", []) or []:
                if not isinstance(atty_entry, dict):
                    continue
                atty_obj = atty_entry.get("attorney", {})
                if isinstance(atty_obj, dict) and atty_obj.get("id"):
                    defendant_attorney_ids.add(int(atty_obj["id"]))
                # Also check for organization IDs
                for org in atty_entry.get("organizations", []) or []:
                    if isinstance(org, dict) and org.get("id"):
                        defendant_firm_ids.add(int(org["id"]))

    logger.info(
        "Built defendant set: %d attorney IDs, %d firm IDs",
        len(defendant_attorney_ids),
        len(defendant_firm_ids),
    )
    return defendant_attorney_ids, defendant_firm_ids


# ---------------------------------------------------------------------------
# Phase 2 alternative: Full classification via parties endpoint
# (used when docket count is small enough, e.g. < 200)
# ---------------------------------------------------------------------------


def classify_all_via_parties(
    member_dockets: list[dict],
    master_docket_id: int,
) -> list[dict]:
    """
    For smaller MDLs, classify EVERY attorney by directly querying the
    parties endpoint for each docket. Returns fully classified rows.
    """
    # Check search API party names for leadership signal on master docket
    search_api_has_leadership = False
    for docket in member_dockets:
        if docket.get("docket_id") != master_docket_id:
            continue
        for pname in docket.get("party_names", []):
            if any(kw in (pname or "").lower() for kw in _LEADERSHIP_KEYWORDS):
                search_api_has_leadership = True
                break
        break

    # Attorney ID -> accumulated data
    attorney_data: dict[int, dict] = {}

    all_docket_ids = [master_docket_id] + [
        d["docket_id"] for d in member_dockets
        if d.get("docket_id") and d["docket_id"] != master_docket_id
    ]

    # Deduplicate
    seen = set()
    unique_docket_ids = []
    for did in all_docket_ids:
        if did not in seen:
            seen.add(did)
            unique_docket_ids.append(did)

    logger.info("Full classification: querying parties for %d dockets", len(unique_docket_ids))

    for idx, docket_id in enumerate(unique_docket_ids):
        if idx % 50 == 0 and idx > 0:
            logger.info("  Progress: %d / %d dockets", idx, len(unique_docket_ids))

        is_master = (docket_id == master_docket_id)
        parties = _fetch_parties_for_docket(docket_id)

        for party in parties:
            party_name = (party.get("name") or "").strip()
            party_types = party.get("party_types", [])
            type_names = {
                (t.get("name") or "").strip()
                for t in party_types
                if isinstance(t, dict)
            }
            # Determine side
            lower_types = {t.lower() for t in type_names}
            is_plaintiff = bool(lower_types & {
                "plaintiff", "petitioner", "complainant",
                "cross-claimant", "appellant", "movant",
                # MDL-specific leadership labels
                "in re",
            })
            is_defendant = bool(lower_types & {
                "defendant", "respondent", "third party defendant",
                "cross-defendant", "appellee",
            })

            # MDL leadership groups on the master docket
            is_leadership_party = is_master and any(
                kw in party_name.lower()
                for kw in _LEADERSHIP_KEYWORDS
            )

            for atty_entry in party.get("attorneys", []) or []:
                if not isinstance(atty_entry, dict):
                    continue
                atty_obj = atty_entry.get("attorney", {})
                if not isinstance(atty_obj, dict):
                    continue
                cl_attorney_id = atty_obj.get("id")
                if cl_attorney_id is None:
                    continue
                cl_attorney_id = int(cl_attorney_id)

                attorney_name = (atty_obj.get("name") or "").strip()
                if not attorney_name:
                    continue

                # Extract firm from contact block or organizations
                firm_name = _extract_firm_from_attorney(atty_obj)

                # Get or create entry
                existing = attorney_data.get(cl_attorney_id)
                if existing is None:
                    attorney_data[cl_attorney_id] = {
                        "cl_attorney_id": cl_attorney_id,
                        "attorney_name": attorney_name,
                        "firm_name": firm_name,
                        "party_types": set(),
                        "party_names": set(),
                        "is_plaintiff": False,
                        "is_defendant": False,
                        "is_leadership": False,
                        "docket_ids": set(),
                    }
                    existing = attorney_data[cl_attorney_id]

                existing["party_types"].update(type_names)
                if party_name:
                    existing["party_names"].add(party_name)
                if is_plaintiff:
                    existing["is_plaintiff"] = True
                if is_defendant:
                    existing["is_defendant"] = True
                if is_leadership_party:
                    existing["is_leadership"] = True
                existing["docket_ids"].add(docket_id)
                # Prefer non-empty firm
                if firm_name and not existing.get("firm_name"):
                    existing["firm_name"] = firm_name

    # Fallback: if the search API detected leadership party names on the
    # master docket but the parties endpoint didn't mark anyone as leadership,
    # mark all plaintiff attorneys on the master docket as potential leadership
    any_leadership = any(e.get("is_leadership") for e in attorney_data.values())
    if search_api_has_leadership and not any_leadership:
        logger.info(
            "Search API detected leadership parties on master docket %d "
            "but parties endpoint did not — marking master docket plaintiff "
            "attorneys as leadership",
            master_docket_id,
        )
        for entry in attorney_data.values():
            if master_docket_id in entry.get("docket_ids", set()) and \
               entry.get("is_plaintiff"):
                entry["is_leadership"] = True

    return list(attorney_data.values())


def _extract_firm_from_attorney(atty_obj: dict) -> str | None:
    """Extract firm name from attorney object's contact block or name fields."""
    # Try contact_raw first
    contact = atty_obj.get("contact_raw") or atty_obj.get("contact") or ""
    if contact:
        lines = [line.strip() for line in contact.splitlines() if line.strip()]
        if lines:
            # First line of contact is usually the firm
            first = lines[0]
            # Skip if it looks like a phone or address
            if not re.match(r"^[\d\(\+]", first) and not re.match(r"^\d+\s", first):
                return first

    # Try organizations
    orgs = atty_obj.get("organizations", [])
    if isinstance(orgs, list):
        for org in orgs:
            if isinstance(org, dict):
                name = org.get("name", "").strip()
                if name:
                    return name

    return None


# ---------------------------------------------------------------------------
# Phase 3: Classify via defendant exclusion (for large MDLs)
# ---------------------------------------------------------------------------


def classify_via_exclusion(
    member_dockets: list[dict],
    master_docket_id: int,
    defendant_atty_ids: set[int],
    defendant_firm_ids: set[int],
) -> list[dict]:
    """
    For large MDLs: use the search-discovered flat attorney lists and
    classify by excluding known defendants.

    Uses firm_id-based deduplication, fuzzy firm name merging, leadership
    detection from master docket party names, and attorney deduplication.
    """
    # Step 1: Build firm registry (firm_id -> canonical name + fuzzy merge)
    firm_id_to_name, fp_to_canonical = _build_firm_registry(member_dockets)

    # Step 2: Detect leadership from master docket party names
    master_attorney_ids: set[int] = set()
    master_has_leadership_parties = False

    for docket in member_dockets:
        if docket.get("docket_id") != master_docket_id:
            continue
        # Check party names for leadership keywords
        for pname in docket.get("party_names", []):
            if any(kw in (pname or "").lower() for kw in _LEADERSHIP_KEYWORDS):
                master_has_leadership_parties = True
                break
        # All attorneys on the master docket are potential leadership
        for aid in docket.get("attorney_ids", []):
            master_attorney_ids.add(int(aid))
        break  # only one master docket entry needed

    if master_has_leadership_parties:
        logger.info(
            "Leadership parties detected on master docket %d — %d attorneys marked",
            master_docket_id, len(master_attorney_ids),
        )

    # Step 3: Build attorney registry with firm_id-based firm assignment
    # attorney_id -> {name, firm_id_counts, docket_ids, ...}
    registry: dict[int, dict] = {}

    for docket in member_dockets:
        docket_id = docket.get("docket_id")
        atty_names = docket.get("attorney_names", [])
        atty_ids = docket.get("attorney_ids", [])
        firm_ids = docket.get("firm_ids", [])

        for i, aid in enumerate(atty_ids):
            aid = int(aid)
            name = atty_names[i] if i < len(atty_names) else None
            if not name:
                continue

            if aid not in registry:
                registry[aid] = {
                    "cl_attorney_id": aid,
                    "attorney_name": name,
                    "firm_name": None,
                    "firm_id_counts": Counter(),
                    "all_firm_ids": set(),
                    "docket_ids": set(),
                    "is_plaintiff": True,
                    "is_defendant": False,
                    "is_leadership": False,
                }

            entry = registry[aid]
            if docket_id:
                entry["docket_ids"].add(docket_id)

        # Associate firm_ids with attorneys on this docket
        for fid in firm_ids:
            fid = int(fid)
            for aid in atty_ids:
                aid = int(aid)
                if aid in registry:
                    registry[aid]["firm_id_counts"][fid] += 1
                    registry[aid]["all_firm_ids"].add(fid)

    # Step 4: Resolve best firm for each attorney (most frequent firm_id)
    for aid, entry in registry.items():
        fid_counts = entry["firm_id_counts"]
        if fid_counts:
            best_fid = fid_counts.most_common(1)[0][0]
            # Look up canonical name from the firm registry
            canonical = firm_id_to_name.get(best_fid)
            if not canonical:
                # Fallback: normalize the raw name if we have it
                canonical = None
            entry["firm_name"] = canonical

        # If still no firm, try fuzzy-matching any firm_id we have
        if not entry["firm_name"]:
            for fid in entry["all_firm_ids"]:
                name = firm_id_to_name.get(fid)
                if name:
                    entry["firm_name"] = name
                    break

    # Step 5: Mark leadership
    if master_has_leadership_parties:
        for aid in master_attorney_ids:
            if aid in registry:
                registry[aid]["is_leadership"] = True

    # Step 6: Classify defendants
    for aid, entry in registry.items():
        if aid in defendant_atty_ids:
            entry["is_plaintiff"] = False
            entry["is_defendant"] = True
        elif entry["all_firm_ids"] & defendant_firm_ids:
            entry["is_plaintiff"] = False
            entry["is_defendant"] = True

    # Clean up internal tracking fields before returning
    for entry in registry.values():
        del entry["firm_id_counts"]
        del entry["all_firm_ids"]

    return list(registry.values())


# ---------------------------------------------------------------------------
# Build final rows for DB upsert
# ---------------------------------------------------------------------------


def build_upsert_rows(
    mdl_number: int,
    master_docket_id: int,
    classified: list[dict],
    *,
    plaintiff_only: bool = True,
) -> list[dict]:
    """Convert classified attorney entries into DB rows."""
    fetched_at = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []

    for entry in classified:
        if plaintiff_only and not entry.get("is_plaintiff"):
            continue

        cl_attorney_id = entry["cl_attorney_id"]
        docket_ids = entry.get("docket_ids", set())

        # Get best party_type label
        party_types = entry.get("party_types", set())
        if party_types:
            party_type = next(
                (t for t in party_types if t.lower() == "plaintiff"),
                next(iter(party_types)),
            )
        else:
            party_type = "Plaintiff"

        # Get best party_name
        party_names = entry.get("party_names", set())
        party_name = next(iter(party_names), None)

        # Sample up to 10 docket IDs
        sample_ids = sorted(docket_ids)[:10]

        rows.append({
            "mdl_number": mdl_number,
            "cl_docket_id": master_docket_id,
            "cl_attorney_id": cl_attorney_id,
            "attorney_name": _normalize_name(entry.get("attorney_name")),
            "firm_name": _normalize_firm(entry.get("firm_name")),
            "party_name": party_name,
            "party_type": party_type,
            "is_leadership": entry.get("is_leadership", False),
            "member_docket_count": len(docket_ids),
            "sample_docket_ids": sample_ids,
            "fetched_at": fetched_at,
        })

    # Fuzzy-merge firm names across all rows (catches duplicates from the
    # classify_all_via_parties path where firm names come from contact blocks
    # rather than firm_ids)
    fp_name_counts: dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        fn = row.get("firm_name")
        if fn:
            fp_name_counts[_firm_fingerprint(fn)][fn] += 1

    # Merge near-duplicate fingerprints (edit distance <= 2)
    fps = sorted(fp_name_counts.keys())
    fp_merged: dict[str, str] = {}
    for i, fp_a in enumerate(fps):
        if fp_a in fp_merged:
            continue
        for fp_b in fps[i + 1:]:
            if fp_b in fp_merged:
                continue
            if abs(len(fp_a) - len(fp_b)) > 2:
                continue
            if _edit_distance(fp_a, fp_b) <= 2:
                fp_merged[fp_b] = fp_a
                fp_name_counts[fp_a].update(fp_name_counts[fp_b])

    fp_canonical: dict[str, str] = {}
    for fp, counter in fp_name_counts.items():
        if fp in fp_merged:
            continue
        canonical = max(counter, key=lambda n: (counter[n], -len(n)))
        fp_canonical[fp] = canonical
        # Map merged fingerprints too
        for other_fp, target_fp in fp_merged.items():
            if target_fp == fp:
                fp_canonical[other_fp] = canonical

    for row in rows:
        fn = row.get("firm_name")
        if fn:
            row["firm_name"] = fp_canonical.get(_firm_fingerprint(fn), fn)

    # Deduplicate by cl_attorney_id (keep richest row)
    best: dict[int, dict] = {}
    for row in rows:
        aid = row["cl_attorney_id"]
        existing = best.get(aid)
        if existing is None:
            best[aid] = row
        else:
            # Keep whichever has more data
            if (row.get("firm_name") and not existing.get("firm_name")) or \
               row.get("member_docket_count", 0) > existing.get("member_docket_count", 0):
                # Merge docket counts
                row["member_docket_count"] = max(
                    row.get("member_docket_count", 0),
                    existing.get("member_docket_count", 0),
                )
                best[aid] = row
            # Preserve leadership flag if either copy has it
            if row.get("is_leadership"):
                best[aid]["is_leadership"] = True

    # Second pass: deduplicate by normalized attorney name.
    # CourtListener assigns different cl_attorney_id values to the same
    # person across different dockets.  Merge them by name.
    name_best: dict[str, dict] = {}
    for row in best.values():
        name = (row.get("attorney_name") or "").strip()
        if not name:
            continue
        name_key = name.lower()
        existing = name_best.get(name_key)
        if existing is None:
            name_best[name_key] = row
        else:
            # Keep the row with more info: prefer firm, then higher docket count
            new_score = (1 if row.get("firm_name") else 0, row.get("member_docket_count", 0))
            old_score = (1 if existing.get("firm_name") else 0, existing.get("member_docket_count", 0))
            if new_score > old_score:
                # Merge docket counts
                row["member_docket_count"] = max(
                    row.get("member_docket_count", 0),
                    existing.get("member_docket_count", 0),
                )
                name_best[name_key] = row
            else:
                existing["member_docket_count"] = max(
                    existing.get("member_docket_count", 0),
                    row.get("member_docket_count", 0),
                )
            # Preserve leadership + firm from either copy
            if row.get("is_leadership"):
                name_best[name_key]["is_leadership"] = True
            if row.get("firm_name") and not name_best[name_key].get("firm_name"):
                name_best[name_key]["firm_name"] = row["firm_name"]

    result = list(name_best.values())
    if len(result) < len(best):
        logger.info(
            "Name-based dedup merged %d cl_attorney_ids into %d unique attorneys",
            len(best), len(result),
        )
    logger.info(
        "Built %d %srows for MDL %d",
        len(result),
        "plaintiff " if plaintiff_only else "",
        mdl_number,
    )
    return result


# ---------------------------------------------------------------------------
# Main pipeline steps
# ---------------------------------------------------------------------------

# Threshold: if member dockets exceed this, use the faster exclusion approach
FULL_CLASSIFICATION_THRESHOLD = 200


def step_discover_and_classify(step, mdl_number: int, master_docket_id: int) -> list[dict]:
    """Phase 1+2: Discover member dockets, then classify attorneys."""
    if not CL_API_TOKEN:
        logger.warning("COURTLISTENER_API_TOKEN not set — will use exclusion approach only")

    # Phase 1: Discover member dockets
    member_dockets = discover_member_dockets(mdl_number)

    if not member_dockets:
        logger.warning("No member dockets found for MDL %d", mdl_number)
        step.set_counts(rows_in=0, rows_out=0)
        return []

    # Phase 2: Classify
    docket_count = len(member_dockets)
    if docket_count <= FULL_CLASSIFICATION_THRESHOLD and CL_API_TOKEN:
        # Small enough to query every docket's parties endpoint
        logger.info(
            "MDL %d has %d dockets — using full party classification",
            mdl_number, docket_count,
        )
        classified = classify_all_via_parties(member_dockets, master_docket_id)
    else:
        # Large MDL — use sampling + exclusion
        logger.info(
            "MDL %d has %d dockets — using defendant-exclusion approach",
            mdl_number, docket_count,
        )
        if CL_API_TOKEN:
            defendant_atty_ids, defendant_firm_ids = build_defendant_set(
                member_dockets, master_docket_id,
            )
        else:
            defendant_atty_ids, defendant_firm_ids = set(), set()

        classified = classify_via_exclusion(
            member_dockets, master_docket_id,
            defendant_atty_ids, defendant_firm_ids,
        )

    # Build DB rows (plaintiff only)
    rows = build_upsert_rows(mdl_number, master_docket_id, classified)

    step.set_counts(rows_in=docket_count, rows_out=len(rows))
    step.set_metadata({
        "member_dockets": docket_count,
        "total_classified": len(classified),
        "plaintiff_rows": len(rows),
        "approach": "full" if docket_count <= FULL_CLASSIFICATION_THRESHOLD else "exclusion",
    })

    return rows


def step_upsert(step, rows: list[dict]):
    """Write rows to mdl_attorneys via upsert."""
    if not rows:
        step.set_counts(rows_in=0, rows_out=0)
        return

    inserted = _bulk_insert(
        "mdl_attorneys",
        rows,
        on_conflict="mdl_number,cl_attorney_id",
        resolution="merge-duplicates",
    )
    step.set_counts(rows_in=len(rows), rows_out=inserted)
    step.set_metadata({"upserted": inserted})


def main():
    parser = argparse.ArgumentParser(
        description="CourtListener MDL member-case attorney pipeline"
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--mdl", type=int, default=None,
                        help="Target a single MDL number")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    # Determine which MDLs to process
    if args.mdl:
        mdls_to_process = [(args.mdl, KNOWN_CL_DOCKETS.get(args.mdl))]
    else:
        # Process all known MDLs
        mdls_to_process = list(KNOWN_CL_DOCKETS.items())

    with PipelineRun("courtlistener_mdl_attorneys", trigger=trigger) as run:
        for mdl_number, master_docket_id in mdls_to_process:
            if not master_docket_id:
                logger.warning("No master docket ID for MDL %d, skipping", mdl_number)
                continue

            logger.info("=" * 60)
            logger.info("Processing MDL %d (master docket %d)", mdl_number, master_docket_id)
            logger.info("=" * 60)

            with run.step(f"discover_classify_{mdl_number}") as step:
                rows = step_discover_and_classify(step, mdl_number, master_docket_id)

            with run.step(f"upsert_{mdl_number}") as step:
                step_upsert(step, rows)


if __name__ == "__main__":
    main()
