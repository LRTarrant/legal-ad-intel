#!/usr/bin/env python3
"""
FAERS adverse-event ingest — Phase 3 of the CPSC -> FAERS -> MAUDE arc.

Endpoint: https://api.fda.gov/drug/event.json (openFDA FAERS).
  * Quarterly refresh upstream (faers.md §2). The FDA Aug 2025 daily-publication
    announcement has not yet propagated to the openFDA API cadence.
  * Total volume ~20M records; we ingest the `serious:1` subset only (~50%).
  * Skip cap = 25k per query — paginate via search_after cursor (PR-1's
    openfda_client.paginate_search_after, first production consumer here).

SOURCE FILTER — serious:1 ONLY:

    This pipeline ONLY ingests reports where the source flags `serious:1`.
    Tort signal is severity-driven (deaths, hospitalizations, disabilities,
    life-threatening, congenital anomalies); non-serious reports don't move
    intake or marketing decisions for plaintiff firms, so they're filtered
    at the source to keep year-1 storage inside the ~1.9 GB budget per
    faers.md §8.

    A future operator who wants research-grade data (e.g. disproportionality
    computation — ROR/PRR require a non-suspect denominator population) must:
      1. Drop the `serious:1` clause from SEARCH_BASE here.
      2. Re-budget storage (~2x volume per faers.md §4).
      3. Reconsider rate-limit budget for the larger backfill.
    The schema preserves the seriousness sub-flags so a partial widening
    (e.g. include death-only non-serious-coded reports) stays one filter
    change.

LAWYER FLOOD HANDLING:

    `primarysource_qualification` is preserved faithfully in the parent fact
    row, including code 4 = Lawyer. This pipeline does NOT filter or weight
    by qualification — that's a query-layer concern. PR-4/PR-5 surfaces
    apply `WHERE primarysource_qualification != 4` for the non-lawyer view
    and surface both views side-by-side. No pre-aggregated rollups in this
    PR (deferred to PR-5 when the watchlist needs sub-second latency).

DRUG NORMALIZATION (faers.md §3 — NDC labeler segments are deterministic):

    Match-fallback chain, strongest key wins:
        1. openfda.product_ndc[0]          -> 'ndc:<ndc>'
        2. openfda.unii[0]                 -> 'unii:<unii>'
        3. openfda.rxcui[0]                -> 'rxcui:<rxcui>'
        4. openfda.application_number[0]   -> 'appno:<num>'
        5. medicinalproduct (lowercased)   -> 'name:<text>'

    The first hit becomes `drugs.unique_match_key`; the prefix records the
    match path. A drug row is created exactly once per unique_match_key.
    Existing rows are NEVER updated on subsequent observations — analysts
    own the drug dimension's brand_names / generic_names arrays, the
    pipeline only ever ADDS new dims. No fuzzy matching, no cross-key
    reconciliation (faers.md §3: don't auto-merge above 0.85 without
    review). drug_adverse_event_drugs.drug_id is the resolved FK; remains
    NULL for child rows that match no path (no openfda enrichment AND no
    medicinalproduct text).

MANUFACTURER NORMALIZATION:

    The pipeline canonicalizes each element of `openfda.manufacturer_name[]`
    via `_canonicalize_name` (lower / trim / single-space) and counts
    `drug_manufacturer_aliases` misses for analyst review. Per the schema
    design, the raw openfda_manufacturer_name array is PRESERVED on the
    child row — the alias table is a lookup, not a rewrite layer.

MedDRA HANDLING (faers.md §5):

    openFDA exposes only the Preferred Term (`reactionmeddrapt`); SOC / HLT
    / LLT are not exposed and require a MedDRA license. Pipeline upserts
    distinct PTs into meddra_terms as it observes them. `pt_name_canonical`
    is `_canonicalize_name(pt_name)`; `first_seen_meddra_version` is
    captured on the first observation only.

PAGINATION:

    sort='receivedate:desc,receiptdate:desc' — receivedate alone collides
    when hundreds of thousands of reports share a date, so search_after on
    a single-field cursor would loop until the safety cap. We tried
    safetyreportid as the secondary sort first, but openFDA indexes it as
    a text (analyzed) field, not keyword (sortable) — the API returns HTTP
    500 with an "operations that require per-document field data ... are
    disabled by default" error. receiptdate is keyword-typed and works.
    Caveat: receivedate == receiptdate is common on initial-report cases
    where FDA stamps both fields the same day; less common on amended /
    follow-up reports. Frequency unknown without sampling. The pagination
    safety logic in lib/openfda_client.py (empty-cursor short-circuit)
    handles residual collisions cleanly so exact ratio doesn't matter for
    correctness.

RATE LIMIT BUDGET:

    With OPENFDA_API_KEY (240/min, 120k/day):
      * Steady-state weekly run (~0 records most weeks, ~200k once per
        quarterly refresh) — well under daily quota, ~10min wall time.
      * 2-year backfill (~1.6M serious records at page_size=100):
        ~16k requests, ~67min straight pagination + polite delay = ~80min.
    Without the API key the daily 1k cap kills the backfill on request
    #1001 — verify OPENFDA_API_KEY secret exists before dispatching.

Usage:
    python -m pipelines.faers_weekly --dry-run
    python -m pipelines.faers_weekly                          # 7-day rolling
    python -m pipelines.faers_weekly --backfill-since 2024-01-01
    python -m pipelines.faers_weekly --year 2024

Env:
    SUPABASE_URL               required
    SUPABASE_SERVICE_KEY       required
    OPENFDA_API_KEY            optional but strongly recommended
    OPENFDA_BASE_URL           optional; AEMS-cutover adapter
    DRY_RUN                    optional; "true" skips DB writes
    PIPELINE_TRIGGER           scheduled | manual (workflow sets this)
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.openfda_client import DRUG_EVENT_PATH, OpenFDAClient  # noqa: E402
from lib.pipeline import (  # noqa: E402
    DRY_RUN,
    PipelineRun,
    _bulk_insert,
    _canonicalize_name,
    _delete,
    _get,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# openFDA recommends limit<=1000 but 100/page is the sustainable default for
# long pagination loops (lower per-request payload, better resume granularity
# on flakiness, friendlier on the upstream).
PAGE_SIZE = 100

# Flush parents+children every BATCH_FLUSH_SIZE parents — bounds memory at
# ~500 records * ~5 KB/record ~= 2.5 MB peak. Tunable for backfill if a single
# 4MB Supabase payload is preferable (raise it) or stronger restart-granularity
# matters (lower it).
BATCH_FLUSH_SIZE = int(os.environ.get("FAERS_BATCH_FLUSH_SIZE", "500"))

# Steady-state rolling window — most weeks see ~0 new records because the
# upstream cadence is quarterly, but the small overlap protects against
# clock skew + refresh-publication latency.
DEFAULT_ROLLING_DAYS = 7

# Sort + base search expression.
# Compound sort: receivedate alone collides — hundreds of thousands of FAERS
# reports share a date, so a single-field cursor of "20260512" re-fetches the
# same page indefinitely. safetyreportid would be the natural tiebreaker (it's
# unique per report) but openFDA indexes it as TEXT (analyzed for full-text
# search) not KEYWORD (sortable), so attempting to sort by it returns HTTP 500
# with "operations that require per-document field data ... are disabled by
# default". receiptdate is keyword-typed and works as a tiebreaker. It doesn't
# fully eliminate collisions (initial reports share receivedate == receiptdate),
# but the empty-cursor short-circuit in paginate_search_after handles the
# residual case safely.
SORT_EXPR = "receivedate:desc,receiptdate:desc"
SEARCH_SEVERITY = "serious:1"


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _safe_date(raw: Any) -> str | None:
    """Parse FAERS YYYYMMDD (or ISO YYYY-MM-DD) -> 'YYYY-MM-DD' or None.

    Returns None for partial dates (YYYYMM, YYYY) and for malformed input.
    FAERS uses YYYYMMDD for receivedate/receiptdate/transmissiondate but
    drugstartdate/drugenddate can be partial — those are kept as text on
    the child row and don't pass through here.
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if len(s) == 8 and s.isdigit():
        try:
            return datetime.strptime(s, "%Y%m%d").date().isoformat()
        except ValueError:
            return None
    try:
        return datetime.strptime(s[:10], "%Y-%m-%d").date().isoformat()
    except ValueError:
        return None


