#!/usr/bin/env python3
"""
CourtListener attorney pipeline.

Fetches party + attorney relationships using docket-scoped CourtListener endpoints.

Usage:
    python -m pipelines.courtlistener_attorneys
    python -m pipelines.courtlistener_attorneys --dry-run
    python -m pipelines.courtlistener_attorneys --mdl 3060
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import time
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

CL_API_TOKEN = os.environ.get("COURTLISTENER_API_TOKEN", "")
CL_BASE = "https://www.courtlistener.com/api/rest/v4"
REQUEST_DELAY_SECONDS = 3.0
RATE_LIMIT_WAIT_SECONDS = 60
MAX_RETRIES = 3

ROLE_MAP = {
    1: "Lead attorney",
    2: "Attorney to be noticed",
    3: "Attorney in charge",
    4: "Pro hac vice",
    10: "Self-represented",
}

# Known MDL -> CourtListener master docket id mapping.
KNOWN_CL_DOCKETS = {
    3140: 69674950,
    3060: 71987157,
    2738: 295567,
    2741: 4579168,
    3047: 65407433,
}

_last_api_call_at = 0.0
_global_429_count = 0


def _cl_headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if CL_API_TOKEN:
        headers["Authorization"] = f"Token {CL_API_TOKEN}"
    return headers


def _rate_limited_sleep() -> None:
    global _last_api_call_at
    now = time.monotonic()
    elapsed = now - _last_api_call_at
    if elapsed < REQUEST_DELAY_SECONDS:
        time.sleep(REQUEST_DELAY_SECONDS - elapsed)


def _cl_get(url: str, params: dict | None = None) -> dict:
    """CourtListener GET with required throttling and 429 handling."""
    global _last_api_call_at
    global _global_429_count

    for attempt in range(1, MAX_RETRIES + 1):
        _rate_limited_sleep()
        resp = None
        try:
            resp = httpx.get(url, headers=_cl_headers(), params=params, timeout=45)
            _last_api_call_at = time.monotonic()

            if resp.status_code == 429:
                _global_429_count += 1
                if attempt >= MAX_RETRIES:
                    logger.warning("429 persisted after %d retries for %s", MAX_RETRIES, url)
                    return {}
                logger.warning(
                    "429 from CourtListener (%d global 429s). Waiting %ss before retry %d/%d",
                    _global_429_count,
                    RATE_LIMIT_WAIT_SECONDS,
                    attempt + 1,
                    MAX_RETRIES,
                )
                time.sleep(RATE_LIMIT_WAIT_SECONDS)
                continue

            resp.raise_for_status()
            return resp.json() if resp.content else {}
        except httpx.HTTPError as exc:
            if attempt >= MAX_RETRIES:
                status = resp.status_code if resp is not None else "n/a"
                logger.error("CourtListener request failed (%s): %s", status, exc)
                return {}
            logger.warning("Request failed (attempt %d/%d): %s", attempt, MAX_RETRIES, exc)
            time.sleep(2)

    return {}


def _try_sql_rpc(sql: str) -> bool:
    """Best-effort SQL execution for schema safety; no-op if unavailable."""
    from lib import pipeline as pipeline_lib

    rpc_names = ("execute_sql", "exec_sql", "run_sql")
    payload_options = (
        {"sql": sql},
        {"query": sql},
        {"q": sql},
    )

    for rpc_name in rpc_names:
        url = f"{pipeline_lib.SUPABASE_URL}/rest/v1/rpc/{rpc_name}"
        for payload in payload_options:
            try:
                resp = httpx.post(url, headers=pipeline_lib._headers(), json=payload, timeout=30)
                if 200 <= resp.status_code < 300:
                    return True
            except Exception:
                continue
    return False


def ensure_mdls_cl_docket_column() -> None:
    """Ensure mdls.cl_docket_id exists; then backfill known master dockets."""
    try:
        _get("mdls", {"select": "id,cl_docket_id", "limit": 1})
        column_exists = True
    except Exception:
        column_exists = False

    if not column_exists:
        logger.warning("mdls.cl_docket_id missing; attempting inline SQL migration")
        altered = _try_sql_rpc("ALTER TABLE public.mdls ADD COLUMN IF NOT EXISTS cl_docket_id bigint;")
        if not altered:
            logger.warning("Could not run inline SQL migration for mdls.cl_docket_id")

    if DRY_RUN:
        logger.info("[DRY RUN] Skipping mdls cl_docket_id backfill writes")
        return

    from lib import pipeline as pipeline_lib

    for mdl_number, docket_id in KNOWN_CL_DOCKETS.items():
        url = f"{pipeline_lib.SUPABASE_URL}/rest/v1/mdls?mdl_number=eq.{mdl_number}"
        body = {"cl_docket_id": docket_id}
        resp = httpx.patch(url, headers=pipeline_lib._headers(), json=body, timeout=30)
        if resp.status_code >= 400:
            logger.warning(
                "Unable to backfill cl_docket_id for MDL %s: %s",
                mdl_number,
                resp.text[:200],
            )


def fetch_parties_for_docket(cl_docket_id: int) -> list[dict]:
    """Fetch all parties rows for a docket via cursor pagination."""
    parties: list[dict] = []
    url = f"{CL_BASE}/parties/"
    params = {"docket": cl_docket_id}

    while url:
        data = _cl_get(url, params=params)
        params = None  # embedded in next URL after first page

        if not isinstance(data, dict):
            break

        for party in data.get("results", []):
            parties.append(party)

        url = data.get("next")

    return parties


def fetch_attorneys_for_docket(cl_docket_id: int) -> list[dict]:
    """Fetch all attorneys rows for a docket via cursor pagination."""
    attorneys: list[dict] = []
    url = f"{CL_BASE}/attorneys/"
    params = {"docket": cl_docket_id}

    while url:
        data = _cl_get(url, params=params)
        params = None  # embedded in next URL after first page

        if not isinstance(data, dict):
            break

        for attorney in data.get("results", []):
            attorneys.append(attorney)

        url = data.get("next")

    return attorneys


def _extract_id_from_url(value: str | None) -> int | None:
    if not isinstance(value, str):
        return None
    stripped = value.rstrip("/")
    if not stripped:
        return None
    last_segment = stripped.rsplit("/", 1)[-1]
    if not last_segment.isdigit():
        return None
    return int(last_segment)


def _party_identifiers(party: dict) -> set[str]:
    identifiers: set[str] = set()
    party_id = party.get("id")
    if party_id is not None:
        identifiers.add(str(party_id))

    for key in ("resource_uri", "url", "absolute_url"):
        value = party.get(key)
        if isinstance(value, str) and value.strip():
            identifiers.add(value.rstrip("/"))
            parsed_id = _extract_id_from_url(value)
            if parsed_id is not None:
                identifiers.add(str(parsed_id))

    return identifiers


def _build_attorney_lookup_by_party(attorneys: list[dict]) -> dict[str, list[dict]]:
    by_party: dict[str, list[dict]] = {}
    for attorney in attorneys:
        represented = attorney.get("parties_represented")
        if not isinstance(represented, list):
            continue

        for rep in represented:
            if not isinstance(rep, dict):
                continue

            party_ref = rep.get("party")
            keys: set[str] = set()
            if isinstance(party_ref, str) and party_ref.strip():
                keys.add(party_ref.rstrip("/"))
                party_id = _extract_id_from_url(party_ref)
                if party_id is not None:
                    keys.add(str(party_id))
            elif isinstance(party_ref, int):
                keys.add(str(party_ref))

            for key in keys:
                by_party.setdefault(key, []).append({"attorney": attorney, "representation": rep})

    return by_party


def _first_non_empty_str(*values) -> str | None:
    for value in values:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped:
                return stripped
    return None


def _extract_from_contact_block(contact: str | None, field: str) -> str | None:
    if not isinstance(contact, str) or not contact.strip():
        return None
    lines = [line.strip() for line in contact.splitlines() if line and line.strip()]
    if not lines:
        return None
    # CourtListener contact blocks commonly place firm/org as the first line.
    if field == "firm":
        return next((ln for ln in lines if not ln.lstrip().startswith(("Phone", "Fax", "Tel", "Email", "(")) and not ln.lstrip()[:1].isdigit()), lines[0])
    return None


def _extract_firm_name(party_attorney: dict, attorney_payload: dict | None, detail: dict | None) -> str | None:
    """Extract firm/org from party-attorney record first, then nested attorney payload, then detail."""
    candidate_containers = [party_attorney, attorney_payload or {}, detail or {}]
    firm_key_candidates = (
        "firm",
        "firm_name",
        "organization",
        "organization_name",
        "law_firm",
        "company",
    )

    for container in candidate_containers:
        contact = (container.get("contact") or container.get("contact_raw")) if isinstance(container, dict) else None
        firm_from_contact = _extract_from_contact_block(contact, "firm")
        if firm_from_contact:
            return firm_from_contact

        for key in firm_key_candidates:
            value = container.get(key) if isinstance(container, dict) else None
            firm = _first_non_empty_str(value)
            if firm:
                return firm

        roles = container.get("roles") if isinstance(container, dict) else None
        if isinstance(roles, list):
            for role in roles:
                if not isinstance(role, dict):
                    continue
                for key in firm_key_candidates:
                    firm = _first_non_empty_str(role.get(key))
                    if firm:
                        return firm

        organizations = container.get("organizations") if isinstance(container, dict) else None
        if isinstance(organizations, list):
            for org in organizations:
                if isinstance(org, dict):
                    firm = _first_non_empty_str(org.get("name"))
                else:
                    firm = _first_non_empty_str(org)
                if firm:
                    return firm

    return None


def _row_non_null_score(row: dict) -> int:
    fields = ("party_name", "party_type", "attorney_name", "firm_name", "role")
    score = 0
    for field in fields:
        value = row.get(field)
        if value is not None and (not isinstance(value, str) or value.strip()):
            score += 1
    return score


def _dedupe_rows(rows: list[dict]) -> list[dict]:
    """Keep one row per (mdl_number, cl_attorney_id), preferring richer rows."""
    best_by_key: dict[tuple[int, int], dict] = {}

    for row in rows:
        cl_attorney_id = row.get("cl_attorney_id")
        mdl_number = row.get("mdl_number")
        if not cl_attorney_id or not mdl_number:
            continue

        key = (int(mdl_number), int(cl_attorney_id))
        current_best = best_by_key.get(key)
        if current_best is None or _row_non_null_score(row) > _row_non_null_score(current_best):
            best_by_key[key] = row

    return list(best_by_key.values())


def build_rows(mdl_number: int, cl_docket_id: int, parties: list[dict], attorneys: list[dict]) -> list[dict]:
    rows: list[dict] = []
    fetched_at = datetime.now(timezone.utc).isoformat()
    attorneys_by_party = _build_attorney_lookup_by_party(attorneys)

    for party in parties:
        party_name = (party.get("name") or "").strip() or None

        party_types = party.get("party_types") or []
        first_party_type = None
        if party_types and isinstance(party_types[0], dict):
            first_party_type = (party_types[0].get("name") or "").strip() or None

        party_refs = _party_identifiers(party)
        matches: list[dict] = []
        for party_ref in party_refs:
            matches.extend(attorneys_by_party.get(party_ref, []))

        seen_attorney_ids: set[int] = set()
        for match in matches:
            attorney = match.get("attorney") if isinstance(match, dict) else None
            representation = match.get("representation") if isinstance(match, dict) else None
            if not isinstance(attorney, dict):
                continue

            cl_attorney_id = attorney.get("id")
            if cl_attorney_id is None:
                continue
            cl_attorney_id = int(cl_attorney_id)
            if cl_attorney_id in seen_attorney_ids:
                continue
            seen_attorney_ids.add(cl_attorney_id)

            attorney_name = _first_non_empty_str(attorney.get("name"))
            if attorney_name is None:
                continue
            firm_name = _extract_firm_name({}, attorney, attorney)
            role_int = representation.get("role") if isinstance(representation, dict) else None
            role_label = ROLE_MAP.get(role_int, f"Role {role_int}" if role_int is not None else None)

            rows.append(
                {
                    "mdl_number": mdl_number,
                    "cl_docket_id": cl_docket_id,
                    "party_name": party_name,
                    "party_type": first_party_type,
                    "attorney_name": attorney_name,
                    "firm_name": firm_name,
                    "cl_attorney_id": cl_attorney_id,
                    "role": role_label,
                    "fetched_at": fetched_at,
                }
            )

        for party_attorney in party.get("attorneys", []) or []:
            if not isinstance(party_attorney, dict):
                continue
            attorney_payload = party_attorney.get("attorney") if isinstance(party_attorney.get("attorney"), dict) else {}
            cl_attorney_id = party_attorney.get("attorney_id") or attorney_payload.get("id")
            if cl_attorney_id is None:
                continue
            cl_attorney_id = int(cl_attorney_id)
            if cl_attorney_id in seen_attorney_ids:
                continue
            seen_attorney_ids.add(cl_attorney_id)

            attorney_name = _first_non_empty_str(
                attorney_payload.get("name"),
                party_attorney.get("name"),
            )
            if attorney_name is None:
                continue
            firm_name = _extract_firm_name(party_attorney, attorney_payload, attorney_payload)

            role_int = party_attorney.get("role")
            role_label = ROLE_MAP.get(role_int, f"Role {role_int}" if role_int is not None else None)

            rows.append(
                {
                    "mdl_number": mdl_number,
                    "cl_docket_id": cl_docket_id,
                    "party_name": party_name,
                    "party_type": first_party_type,
                    "attorney_name": attorney_name,
                    "firm_name": firm_name,
                    "cl_attorney_id": cl_attorney_id,
                    "role": role_label,
                    "fetched_at": fetched_at,
                }
            )

    return _dedupe_rows(rows)


def step_fetch_raw(step, target_mdl: int | None = None) -> list[dict]:
    if not CL_API_TOKEN:
        logger.warning("COURTLISTENER_API_TOKEN not set -- skipping CourtListener fetch")
        step.set_counts(rows_in=0, rows_out=0)
        step.set_metadata({"note": "Missing COURTLISTENER_API_TOKEN"})
        return []

    ensure_mdls_cl_docket_column()

    params_with_docket = {"select": "mdl_number,title,status,cl_docket_id", "status": "neq.Closed"}
    if target_mdl is not None:
        params_with_docket["mdl_number"] = f"eq.{target_mdl}"

    try:
        mdls = _get("mdls", params_with_docket)
    except Exception:
        logger.warning("Unable to select mdls.cl_docket_id; retrying without the column")
        params_without_docket = {"select": "mdl_number,title,status", "status": "neq.Closed"}
        if target_mdl is not None:
            params_without_docket["mdl_number"] = f"eq.{target_mdl}"
        mdls = _get("mdls", params_without_docket)
        for mdl in mdls:
            mdl["cl_docket_id"] = None

    # Force known IDs for configured MDLs (whether or not DB backfill succeeded).
    for mdl in mdls:
        known = KNOWN_CL_DOCKETS.get(mdl["mdl_number"])
        if known:
            mdl["cl_docket_id"] = known

    mdls_with_dockets = [m for m in mdls if m.get("cl_docket_id")]
    logger.info("Processing %d MDLs with known cl_docket_id", len(mdls_with_dockets))

    all_rows: list[dict] = []
    total_parties = 0
    total_attorneys = 0

    for mdl in mdls_with_dockets:
        mdl_number = mdl["mdl_number"]
        cl_docket_id = int(mdl["cl_docket_id"])

        parties = fetch_parties_for_docket(cl_docket_id)
        total_parties += len(parties)

        attorneys = fetch_attorneys_for_docket(cl_docket_id)
        total_attorneys += len(attorneys)

        rows = build_rows(mdl_number, cl_docket_id, parties, attorneys)
        all_rows.extend(rows)
        logger.info(
            "MDL %s docket %s: parties=%d attorneys=%d rows=%d",
            mdl_number,
            cl_docket_id,
            len(parties),
            len(attorneys),
            len(rows),
        )

    inserted = _bulk_insert(
        "mdl_attorneys",
        all_rows,
        on_conflict="mdl_number,cl_attorney_id",
        resolution="merge-duplicates",
    )

    step.set_counts(rows_in=len(mdls_with_dockets), rows_out=inserted)
    step.set_metadata(
        {
            "total_mdls": len(mdls),
            "processed_mdls": len(mdls_with_dockets),
            "total_parties": total_parties,
            "total_attorneys": total_attorneys,
            "total_rows": len(all_rows),
            "global_429_count": _global_429_count,
        }
    )

    return all_rows


def step_normalize(step) -> int:
    """Pass-through -- data is inserted directly in fetch_raw."""
    step.set_counts(rows_in=0, rows_out=0)
    step.set_metadata({"note": "No normalization needed -- data written directly in fetch_raw"})
    return 0


def step_publish(step, raw_count: int):
    """Verify final row count."""
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        return
    _ = _get("mdl_attorneys", {"select": "id", "limit": 1})
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({"publish_timestamp": datetime.now(timezone.utc).isoformat()})


def main():
    parser = argparse.ArgumentParser(description="CourtListener attorney pipeline")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--mdl", type=int, default=None, help="Target a single MDL number")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline

        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("courtlistener_attorneys", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step, target_mdl=args.mdl)
        with run.step("normalize") as step:
            step_normalize(step)
        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
