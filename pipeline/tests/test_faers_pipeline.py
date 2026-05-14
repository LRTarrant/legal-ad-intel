"""Tests for pipelines.faers_weekly — parsing, drug match, MedDRA, pagination.

All tests mock HTTP and Supabase at the boundary; no live API calls.
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# lib.pipeline reads env at import — provide harmless placeholders.
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-key")

from lib.openfda_client import OpenFDAClient  # noqa: E402
from lib.pipeline import _canonicalize_name  # noqa: E402
from pipelines.faers_weekly import (  # noqa: E402
    IngestStats,
    SORT_EXPR,
    _quote_for_in,
    _safe_date,
    _str_list,
    _to_bool_one,
    _to_serious_bool,
    _to_smallint,
    build_search,
    derive_drug_match,
    faers_compound_cursor,
    ingest_pages,
    normalize_report,
    resolve_window,
)

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "faers"


def _load(name: str) -> dict:
    return json.loads((FIXTURE_DIR / name).read_text())


def _fresh_state():
    """Return a fresh tuple of (drugs_index, new_drugs, meddra_index, new_meddra_terms, alias_map, stats)."""
    return ({}, {}, set(), {}, {}, IngestStats())


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

class TestSafeDate:
    def test_yyyymmdd(self):
        assert _safe_date("20260301") == "2026-03-01"

    def test_iso(self):
        assert _safe_date("2026-03-01") == "2026-03-01"

    def test_partial_yyyymm_returns_none(self):
        # Partial dates aren't valid full dates; receivedate fields are
        # always YYYYMMDD per faers.md §1.
        assert _safe_date("202603") is None

    def test_empty(self):
        assert _safe_date("") is None
        assert _safe_date(None) is None

    def test_malformed(self):
        assert _safe_date("notadate") is None
        assert _safe_date("99999999") is None


class TestBoolHelpers:
    def test_to_bool_one(self):
        assert _to_bool_one("1") is True
        assert _to_bool_one("2") is False
        assert _to_bool_one("0") is False
        assert _to_bool_one(None) is None
        assert _to_bool_one("") is None

    def test_to_serious_bool(self):
        # serious uses 1=True, 2=False — distinct from sub-flags.
        assert _to_serious_bool("1") is True
        assert _to_serious_bool("2") is False
        assert _to_serious_bool(None) is None
        # Anything else (legacy / corrupt) returns None, not False.
        assert _to_serious_bool("3") is None


class TestToSmallint:
    def test_str_int(self):
        assert _to_smallint("4") == 4

    def test_int_passthrough(self):
        assert _to_smallint(7) == 7

    def test_float_str(self):
        assert _to_smallint("3.0") == 3

    def test_empty(self):
        assert _to_smallint("") is None
        assert _to_smallint(None) is None

    def test_garbage(self):
        assert _to_smallint("abc") is None


class TestStrList:
    def test_list_passthrough(self):
        assert _str_list(["A", "B"]) == ["A", "B"]

    def test_strips_and_drops_empty(self):
        assert _str_list(["A", "", " B "]) == ["A", "B"]

    def test_none(self):
        assert _str_list(None) == []

    def test_string_wraps(self):
        # Robustness: some openFDA fields rarely emit a scalar instead of array.
        assert _str_list("solo") == ["solo"]


# ---------------------------------------------------------------------------
# Drug match-fallback chain (faers.md §3)
# ---------------------------------------------------------------------------

class TestDeriveDrugMatch:
    def test_ndc_wins(self):
        match = derive_drug_match({
            "medicinalproduct": "OZEMPIC",
            "openfda": {
                "product_ndc": ["0169-4130", "0169-4140"],
                "unii": ["53AXN4NNHX"],
                "rxcui": ["1991302"],
                "application_number": ["NDA209637"],
                "brand_name": ["Ozempic"],
                "generic_name": ["SEMAGLUTIDE"],
            },
        })
        assert match is not None
        assert match.match_path == "ndc"
        assert match.unique_match_key == "ndc:0169-4130"
        assert match.seed["primary_unii"] == "53AXN4NNHX"
        assert match.seed["primary_brand_name"] == "Ozempic"

    def test_falls_through_to_unii_when_no_ndc(self):
        match = derive_drug_match({
            "medicinalproduct": "EXPERIMENTAL",
            "openfda": {"unii": ["ABC123"], "rxcui": ["999"]},
        })
        assert match.match_path == "unii"
        assert match.unique_match_key == "unii:ABC123"

    def test_falls_through_to_rxcui_when_no_unii(self):
        match = derive_drug_match({
            "medicinalproduct": "ASPIRIN",
            "openfda": {"rxcui": ["1191"]},
        })
        assert match.match_path == "rxcui"
        assert match.unique_match_key == "rxcui:1191"

    def test_falls_through_to_appno(self):
        match = derive_drug_match({
            "medicinalproduct": "ANCIENT DRUG",
            "openfda": {"application_number": ["NDA000123"]},
        })
        assert match.match_path == "appno"
        assert match.unique_match_key == "appno:NDA000123"

    def test_name_fallback_when_no_openfda(self):
        match = derive_drug_match({
            "medicinalproduct": "Dipirona Sodica 500mg",
            "openfda": {},
        })
        assert match.match_path == "name"
        assert match.unique_match_key == "name:dipirona sodica 500mg"
        assert match.seed["canonical_name"] == "dipirona sodica 500mg"
        assert match.seed["display_name"] == "Dipirona Sodica 500mg"

    def test_no_match_when_nothing_to_key_on(self):
        # Empty medicinalproduct, no openfda — nothing to anchor a drug row to.
        match = derive_drug_match({"medicinalproduct": "", "openfda": {}})
        assert match is None

    def test_name_canonical_lowercase_collapses_whitespace(self):
        match = derive_drug_match({
            "medicinalproduct": "  TYLENOL   EXTRA   STRENGTH  ",
            "openfda": {},
        })
        assert match.unique_match_key == "name:tylenol extra strength"

    def test_seed_carries_all_enrichment(self):
        match = derive_drug_match({
            "medicinalproduct": "MOUNJARO",
            "openfda": {
                "product_ndc": ["0002-1434"],
                "brand_name": ["Mounjaro"],
                "generic_name": ["TIRZEPATIDE"],
                "substance_name": ["TIRZEPATIDE"],
                "rxcui": ["2601723"],
                "unii": ["8X4MJD5GMS"],
                "application_number": ["NDA215866"],
            },
        })
        seed = match.seed
        assert seed["unique_match_key"] == "ndc:0002-1434"
        assert seed["primary_rxcui"] == "2601723"
        assert seed["primary_unii"] == "8X4MJD5GMS"
        assert seed["primary_application_number"] == "NDA215866"
        assert seed["brand_names"] == ["Mounjaro"]
        assert seed["generic_names"] == ["TIRZEPATIDE"]


# ---------------------------------------------------------------------------
# normalize_report — per-fixture
# ---------------------------------------------------------------------------

class TestNormalizeReport:
    def test_serious_report_parses_all_fields(self):
        raw = _load("serious_report.json")
        drugs_index, new_drugs, meddra_index, new_meddra_terms, alias_map, stats = _fresh_state()
        out = normalize_report(
            raw,
            drugs_index=drugs_index, new_drugs=new_drugs,
            meddra_index=meddra_index, new_meddra_terms=new_meddra_terms,
            alias_map=alias_map, stats=stats,
        )
        assert out is not None
        p = out["parent"]
        assert p["safetyreportid"] == "10000001-1"
        assert p["safetyreportversion"] == "1"
        assert p["receivedate"] == "2026-03-01"
        assert p["serious"] is True
        assert p["seriousness_death"] is True
        assert p["seriousness_hospitalization"] is True
        # Not present in source → None, not False.
        assert p["seriousness_lifethreatening"] is None
        assert p["primarysource_qualification"] == 1
        assert p["patient_died"] is True
        assert p["patient_death_date"] == "20260227"
        # raw_payload preserved verbatim
        assert p["raw_payload"]["safetyreportid"] == "10000001-1"

        # Single drug, NDC-matched, single reaction
        assert len(out["drugs"]) == 1
        d = out["drugs"][0]
        assert d["drug_seq"] == 1
        assert d["drugcharacterization"] == 1
        assert d["medicinalproduct"] == "OZEMPIC"
        assert d["openfda_manufacturer_name"] == ["Novo Nordisk Inc."]
        assert d["_match_key"] == "ndc:0169-4130"

        assert len(out["reactions"]) == 1
        r = out["reactions"][0]
        assert r["reactionmeddrapt"] == "Optic ischaemic neuropathy"
        assert r["reactionoutcome"] == 5

        # Side effects
        assert "ndc:0169-4130" in new_drugs
        assert stats.drug_match_paths["ndc"] == 1

    def test_lawyer_sourced_preserves_qualification_4(self):
        """Lawyer-flood handling lives in queries — pipeline must preserve the value."""
        raw = _load("lawyer_sourced_report.json")
        out = normalize_report(
            raw,
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        assert out["parent"]["primarysource_qualification"] == 4
        # Schema-preservation, NOT filtering: row still flows through.
        assert out["parent"]["safetyreportid"] == "10000003-1"

    def test_non_serious_report_serious_false(self):
        raw = _load("non_serious_report.json")
        out = normalize_report(
            raw,
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        assert out["parent"]["serious"] is False
        assert out["parent"]["primarysource_qualification"] == 5

    def test_multi_drug_report_match_paths_recorded(self):
        raw = _load("multi_drug_report.json")
        stats = IngestStats()
        new_drugs: dict = {}
        out = normalize_report(
            raw,
            drugs_index={}, new_drugs=new_drugs,
            meddra_index=set(), new_meddra_terms={}, alias_map={},
            stats=stats,
        )
        assert len(out["drugs"]) == 3
        # Mounjaro: ndc; Metformin: ndc; Lisinopril: rxcui (no NDC, no UNII match)
        # Actually lisinopril has unii ('E7199S1YWR') so unii wins over rxcui
        assert stats.drug_match_paths == Counter({"ndc": 2, "unii": 1})
        assert len(new_drugs) == 3

    def test_multi_reaction_with_empty_pt_skipped(self):
        raw = _load("multi_reaction_report.json")
        out = normalize_report(
            raw,
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        # Source has 4 reaction blocks; one has empty PT, schema says NOT NULL — skipped.
        assert len(out["reactions"]) == 3
        pts = [r["reactionmeddrapt"] for r in out["reactions"]]
        assert "Suicidal ideation" in pts
        assert "Depression" in pts
        assert "Insomnia" in pts
        assert "" not in pts

    def test_partial_dates_kept_as_text(self):
        """drugstartdate/drugenddate are partial (YYYYMM, YYYY) — schema keeps text."""
        raw = _load("partial_date_report.json")
        out = normalize_report(
            raw,
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        d = out["drugs"][0]
        assert d["drugstartdate"] == "201808"   # YYYYMM preserved verbatim
        assert d["drugenddate"] == "2024"       # YYYY preserved verbatim
        # receivedate is a full date — does normalize to ISO
        assert out["parent"]["receivedate"] == "2026-04-30"

    def test_no_openfda_falls_to_name_match(self):
        """When openfda block is absent, fall back to lowercased medicinalproduct."""
        raw = _load("no_openfda_report.json")
        stats = IngestStats()
        out = normalize_report(
            raw,
            drugs_index={}, new_drugs={},
            meddra_index=set(), new_meddra_terms={}, alias_map={},
            stats=stats,
        )
        # Two drug elements: one with medicinalproduct (name fallback),
        # one with empty medicinalproduct (no match at all).
        assert len(out["drugs"]) == 2
        first = out["drugs"][0]
        assert first["_match_key"] == "name:dipirona sodica 500mg"
        second = out["drugs"][1]
        assert second["_match_key"] is None
        assert stats.drug_match_paths == Counter({"name": 1})
        assert stats.unmatched_drugs == 1

    def test_missing_safetyreportid_rejected(self):
        raw = _load("no_safetyreportid_report.json")
        out = normalize_report(
            raw,
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        assert out is None

    def test_meddra_observation(self):
        raw = _load("multi_reaction_report.json")
        new_meddra_terms: dict = {}
        normalize_report(
            raw,
            drugs_index={}, new_drugs={},
            meddra_index=set(), new_meddra_terms=new_meddra_terms,
            alias_map={}, stats=IngestStats(),
        )
        # All three valid PTs are queued for upsert.
        pts = {term["pt_name"] for term in new_meddra_terms.values()}
        assert pts == {"Suicidal ideation", "Depression", "Insomnia"}
        # first_seen_meddra_version is captured from the source.
        ins = next(t for t in new_meddra_terms.values() if t["pt_name"] == "Insomnia")
        assert ins["first_seen_meddra_version"] == "27.1"
        # pt_name_canonical is the canonical form.
        assert ins["pt_name_canonical"] == "insomnia"

    def test_meddra_skipped_when_already_in_index(self):
        new_meddra_terms: dict = {}
        normalize_report(
            _load("serious_report.json"),
            drugs_index={}, new_drugs={},
            meddra_index={"Optic ischaemic neuropathy"},  # already seen
            new_meddra_terms=new_meddra_terms,
            alias_map={}, stats=IngestStats(),
        )
        assert new_meddra_terms == {}

    def test_manufacturer_alias_miss_counted(self):
        """When openfda.manufacturer_name has no alias entry, miss is counted."""
        stats = IngestStats()
        normalize_report(
            _load("serious_report.json"),
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=stats,
        )
        # Canonical form of 'Novo Nordisk Inc.' under _canonicalize_name
        # is just the lowercased-trimmed version (no legal-suffix
        # stripping — FAERS canonicalize_name does not strip suffixes).
        assert stats.alias_misses == Counter({"novo nordisk inc.": 1})

    def test_manufacturer_alias_hit_not_counted_as_miss(self):
        stats = IngestStats()
        alias_map = {"novo nordisk inc.": "Novo Nordisk Inc."}
        normalize_report(
            _load("serious_report.json"),
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map=alias_map, stats=stats,
        )
        assert stats.alias_misses == Counter()

    def test_version_two_replaces_version_one_intent(self):
        """Re-fetched report with safetyreportversion=2 keeps same natural key."""
        out_v1 = normalize_report(
            _load("serious_report.json"),
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        out_v2 = normalize_report(
            _load("version_two_report.json"),
            drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        # Same natural key — upsert path collapses them.
        assert out_v1["parent"]["safetyreportid"] == out_v2["parent"]["safetyreportid"]
        # But version field changes — published row will carry v2.
        assert out_v1["parent"]["safetyreportversion"] == "1"
        assert out_v2["parent"]["safetyreportversion"] == "2"
        # v2 added a second reaction (Blindness unilateral).
        assert len(out_v2["reactions"]) == 2

    def test_qualification_outside_check_range_nulled(self):
        """primarysource_qualification CHECK is 1..5; out-of-range -> NULL."""
        raw = _load("serious_report.json")
        raw["primarysource"]["qualification"] = "99"
        out = normalize_report(
            raw, drugs_index={}, new_drugs={}, meddra_index=set(),
            new_meddra_terms={}, alias_map={}, stats=IngestStats(),
        )
        assert out["parent"]["primarysource_qualification"] is None


# ---------------------------------------------------------------------------
# Compound cursor extractor (the FAERS-driven edge case)
# ---------------------------------------------------------------------------

class TestCompoundCursor:
    def test_basic_compound(self):
        rec = {"receivedate": "20260512", "receiptdate": "20260510"}
        c = faers_compound_cursor(rec, ["receivedate", "receiptdate"])
        assert c == "20260512,20260510"

    def test_missing_field_returns_none(self):
        """Missing field stops pagination (signal back to paginate_search_after)."""
        rec = {"receivedate": "20260512"}
        assert faers_compound_cursor(rec, ["receivedate", "receiptdate"]) is None

    def test_empty_field_returns_none(self):
        rec = {"receivedate": "", "receiptdate": "20260510"}
        assert faers_compound_cursor(rec, ["receivedate", "receiptdate"]) is None

    def test_sort_expr_does_not_use_safetyreportid(self):
        """Regression guard for the live HTTP 500 we hit in workflow_dispatch.

        openFDA indexes safetyreportid as a text (analyzed) field, not
        keyword (sortable). Any attempt to sort by it returns:
            "Text fields are not optimised for operations that require
            per-document field data like aggregations and sorting..."
        This bug must never recur — assert the sort string doesn't mention it.
        """
        assert "safetyreportid" not in SORT_EXPR
        assert "receivedate" in SORT_EXPR  # primary sort still in place
        assert "receiptdate" in SORT_EXPR  # current tiebreaker


# ---------------------------------------------------------------------------
# paginate_search_after integration with compound cursor (the new code path)
# ---------------------------------------------------------------------------

class TestPaginateSearchAfterCompound:
    def test_compound_cursor_is_assembled_and_passed(self):
        """The compound extractor builds the cursor; the next request carries it."""
        client = OpenFDAClient(api_key="", retry_delays=(0,))
        captured: list[dict] = []

        # Page one: 100 records all sharing receivedate=20260512 but with
        # varying receiptdate — exactly the collision scenario the compound
        # cursor is designed to defeat. (safetyreportid would be ideal as
        # the tiebreaker but openFDA indexes it as unsortable text — see
        # SORT_EXPR comment in faers_weekly.py.)
        page_one = [
            {"receivedate": "20260512", "receiptdate": f"2026050{i % 10}"}
            for i in range(100)
        ]
        # Page two: 1 record (short → paginator stops after this).
        page_two = [{"receivedate": "20260511", "receiptdate": "20260509"}]

        def fake_get(url, params, timeout):
            captured.append(dict(params))
            r = MagicMock(spec=httpx.Response)
            r.status_code = 200
            r.request = MagicMock(spec=httpx.Request)
            r.raise_for_status.return_value = None
            if "search_after" not in params:
                r.json.return_value = {"results": page_one, "meta": {"results": {"total": 101}}}
            else:
                r.json.return_value = {"results": page_two, "meta": {"results": {"total": 101}}}
            return r

        with patch("lib.openfda_client.httpx.get", side_effect=fake_get), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_search_after(
                "/drug/event.json",
                "serious:1",
                sort=SORT_EXPR,
                page_size=100,
                compound_cursor_extractor=faers_compound_cursor,
            ))

        assert len(pages) == 2
        # Without the compound extractor the cursor would have been
        # "20260512" — same as the value all 100 page-one records share —
        # and we'd have re-fetched the same page. The compound cursor
        # appends the LAST record's receiptdate (page_one[99] → "20260509")
        # to break the tie.
        assert captured[1]["search_after"] == "20260512,20260509"
        assert captured[1]["sort"] == SORT_EXPR

    def test_compound_extractor_returning_none_stops_pagination(self):
        """If the last record lacks a cursor field, pagination halts."""
        client = OpenFDAClient(api_key="", retry_delays=(0,))
        page_one = [{"receivedate": "20260512"} for _ in range(100)]  # no receiptdate

        def fake_get(url, params, timeout):
            r = MagicMock(spec=httpx.Response)
            r.status_code = 200
            r.request = MagicMock(spec=httpx.Request)
            r.raise_for_status.return_value = None
            r.json.return_value = {"results": page_one, "meta": {"results": {"total": 999}}}
            return r

        with patch("lib.openfda_client.httpx.get", side_effect=fake_get), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_search_after(
                "/drug/event.json",
                "serious:1",
                sort=SORT_EXPR,
                page_size=100,
                max_pages=10,
                compound_cursor_extractor=faers_compound_cursor,
            ))
        # Stops after one page because the compound extractor returns None
        # (receiptdate missing on every record in page one).
        assert len(pages) == 1


# ---------------------------------------------------------------------------
# ingest_pages integration — runs through the streaming path end-to-end
# with mocked HTTP and DB.
# ---------------------------------------------------------------------------

class TestIngestPagesIntegration:
    def test_full_flow_with_mocked_http_and_db(self):
        """One real page → normalize → flush → counters reflect the writes."""
        client = OpenFDAClient(api_key="", retry_delays=(0,))

        # Build a page with two distinct records (different SRIs).
        page = [_load("serious_report.json"), _load("multi_drug_report.json")]

        def fake_get(url, params, timeout):
            r = MagicMock(spec=httpx.Response)
            r.status_code = 200
            r.request = MagicMock(spec=httpx.Request)
            r.raise_for_status.return_value = None
            # First call: full page; subsequent: short page so paginator halts.
            if "search_after" not in params:
                r.json.return_value = {"results": page, "meta": {"results": {"total": 2}}}
            else:
                r.json.return_value = {"results": [], "meta": {"results": {"total": 2}}}
            return r

        write_log: list[tuple[str, int]] = []

        def fake_bulk_insert(table, rows, **_kw):
            write_log.append((table, len(rows)))
            return len(rows)

        def fake_get_table(table, params):
            # _fetch_resolved_drug_ids and _fetch_parent_ids hit _get.
            # Return synthetic mappings so wiring works.
            if table == "drugs":
                keys = params.get("unique_match_key", "")
                if keys.startswith("in.("):
                    # Strip 'in.(' and ')' and split by quoted entries.
                    return [
                        {"id": f"drug-uuid-{i}", "unique_match_key": k}
                        for i, k in enumerate(_extract_in(keys))
                    ]
                return []
            if table == "drug_adverse_events":
                sris = _extract_in(params.get("safetyreportid", ""))
                return [
                    {"id": f"report-uuid-{i}", "safetyreportid": s}
                    for i, s in enumerate(sris)
                ]
            return []

        with patch("lib.openfda_client.httpx.get", side_effect=fake_get), \
             patch("lib.openfda_client.time.sleep"), \
             patch("pipelines.faers_weekly._bulk_insert", side_effect=fake_bulk_insert), \
             patch("pipelines.faers_weekly._get", side_effect=fake_get_table), \
             patch("pipelines.faers_weekly._delete"):
            stats = ingest_pages(
                client=client,
                search="serious:1",
                page_size=100,
                batch_flush_size=10,
                max_pages=5,
                alias_map={},
                drugs_index={},
                meddra_index=set(),
            )

        assert stats.fetched == 2
        assert stats.normalized == 2
        assert stats.rejected == 0
        assert stats.parents_written == 2
        # Single-drug serious_report + three-drug multi_drug_report = 4 drug rows
        assert stats.drug_rows_written == 4
        # serious_report has 1 reaction; multi_drug_report has 1; total 2
        assert stats.reaction_rows_written == 2
        # New drugs created across both fixtures = 4 (1 in serious + 3 in multi)
        assert stats.drugs_created == 4
        # Tables touched in the right order
        tables_written = [t for t, _ in write_log]
        assert "drugs" in tables_written
        assert "meddra_terms" in tables_written
        assert "drug_adverse_events" in tables_written
        assert "drug_adverse_event_drugs" in tables_written
        assert "drug_adverse_event_reactions" in tables_written


def _extract_in(value: str) -> list[str]:
    """Strip 'in.(...)' wrapping and split quoted/comma-separated entries."""
    if not value.startswith("in.("):
        return []
    inner = value[4:-1] if value.endswith(")") else value[4:]
    out = []
    cur = []
    in_quote = False
    for ch in inner:
        if ch == '"':
            in_quote = not in_quote
            continue
        if ch == "," and not in_quote:
            if cur:
                out.append("".join(cur))
                cur = []
            continue
        cur.append(ch)
    if cur:
        out.append("".join(cur))
    return out


# ---------------------------------------------------------------------------
# Window resolution + search assembly
# ---------------------------------------------------------------------------

class TestResolveWindow:
    def test_year(self):
        start, end = resolve_window(backfill_since=None, year=2024, rolling_days=7)
        assert start.isoformat() == "2024-01-01"
        assert end.isoformat() == "2024-12-31"

    def test_backfill_since(self):
        start, end = resolve_window(backfill_since="2024-01-01", year=None, rolling_days=7)
        assert start.isoformat() == "2024-01-01"
        assert end > start

    def test_default_rolling(self):
        start, end = resolve_window(backfill_since=None, year=None, rolling_days=7)
        assert (end - start).days == 7

    def test_invalid_backfill_raises(self):
        with pytest.raises(SystemExit):
            resolve_window(backfill_since="not-a-date", year=None, rolling_days=7)


class TestBuildSearch:
    def test_includes_serious_and_window(self):
        from datetime import date as _date
        search = build_search(_date(2024, 1, 1), _date(2024, 12, 31))
        assert search.startswith("serious:1")
        assert "receivedate:[20240101 TO 20241231]" in search


# ---------------------------------------------------------------------------
# _quote_for_in — PostgREST filter for unique_match_keys that contain commas
# ---------------------------------------------------------------------------

class TestQuoteForIn:
    def test_simple(self):
        assert _quote_for_in(["a", "b"]) == '"a","b"'

    def test_with_comma_in_value(self):
        # The whole reason this helper exists — "name:tylenol, extra" must
        # survive PostgREST's comma-separator without splitting mid-value.
        assert _quote_for_in(["name:tylenol, extra strength"]) == '"name:tylenol, extra strength"'

    def test_with_quote_in_value_is_escaped(self):
        assert _quote_for_in(['name:johnson\'s "talc"']) == '"name:johnson\'s ""talc"""'