def _to_bool_one(raw: Any) -> bool | None:
    """FAERS uses "1" for true on sub-flags; absent or anything else -> None.

    Top-level `serious` uses "1"=serious, "2"=non-serious — distinct from
    the sub-flags; see `_to_serious_bool`.
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if s == "1":
        return True
    if s == "":
        return None
    return False


def _to_serious_bool(raw: Any) -> bool | None:
    """Top-level serious flag: "1"=True, "2"=False."""
    if raw is None:
        return None
    s = str(raw).strip()
    if s == "1":
        return True
    if s == "2":
        return False
    return None


def _to_smallint(raw: Any) -> int | None:
    if raw is None:
        return None
    if isinstance(raw, bool):
        return int(raw)
    if isinstance(raw, int):
        return raw
    try:
        s = str(raw).strip()
        if not s:
            return None
        return int(float(s))
    except (TypeError, ValueError):
        return None


def _to_numeric(raw: Any) -> float | None:
    if raw is None:
        return None
    try:
        s = str(raw).strip()
        if not s:
            return None
        return float(s)
    except (TypeError, ValueError):
        return None


def _str_list(raw: Any) -> list[str]:
    """Coerce an openFDA-style array field to a clean list[str]. None/empty -> []."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(v).strip() for v in raw if v is not None and str(v).strip()]
    s = str(raw).strip()
    return [s] if s else []


def _nonempty(s: str | None) -> str | None:
    """Return s.strip() or None if empty."""
    if s is None:
        return None
    t = str(s).strip()
    return t or None


# ---------------------------------------------------------------------------
# Drug match-fallback chain
# ---------------------------------------------------------------------------

@dataclass
class DrugMatch:
    """Result of derive_drug_match for a single FAERS drug element."""

    unique_match_key: str
    match_path: str  # 'ndc' | 'unii' | 'rxcui' | 'appno' | 'name'
    seed: dict      # drug-row dict to insert if the key is new


def _drug_seed(openfda: dict, medicinalproduct: str | None) -> dict:
    """Build the public.drugs row seed from an openfda enrichment block."""
    brand_names = _str_list(openfda.get("brand_name"))
    generic_names = _str_list(openfda.get("generic_name"))
    substance_names = _str_list(openfda.get("substance_name"))
    uniis = _str_list(openfda.get("unii"))
    rxcuis = _str_list(openfda.get("rxcui"))
    appnos = _str_list(openfda.get("application_number"))

    # Canonical name preference: first brand -> first generic ->
    # lowercased medicinalproduct. Display name preserves the brand/generic
    # title-cased form for UI; falls back to medicinalproduct verbatim.
    display = brand_names[0] if brand_names else (
        generic_names[0] if generic_names else (medicinalproduct or "")
    )
    canonical = _canonicalize_name(display) or _canonicalize_name(medicinalproduct or "")

    return {
        "canonical_name": canonical,
        "display_name": display or None,
        "primary_brand_name": brand_names[0] if brand_names else None,
        "primary_generic_name": generic_names[0] if generic_names else None,
        "primary_unii": uniis[0] if uniis else None,
        "primary_rxcui": rxcuis[0] if rxcuis else None,
        "primary_application_number": appnos[0] if appnos else None,
        "brand_names": brand_names,
        "generic_names": generic_names,
        "substance_names": substance_names,
    }


def derive_drug_match(raw_drug: dict) -> DrugMatch | None:
    """Compute the drug's unique_match_key via NDC -> UNII -> RxCUI -> appno -> name.

    Returns None when no path matches — the drug element has no openfda
    enrichment AND no medicinalproduct text. Those records keep drug_id NULL
    on the child row.
    """
    openfda = raw_drug.get("openfda") or {}
    medicinalproduct = _nonempty(raw_drug.get("medicinalproduct"))

    ndcs = _str_list(openfda.get("product_ndc"))
    if ndcs:
        seed = _drug_seed(openfda, medicinalproduct)
        return DrugMatch(
            unique_match_key=f"ndc:{ndcs[0]}",
            match_path="ndc",
            seed={"unique_match_key": f"ndc:{ndcs[0]}", **seed},
        )

    uniis = _str_list(openfda.get("unii"))
    if uniis:
        seed = _drug_seed(openfda, medicinalproduct)
        return DrugMatch(
            unique_match_key=f"unii:{uniis[0]}",
            match_path="unii",
            seed={"unique_match_key": f"unii:{uniis[0]}", **seed},
        )

    rxcuis = _str_list(openfda.get("rxcui"))
    if rxcuis:
        seed = _drug_seed(openfda, medicinalproduct)
        return DrugMatch(
            unique_match_key=f"rxcui:{rxcuis[0]}",
            match_path="rxcui",
            seed={"unique_match_key": f"rxcui:{rxcuis[0]}", **seed},
        )

    appnos = _str_list(openfda.get("application_number"))
    if appnos:
        seed = _drug_seed(openfda, medicinalproduct)
        return DrugMatch(
            unique_match_key=f"appno:{appnos[0]}",
            match_path="appno",
            seed={"unique_match_key": f"appno:{appnos[0]}", **seed},
        )

    if medicinalproduct:
        canonical = _canonicalize_name(medicinalproduct)
        key = f"name:{canonical}"
        seed = _drug_seed(openfda, medicinalproduct)
        # When the only key is medicinalproduct, ensure the canonical_name
        # reflects that text (no openfda enrichment to draw from).
        seed["canonical_name"] = canonical
        seed["display_name"] = medicinalproduct
        return DrugMatch(
            unique_match_key=key,
            match_path="name",
            seed={"unique_match_key": key, **seed},
        )

    return None


# ---------------------------------------------------------------------------
# Per-report normalize
# ---------------------------------------------------------------------------

def normalize_report(
    raw: dict,
    *,
    drugs_index: dict[str, str],
    new_drugs: dict[str, dict],
    meddra_index: set[str],
    new_meddra_terms: dict[str, dict],
    alias_map: dict[str, str],
    stats: "IngestStats",
) -> dict | None:
    """Project a raw FAERS report into row dicts.

    Returns ``{"parent": ..., "drugs": [...], "reactions": [...]}`` or None
    if the report lacks a safetyreportid (the natural key). Child drug rows
    carry a temporary ``_match_key`` field that ``ingest_pages`` resolves to
    a real ``drug_id`` once the batch's new drugs are upserted.

    Side effects:
        * ``new_drugs`` accumulates seed dicts for unseen unique_match_keys.
        * ``new_meddra_terms`` accumulates seed dicts for unseen PTs.
        * ``stats`` counters are incremented (drug match paths,
          alias misses, unmatched-drug count).
    """
    sri = _nonempty(raw.get("safetyreportid"))
    if not sri:
        return None

    patient = raw.get("patient") or {}
    death_block = patient.get("patientdeath") or None

    parent = {
        "safetyreportid": sri,
        "safetyreportversion": _nonempty(raw.get("safetyreportversion")),
        "receivedate": _safe_date(raw.get("receivedate")),
        "receiptdate": _safe_date(raw.get("receiptdate")),
        "transmissiondate": _safe_date(raw.get("transmissiondate")),
        "serious": _to_serious_bool(raw.get("serious")),
        "seriousness_death": _to_bool_one(raw.get("seriousnessdeath")),
        "seriousness_hospitalization": _to_bool_one(raw.get("seriousnesshospitalization")),
        "seriousness_lifethreatening": _to_bool_one(raw.get("seriousnesslifethreatening")),
        "seriousness_disabling": _to_bool_one(raw.get("seriousnessdisabling")),
        "seriousness_congenital": _to_bool_one(raw.get("seriousnesscongenitalanomali")),
        "seriousness_other": _to_bool_one(raw.get("seriousnessother")),
        "primarysource_qualification": _to_smallint(
            (raw.get("primarysource") or {}).get("qualification")
        ),
        "primarysource_reportercountry": _nonempty(
            (raw.get("primarysource") or {}).get("reportercountry")
        ),
        "occurcountry": _nonempty(raw.get("occurcountry")),
        "sender_type": _to_smallint((raw.get("sender") or {}).get("sendertype")),
        "sender_organization": _nonempty(
            (raw.get("sender") or {}).get("senderorganization")
        ),
        "companynumb": _nonempty(raw.get("companynumb")),
        "patient_onset_age": _to_numeric(patient.get("patientonsetage")),
        "patient_onset_age_unit": _to_smallint(patient.get("patientonsetageunit")),
        "patient_sex": _to_smallint(patient.get("patientsex")),
        "patient_weight": _to_numeric(patient.get("patientweight")),
        "patient_died": True if death_block else None,
        "patient_death_date": _nonempty(
            (death_block or {}).get("patientdeathdate")
        ),
        "reporttype": _to_smallint(raw.get("reporttype")),
        "fulfillexpeditecriteria": _to_smallint(raw.get("fulfillexpeditecriteria")),
        "duplicate": _to_bool_one(raw.get("duplicate")),
        "raw_payload": raw,
    }
    # Clip primarysource_qualification to schema CHECK (1..5). openFDA has
    # historically returned values outside the documented range on a handful
    # of legacy AERS records — log it and store NULL rather than crash the
    # whole batch on a constraint violation.
    psq = parent["primarysource_qualification"]
    if psq is not None and not (1 <= psq <= 5):
        logger.warning(
            "Report %s primarysource_qualification=%r outside 1..5 — storing NULL",
            sri, psq,
        )
        parent["primarysource_qualification"] = None

    # Drugs
    drug_rows: list[dict] = []
    for seq, raw_drug in enumerate(patient.get("drug") or [], start=1):
        if not isinstance(raw_drug, dict):
            continue
        openfda = raw_drug.get("openfda") or {}
        match = derive_drug_match(raw_drug)

        if match is None:
            stats.unmatched_drugs += 1
        else:
            stats.drug_match_paths[match.match_path] += 1
            if (
                match.unique_match_key not in drugs_index
                and match.unique_match_key not in new_drugs
            ):
                new_drugs[match.unique_match_key] = match.seed

        # Manufacturer alias accounting — does not rewrite the openfda
        # array on the child row (audit fidelity matters here). We just
        # count misses for analyst review in the run metadata.
        for raw_manu in _str_list(openfda.get("manufacturer_name")):
            canonical = _canonicalize_name(raw_manu)
            if canonical and canonical not in alias_map:
                stats.alias_misses[canonical] += 1

        drugcharacterization = _to_smallint(raw_drug.get("drugcharacterization"))
        # Clip drugcharacterization to schema CHECK (1..3) — same guard as
        # primarysource_qualification above.
        if drugcharacterization is not None and not (1 <= drugcharacterization <= 3):
            drugcharacterization = None

        drug_rows.append({
            "drug_seq": seq,
            "drugcharacterization": drugcharacterization,
            "medicinalproduct": _nonempty(raw_drug.get("medicinalproduct")),
            "activesubstance_name": _nonempty(
                (raw_drug.get("activesubstance") or {}).get("activesubstancename")
            ),
            "drugindication": _nonempty(raw_drug.get("drugindication")),
            "drugadministrationroute": _nonempty(raw_drug.get("drugadministrationroute")),
            "drugdosagetext": _nonempty(raw_drug.get("drugdosagetext")),
            "drugdosageform": _nonempty(raw_drug.get("drugdosageform")),
            "drugstartdate": _nonempty(raw_drug.get("drugstartdate")),
            "drugenddate": _nonempty(raw_drug.get("drugenddate")),
            "actiondrug": _to_smallint(raw_drug.get("actiondrug")),
            "drugadditional": _to_smallint(raw_drug.get("drugadditional")),
            "drugauthorizationnumb": _nonempty(raw_drug.get("drugauthorizationnumb")),
            "openfda_brand_name": _str_list(openfda.get("brand_name")) or None,
            "openfda_generic_name": _str_list(openfda.get("generic_name")) or None,
            "openfda_substance_name": _str_list(openfda.get("substance_name")) or None,
            "openfda_manufacturer_name": _str_list(openfda.get("manufacturer_name")) or None,
            "openfda_product_ndc": _str_list(openfda.get("product_ndc")) or None,
            "openfda_spl_id": _str_list(openfda.get("spl_id")) or None,
            "openfda_spl_set_id": _str_list(openfda.get("spl_set_id")) or None,
            "openfda_application_number": _str_list(openfda.get("application_number")) or None,
            "openfda_rxcui": _str_list(openfda.get("rxcui")) or None,
            "openfda_unii": _str_list(openfda.get("unii")) or None,
            "openfda_pharm_class_epc": _str_list(openfda.get("pharm_class_epc")) or None,
            "openfda_pharm_class_moa": _str_list(openfda.get("pharm_class_moa")) or None,
            "openfda_pharm_class_pe": _str_list(openfda.get("pharm_class_pe")) or None,
            "openfda_pharm_class_cs": _str_list(openfda.get("pharm_class_cs")) or None,
            "openfda_route": _str_list(openfda.get("route")) or None,
            "openfda_product_type": _str_list(openfda.get("product_type")) or None,
            # Temporary — replaced with drug_id at flush time and popped
            # before the row is sent to PostgREST.
            "_match_key": match.unique_match_key if match else None,
        })

    # Reactions
    reaction_rows: list[dict] = []
    for seq, raw_reaction in enumerate(patient.get("reaction") or [], start=1):
        if not isinstance(raw_reaction, dict):
            continue
        pt = _nonempty(raw_reaction.get("reactionmeddrapt"))
        if not pt:
            # PT is NOT NULL in schema — skip the row.
            continue
        pt_canonical = _canonicalize_name(pt)
        version = _nonempty(raw_reaction.get("reactionmeddraversionpt"))
        if pt not in meddra_index and pt_canonical not in new_meddra_terms:
            new_meddra_terms[pt_canonical] = {
                "pt_name": pt,
                "pt_name_canonical": pt_canonical,
                "first_seen_meddra_version": version,
            }

        outcome = _to_smallint(raw_reaction.get("reactionoutcome"))
        if outcome is not None and not (1 <= outcome <= 6):
            outcome = None

        reaction_rows.append({
            "reaction_seq": seq,
            "reactionmeddrapt": pt,
            "reactionmeddraversionpt": version,
            "reactionoutcome": outcome,
        })

    return {
        "parent": parent,
        "drugs": drug_rows,
        "reactions": reaction_rows,
    }


# ---------------------------------------------------------------------------
# Compound cursor extractor for search_after pagination
# ---------------------------------------------------------------------------

def faers_compound_cursor(record: dict, sort_fields: list[str]) -> str | None:
    """Build a compound search_after cursor for FAERS.

    sort=receivedate:desc,receiptdate:desc -> "<receivedate>,<receiptdate>".
    Returns None if any required field is missing on the last record — that
    signals paginate_search_after to stop rather than loop forever.

    Note: the function itself is sort-field agnostic — it walks whatever
    paths the caller passes in. The sort-field choice is locked in
    SORT_EXPR above (see comment there for why safetyreportid is not
    usable as the secondary sort).
    """
    parts: list[str] = []
    for field_path in sort_fields:
        # Walk dotted path.
        cur: Any = record
        for seg in field_path.split("."):
            if not isinstance(cur, dict):
                cur = None
                break
            cur = cur.get(seg)
        if cur is None or cur == "":
            return None
        parts.append(str(cur))
    return ",".join(parts)


# ---------------------------------------------------------------------------
# Streaming ingest
# ---------------------------------------------------------------------------

@dataclass
class IngestStats:
    fetched: int = 0
    normalized: int = 0
    rejected: int = 0
    parents_written: int = 0
    drug_rows_written: int = 0
    reaction_rows_written: int = 0
    drugs_created: int = 0
    meddra_terms_created: int = 0
    unmatched_drugs: int = 0
    drug_match_paths: Counter = field(default_factory=Counter)
    alias_misses: Counter = field(default_factory=Counter)
    batches_flushed: int = 0


def _quote_for_in(values: Iterable[str]) -> str:
    """Build a PostgREST in.() payload with each value double-quoted.

    Unique_match_keys can contain commas (e.g. "name:tylenol, extra strength")
    so naive comma-joining breaks the filter.
    """
    quoted = []
    for v in values:
        escaped = str(v).replace('"', '""')
        quoted.append(f'"{escaped}"')
    return ",".join(quoted)


def load_alias_map() -> dict[str, str]:
    """Load drug_manufacturer_aliases -> {alias_text: canonical_name}."""
    rows = _get("drug_manufacturer_aliases", {
        "select": "alias_text,canonical_name",
        "limit": "100000",
    })
    return {r["alias_text"]: r["canonical_name"] for r in rows}


def load_drugs_index() -> dict[str, str]:
    """Load drugs -> {unique_match_key: drug_id}."""
    rows = _get("drugs", {
        "select": "id,unique_match_key",
        "limit": "200000",
    })
    return {r["unique_match_key"]: r["id"] for r in rows}


def load_meddra_index() -> set[str]:
    """Load meddra_terms -> {pt_name}.

    Used to skip the upsert when a PT has already been observed.
    """
    rows = _get("meddra_terms", {
        "select": "pt_name",
        "limit": "200000",
    })
    return {r["pt_name"] for r in rows}


def _fetch_resolved_drug_ids(keys: list[str]) -> dict[str, str]:
    """SELECT back drugs by unique_match_key in URL-length-safe chunks."""
    out: dict[str, str] = {}
    if not keys:
        return out
    # Conservative chunk size — PostgREST URLs cap around 8KB depending on
    # the proxy. 50 keys at typical sizes stays well under that.
    for i in range(0, len(keys), 50):
        chunk = keys[i:i + 50]
        rows = _get("drugs", {
            "select": "id,unique_match_key",
            "unique_match_key": f"in.({_quote_for_in(chunk)})",
        })
        for r in rows:
            out[r["unique_match_key"]] = r["id"]
    return out


def _fetch_parent_ids(safetyreportids: list[str]) -> dict[str, str]:
    """SELECT back drug_adverse_events by safetyreportid in chunks."""
    out: dict[str, str] = {}
    if not safetyreportids:
        return out
    for i in range(0, len(safetyreportids), 100):
        chunk = safetyreportids[i:i + 100]
        rows = _get("drug_adverse_events", {
            "select": "id,safetyreportid",
            "safetyreportid": f"in.({_quote_for_in(chunk)})",
        })
        for r in rows:
            out[r["safetyreportid"]] = r["id"]
    return out


def _delete_children_for(report_ids: list[str]) -> None:
    if not report_ids:
        return
    for table in ("drug_adverse_event_drugs", "drug_adverse_event_reactions"):
        for i in range(0, len(report_ids), 100):
            chunk = report_ids[i:i + 100]
            _delete(table, {"report_id": f"in.({','.join(chunk)})"})


def flush_batch(
    *,
    parents: list[dict],
    drug_children_by_sri: dict[str, list[dict]],
    reaction_children_by_sri: dict[str, list[dict]],
    new_drugs: dict[str, dict],
    new_meddra_terms: dict[str, dict],
    drugs_index: dict[str, str],
    meddra_index: set[str],
    stats: IngestStats,
) -> None:
    """Persist one batch: drugs -> meddra -> parents -> children. Mutates indexes."""
    if DRY_RUN:
        # In dry-run, _bulk_insert is a no-op log but we still want stats to
        # reflect intended work.
        stats.drugs_created += len(new_drugs)
        stats.meddra_terms_created += len(new_meddra_terms)
        stats.parents_written += len(parents)
        stats.drug_rows_written += sum(len(v) for v in drug_children_by_sri.values())
        stats.reaction_rows_written += sum(len(v) for v in reaction_children_by_sri.values())
        stats.batches_flushed += 1
        new_drugs.clear()
        new_meddra_terms.clear()
        return

    # 1. New drugs — ignore-duplicates so existing rows (and any analyst
    #    edits on brand_names / generic_names) are preserved.
    if new_drugs:
        drug_seed_rows = list(new_drugs.values())
        _bulk_insert(
            "drugs",
            drug_seed_rows,
            on_conflict="unique_match_key",
            resolution="ignore-duplicates",
            chunk_size=500,
        )
        resolved = _fetch_resolved_drug_ids(list(new_drugs.keys()))
        drugs_index.update(resolved)
        stats.drugs_created += len(new_drugs)
        new_drugs.clear()

    # 2. New meddra terms — pt_name unique, ignore-duplicates.
    if new_meddra_terms:
        _bulk_insert(
            "meddra_terms",
            list(new_meddra_terms.values()),
            on_conflict="pt_name",
            resolution="ignore-duplicates",
            chunk_size=500,
        )
        for term in new_meddra_terms.values():
            meddra_index.add(term["pt_name"])
        stats.meddra_terms_created += len(new_meddra_terms)
        new_meddra_terms.clear()

    if not parents:
        stats.batches_flushed += 1
        return

    # 3. Parents — upsert on safetyreportid with merge-duplicates so
    #    re-fetches (newer safetyreportversion) overwrite the prior row.
    _bulk_insert(
        "drug_adverse_events",
        parents,
        on_conflict="safetyreportid",
        resolution="merge-duplicates",
        chunk_size=500,
    )
    stats.parents_written += len(parents)

    # 4. Look up parent ids so child rows can be wired.
    sri_list = [p["safetyreportid"] for p in parents]
    sri_to_id = _fetch_parent_ids(sri_list)

    # 5. Delete existing children for refreshed parents.
    parent_ids = [sri_to_id[s] for s in sri_list if s in sri_to_id]
    _delete_children_for(parent_ids)

    # 6. Wire and insert children. Resolve _match_key -> drug_id for any
    #    drug rows still pending (key was in new_drugs at normalize time).
    drug_child_rows: list[dict] = []
    reaction_child_rows: list[dict] = []
    for sri in sri_list:
        report_id = sri_to_id.get(sri)
        if not report_id:
            # Should be impossible after a successful upsert + select, but
            # guard against partial PostgREST eventual-consistency to keep
            # the batch from corrupting on a stale read.
            continue
        for child in drug_children_by_sri.get(sri, []):
            match_key = child.pop("_match_key", None)
            child["drug_id"] = drugs_index.get(match_key) if match_key else None
            child["report_id"] = report_id
            drug_child_rows.append(child)
        for child in reaction_children_by_sri.get(sri, []):
            child["report_id"] = report_id
            reaction_child_rows.append(child)

    if drug_child_rows:
        _bulk_insert("drug_adverse_event_drugs", drug_child_rows, chunk_size=500)
        stats.drug_rows_written += len(drug_child_rows)
    if reaction_child_rows:
        _bulk_insert(
            "drug_adverse_event_reactions",
            reaction_child_rows,
            chunk_size=500,
        )
        stats.reaction_rows_written += len(reaction_child_rows)

    stats.batches_flushed += 1


def ingest_pages(
    *,
    client: OpenFDAClient,
    search: str,
    sort: str = SORT_EXPR,
    page_size: int = PAGE_SIZE,
    batch_flush_size: int = BATCH_FLUSH_SIZE,
    max_pages: int = 100_000,
    alias_map: dict[str, str],
    drugs_index: dict[str, str],
    meddra_index: set[str],
    progress_log_every: int = 20,
) -> IngestStats:
    """Stream FAERS pages, normalize, flush per batch. Returns aggregate stats."""
    stats = IngestStats()
    new_drugs: dict[str, dict] = {}
    new_meddra_terms: dict[str, dict] = {}
    parent_buffer: list[dict] = []
    drug_children_by_sri: dict[str, list[dict]] = {}
    reaction_children_by_sri: dict[str, list[dict]] = {}

    def _flush():
        flush_batch(
            parents=parent_buffer,
            drug_children_by_sri=drug_children_by_sri,
            reaction_children_by_sri=reaction_children_by_sri,
            new_drugs=new_drugs,
            new_meddra_terms=new_meddra_terms,
            drugs_index=drugs_index,
            meddra_index=meddra_index,
            stats=stats,
        )
        parent_buffer.clear()
        drug_children_by_sri.clear()
        reaction_children_by_sri.clear()

    pages = 0
    for page_results, _total in client.paginate_search_after(
        DRUG_EVENT_PATH,
        search,
        sort=sort,
        page_size=page_size,
        max_pages=max_pages,
        compound_cursor_extractor=faers_compound_cursor,
    ):
        pages += 1
        for raw in page_results:
            stats.fetched += 1
            normalized = normalize_report(
                raw,
                drugs_index=drugs_index,
                new_drugs=new_drugs,
                meddra_index=meddra_index,
                new_meddra_terms=new_meddra_terms,
                alias_map=alias_map,
                stats=stats,
            )
            if normalized is None:
                stats.rejected += 1
                continue
            stats.normalized += 1
            sri = normalized["parent"]["safetyreportid"]
            parent_buffer.append(normalized["parent"])
            drug_children_by_sri[sri] = normalized["drugs"]
            reaction_children_by_sri[sri] = normalized["reactions"]

        if len(parent_buffer) >= batch_flush_size:
            _flush()

        if pages % progress_log_every == 0:
            logger.info(
                "FAERS ingest progress: %d pages, %d fetched, %d normalized, "
                "%d rejected, %d batches flushed",
                pages, stats.fetched, stats.normalized,
                stats.rejected, stats.batches_flushed,
            )

    # Tail flush
    if parent_buffer or new_drugs or new_meddra_terms:
        _flush()

    return stats


# ---------------------------------------------------------------------------
# Window resolution + search assembly
# ---------------------------------------------------------------------------

def resolve_window(
    *,
    backfill_since: str | None,
    year: int | None,
    rolling_days: int,
) -> tuple[date, date]:
    """Return (start, end) inclusive. End defaults to today (UTC)."""
    today = datetime.now(timezone.utc).date()
    if year is not None:
        return date(year, 1, 1), date(year, 12, 31)
    if backfill_since:
        try:
            since = datetime.strptime(backfill_since, "%Y-%m-%d").date()
        except ValueError as e:
            raise SystemExit(f"--backfill-since must be YYYY-MM-DD: {e}")
        return since, today
    return today - timedelta(days=rolling_days), today


def build_search(window_start: date, window_end: date) -> str:
    """Assemble the openFDA search expression for a window.

    Format per faers.md §4:
        serious:1+AND+receivedate:[YYYYMMDD+TO+YYYYMMDD]
    httpx URL-encodes the `+` and `[`/`]` as needed.
    """
    start = window_start.strftime("%Y%m%d")
    end = window_end.strftime("%Y%m%d")
    return f"{SEARCH_SEVERITY} AND receivedate:[{start} TO {end}]"


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
                    help="Backfill from this receivedate (overrides rolling window). "
                         "Recommended one-shot manual: 2024-01-01.")
    ap.add_argument("--year", type=int, default=None,
                    help="Backfill a single calendar year by receivedate.")
    ap.add_argument("--rolling-days", type=int, default=DEFAULT_ROLLING_DAYS,
                    help=f"Steady-state rolling window (default {DEFAULT_ROLLING_DAYS}).")
    ap.add_argument("--max-pages", type=int, default=100_000,
                    help="Safety cap on total pages fetched (default 100k).")
    ap.add_argument("--page-size", type=int, default=PAGE_SIZE,
                    help=f"openFDA limit= per request (default {PAGE_SIZE}).")
    args = ap.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        # Re-import so PipelineRun / _bulk_insert pick up the new DRY_RUN flag.
        import importlib
        import lib.pipeline as _p
        importlib.reload(_p)

    start, end = resolve_window(
        backfill_since=args.backfill_since,
        year=args.year,
        rolling_days=args.rolling_days,
    )
    search = build_search(start, end)

    client = OpenFDAClient()
    if not client.api_key:
        logger.warning(
            "OPENFDA_API_KEY not set — anonymous rate limit (1k/day) will "
            "block any backfill beyond ~1000 requests. Set the secret before "
            "dispatching --backfill-since.",
        )

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")
    with PipelineRun(
        "faers_weekly",
        trigger=trigger,
        metadata={
            "window_start": start.isoformat(),
            "window_end": end.isoformat(),
            "endpoint_base": client.base_url,
            "endpoint_path": DRUG_EVENT_PATH,
            "search": search,
            "sort": SORT_EXPR,
            "page_size": args.page_size,
            "api_key_present": bool(client.api_key),
        },
    ) as run:
        with run.step("fetch_raw") as step:
            # Peek total hits so the operator sees scope before the big loop.
            _first, total_hits = client.fetch_page(
                DRUG_EVENT_PATH, search,
                limit=1, skip=None, sort=SORT_EXPR,
            )
            step.set_metadata({
                "endpoint_total_hits": total_hits,
                "window_start": start.isoformat(),
                "window_end": end.isoformat(),
            })
            step.set_counts(rows_in=0, rows_out=total_hits)

        with run.step("normalize") as step:
            alias_map = load_alias_map() if not DRY_RUN else {}
            drugs_index = load_drugs_index() if not DRY_RUN else {}
            meddra_index = load_meddra_index() if not DRY_RUN else set()
            step.set_metadata({
                "alias_map_size": len(alias_map),
                "drugs_index_size": len(drugs_index),
                "meddra_index_size": len(meddra_index),
            })
            # Normalization is interleaved with publish (streaming). The
            # actual normalized counter is set on the publish step below.
            step.set_counts(rows_in=0, rows_out=0)

        with run.step("publish") as step:
            stats = ingest_pages(
                client=client,
                search=search,
                sort=SORT_EXPR,
                page_size=args.page_size,
                batch_flush_size=BATCH_FLUSH_SIZE,
                max_pages=args.max_pages,
                alias_map=alias_map,
                drugs_index=drugs_index,
                meddra_index=meddra_index,
            )
            step.set_counts(
                rows_in=stats.fetched,
                rows_out=stats.parents_written,
                rows_rejected=stats.rejected,
            )
            step.set_metadata({
                "fetched": stats.fetched,
                "normalized": stats.normalized,
                "rejected": stats.rejected,
                "parents_written": stats.parents_written,
                "drug_rows_written": stats.drug_rows_written,
                "reaction_rows_written": stats.reaction_rows_written,
                "drugs_created": stats.drugs_created,
                "meddra_terms_created": stats.meddra_terms_created,
                "unmatched_drugs": stats.unmatched_drugs,
                "drug_match_paths": dict(stats.drug_match_paths),
                "top_alias_misses": stats.alias_misses.most_common(20),
                "batches_flushed": stats.batches_flushed,
            })

    return 0


if __name__ == "__main__":
    sys.exit(main())
