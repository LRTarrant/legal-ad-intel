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
    CHILD_CHUNK_SIZE,
    DEFAULT_CHUNK_DAYS,
    DIM_CHUNK_SIZE,
    IngestStats,
    PARENT_CHUNK_SIZE,
    SKIP_CAP,
    SORT_EXPR,
    _quote_for_in,
    _safe_date,
    _str_list,
    _to_bool_one,
    _to_serious_bool,
    _to_smallint,
    adaptive_windows,
    build_search,
    derive_drug_match,
    ingest_pages,
    iter_windows,
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
# SORT_EXPR regression guard (carried forward from PR #384)
# ---------------------------------------------------------------------------

class TestSortExprRegressionGuard:
    def test_sort_expr_does_not_use_safetyreportid(self):
        """Regression guard for the live HTTP 500 first seen in workflow_dispatch.

        openFDA indexes safetyreportid as a text (analyzed) field, not
        keyword (sortable). Any attempt to sort by it returns:
            "Text fields are not optimised for operations that require
            per-document field data like aggregations and sorting..."
        This bug must never recur — assert the sort string doesn't mention it.
        """
        assert "safetyreportid" not in SORT_EXPR
        assert "receivedate" in SORT_EXPR
        assert "receiptdate" in SORT_EXPR


# ---------------------------------------------------------------------------
# iter_windows — calendar-day chunker
# ---------------------------------------------------------------------------

class TestIterWindows:
    def test_evenly_divisible_range_weekly(self):
        from datetime import date as _d
        windows = list(iter_windows(_d(2024, 1, 1), _d(2024, 1, 14), days=7))
        # Two 7-day chunks: Jan 1..Jan 7 (inclusive, 7 days) + Jan 8..Jan 14.
        assert windows == [
            (_d(2024, 1, 1), _d(2024, 1, 7)),
            (_d(2024, 1, 8), _d(2024, 1, 14)),
        ]

    def test_partial_last_window_truncated(self):
        from datetime import date as _d
        windows = list(iter_windows(_d(2024, 1, 1), _d(2024, 1, 10), days=4))
        assert windows == [
            (_d(2024, 1, 1), _d(2024, 1, 4)),
            (_d(2024, 1, 5), _d(2024, 1, 8)),
            (_d(2024, 1, 9), _d(2024, 1, 10)),  # truncated
        ]

    def test_single_day_range(self):
        from datetime import date as _d
        windows = list(iter_windows(_d(2024, 1, 5), _d(2024, 1, 5), days=7))
        assert windows == [(_d(2024, 1, 5), _d(2024, 1, 5))]

    def test_daily_granularity(self):
        from datetime import date as _d
        windows = list(iter_windows(_d(2024, 1, 1), _d(2024, 1, 3), days=1))
        assert windows == [
            (_d(2024, 1, 1), _d(2024, 1, 1)),
            (_d(2024, 1, 2), _d(2024, 1, 2)),
            (_d(2024, 1, 3), _d(2024, 1, 3)),
        ]

    def test_invalid_days_raises(self):
        from datetime import date as _d
        with pytest.raises(ValueError):
            list(iter_windows(_d(2024, 1, 1), _d(2024, 1, 10), days=0))


# ---------------------------------------------------------------------------
# adaptive_windows — probe + subdivide
# ---------------------------------------------------------------------------

def _client_with_probe(probe_totals: dict[tuple[str, str], int]) -> OpenFDAClient:
    """Build a client whose fetch_page returns ([], total) where total
    is looked up by (start_yyyymmdd, end_yyyymmdd) from the dict."""
    client = OpenFDAClient(api_key="", retry_delays=(0,))

    def fake_get(url, params, timeout):
        # build_search emits 'serious:1 AND receivedate:[YYYYMMDD TO YYYYMMDD]'.
        search = params["search"]
        # Parse window dates out of the search expression.
        import re
        m = re.search(r"\[(\d{8}) TO (\d{8})\]", search)
        if not m:
            total = 0
        else:
            total = probe_totals.get((m.group(1), m.group(2)), 0)
        r = MagicMock(spec=httpx.Response)
        r.status_code = 200
        r.request = MagicMock(spec=httpx.Request)
        r.raise_for_status.return_value = None
        r.json.return_value = {"results": [], "meta": {"results": {"total": total}}}
        return r

    client._fake_get = fake_get  # for the test to install via patch
    return client


class TestAdaptiveWindows:
    def test_passes_small_windows_through_unchanged(self):
        from datetime import date as _d
        # Two weekly chunks; each fits well under the cap.
        client = _client_with_probe({
            ("20240101", "20240107"): 500,
            ("20240108", "20240114"): 800,
        })
        with patch("lib.openfda_client.httpx.get", side_effect=client._fake_get):
            windows = list(adaptive_windows(
                client, _d(2024, 1, 1), _d(2024, 1, 14),
                chunk_days=7, skip_cap=25_000,
            ))
        assert windows == [
            (_d(2024, 1, 1), _d(2024, 1, 7), 500),
            (_d(2024, 1, 8), _d(2024, 1, 14), 800),
        ]

    def test_subdivides_when_weekly_window_over_cap(self):
        from datetime import date as _d
        # Weekly probe says 30k → subdivide to dailies, each fitting under cap.
        probes = {("20240101", "20240107"): 30_000}
        for day in range(1, 8):
            probes[(f"2024010{day}", f"2024010{day}")] = 1_000
        client = _client_with_probe(probes)
        with patch("lib.openfda_client.httpx.get", side_effect=client._fake_get):
            windows = list(adaptive_windows(
                client, _d(2024, 1, 1), _d(2024, 1, 7),
                chunk_days=7, skip_cap=25_000,
            ))
        # 7 single-day windows yielded.
        assert len(windows) == 7
        for i, (start, end, total) in enumerate(windows, start=1):
            assert start == end == _d(2024, 1, i)
            assert total == 1_000

    def test_single_day_over_cap_records_miss_in_stats(self, caplog):
        from datetime import date as _d
        # Weekly probe: 30k → split. One day spikes at 27k (still over cap).
        probes = {("20240101", "20240107"): 30_000}
        for day in range(1, 8):
            probes[(f"2024010{day}", f"2024010{day}")] = 1_000
        probes[("20240103", "20240103")] = 27_000  # 27k > 25k cap
        client = _client_with_probe(probes)
        stats = IngestStats()
        with patch("lib.openfda_client.httpx.get", side_effect=client._fake_get), \
             caplog.at_level("WARNING", logger="pipelines.faers_weekly"):
            list(adaptive_windows(
                client, _d(2024, 1, 1), _d(2024, 1, 7),
                chunk_days=7, skip_cap=25_000, stats=stats,
            ))
        # 27k records exist in the day, 25k can be fetched → 2k missed.
        assert stats.records_missed_over_cap == 2_000
        assert len(stats.over_cap_windows) == 1
        miss = stats.over_cap_windows[0]
        assert miss["window_start"] == "2024-01-03"
        assert miss["window_end"] == "2024-01-03"
        assert miss["records_in_window"] == 27_000
        assert miss["records_missed"] == 2_000
        # WARNING log present + carries the window + miss count for the operator.
        log_text = "\n".join(r.message for r in caplog.records)
        assert "skip-cap exceeded" in log_text.lower()
        assert "2024-01-03" in log_text
        assert "27000" in log_text or "27,000" in log_text
        assert "2000" in log_text or "2,000" in log_text  # missed count


# ---------------------------------------------------------------------------
# ingest_pages — end-to-end skip pagination + chunking
# ---------------------------------------------------------------------------

class TestIngestPagesIntegration:
    def test_full_flow_uses_skip_pagination_not_search_after(self):
        """One window → probe + skip-paginate → normalize → flush → DB writes.

        Hard-fails if any request carries `search_after` — the broken
        endpoint code path is gone for good.
        """
        from datetime import date as _d
        client = OpenFDAClient(api_key="", retry_delays=(0,))

        page = [_load("serious_report.json"), _load("multi_drug_report.json")]
        captured_params: list[dict] = []

        def fake_get(url, params, timeout):
            captured_params.append(dict(params))
            r = MagicMock(spec=httpx.Response)
            r.status_code = 200
            r.request = MagicMock(spec=httpx.Request)
            r.raise_for_status.return_value = None
            limit = int(params.get("limit", 100))
            skip = int(params.get("skip", 0))
            if limit == 1:
                # Probe — return total only.
                r.json.return_value = {"results": [], "meta": {"results": {"total": 2}}}
                return r
            if skip == 0:
                r.json.return_value = {"results": page, "meta": {"results": {"total": 2}}}
            else:
                r.json.return_value = {"results": [], "meta": {"results": {"total": 2}}}
            return r

        write_log: list[tuple[str, int]] = []

        def fake_bulk_insert(table, rows, **_kw):
            write_log.append((table, len(rows)))
            return len(rows)

        def fake_get_table(table, params):
            if table == "drugs":
                keys = params.get("unique_match_key", "")
                if keys.startswith("in.("):
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
                window_start=_d(2024, 1, 1),
                window_end=_d(2024, 1, 7),
                page_size=100,
                batch_flush_size=10,
                max_pages_per_window=5,
                alias_map={},
                drugs_index={},
                meddra_index=set(),
            )

        # Counters
        assert stats.fetched == 2
        assert stats.normalized == 2
        assert stats.rejected == 0
        assert stats.parents_written == 2
        assert stats.drug_rows_written == 4
        assert stats.reaction_rows_written == 2
        assert stats.drugs_created == 4
        assert stats.windows_processed == 1
        assert stats.records_missed_over_cap == 0

        # Tables touched
        tables_written = [t for t, _ in write_log]
        for table in ("drugs", "meddra_terms", "drug_adverse_events",
                      "drug_adverse_event_drugs", "drug_adverse_event_reactions"):
            assert table in tables_written

        # NO request carries search_after — that path is gone.
        assert all("search_after" not in p for p in captured_params)
        # At least one request DOES carry skip (the pagination call).
        assert any("skip" in p for p in captured_params)
        # The sort is passed through on the pagination request (deterministic order).
        pagination_calls = [p for p in captured_params if int(p.get("limit", 1)) > 1]
        assert pagination_calls
        assert pagination_calls[0]["sort"] == SORT_EXPR


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

    def test_steady_state_cron_path_unchanged(self):
        """The Monday 03:00 UTC cron passes no year/month/backfill_since —
        it MUST still produce the rolling N-day window ending today (UTC).
        This is the path the scheduled workflow exercises every week.
        """
        from datetime import datetime as _dt, timezone as _tz
        today = _dt.now(_tz.utc).date()
        start, end = resolve_window(
            backfill_since=None, year=None, month=None, rolling_days=7,
        )
        assert end == today
        assert (end - start).days == 7
        # A non-default rolling width is honored too.
        start30, end30 = resolve_window(
            backfill_since=None, year=None, month=None, rolling_days=30,
        )
        assert (end30 - start30).days == 30

    def test_invalid_backfill_raises(self):
        with pytest.raises(SystemExit):
            resolve_window(backfill_since="not-a-date", year=None, rolling_days=7)

    def test_year_and_month_january(self):
        start, end = resolve_window(
            backfill_since=None, year=2024, month=1, rolling_days=7,
        )
        assert start.isoformat() == "2024-01-01"
        assert end.isoformat() == "2024-01-31"

    def test_year_and_month_february_leap(self):
        """monthrange handles Feb 29 in a leap year without special-casing."""
        start, end = resolve_window(
            backfill_since=None, year=2024, month=2, rolling_days=7,
        )
        assert start.isoformat() == "2024-02-01"
        assert end.isoformat() == "2024-02-29"

    def test_year_and_month_february_non_leap(self):
        start, end = resolve_window(
            backfill_since=None, year=2023, month=2, rolling_days=7,
        )
        assert start.isoformat() == "2023-02-01"
        assert end.isoformat() == "2023-02-28"

    def test_year_and_month_december(self):
        start, end = resolve_window(
            backfill_since=None, year=2024, month=12, rolling_days=7,
        )
        assert start.isoformat() == "2024-12-01"
        assert end.isoformat() == "2024-12-31"

    def test_month_without_year_raises(self):
        """A bare month has no anchor — must fail loud, not silently ignore."""
        with pytest.raises(SystemExit):
            resolve_window(
                backfill_since=None, year=None, month=3, rolling_days=7,
            )

    def test_month_out_of_range_raises(self):
        for bad in (0, 13, -1):
            with pytest.raises(SystemExit):
                resolve_window(
                    backfill_since=None, year=2024, month=bad, rolling_days=7,
                )

    def test_month_takes_precedence_over_backfill_since(self):
        """year+month is mutually exclusive with backfill_since; month wins."""
        start, end = resolve_window(
            backfill_since="2020-06-15", year=2024, month=5, rolling_days=7,
        )
        assert start.isoformat() == "2024-05-01"
        assert end.isoformat() == "2024-05-31"


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


# ---------------------------------------------------------------------------
# Per-table chunk sizes — facts about row shape, NOT operator-tunable env vars
# ---------------------------------------------------------------------------

class TestFaersChunkSizes:
    """Chunk sizes are tuned to row SHAPE. Only drug_adverse_events carries a
    JSONB raw_payload, so only the parent needs the small chunk to clear
    Supabase's statement_timeout (PR #386, run 25897299528). Forcing the
    narrow child tables to 100 4-5x'd their request count and blew the
    workflow wall-clock timeout — that's the regression these guards lock.
    """

    def test_parent_chunk_size_is_100(self):
        """drug_adverse_events: JSONB raw_payload + ~27 cols, expensive
        on_conflict=safetyreportid upsert. MUST stay at 100 to clear the
        Postgres statement_timeout (57014)."""
        assert PARENT_CHUNK_SIZE == 100

    def test_child_chunk_size_is_500(self):
        """drug_adverse_event_drugs / _reactions: no JSONB, narrow rows.
        500 (lib default) keeps the request count low enough to fit the
        backfill inside the workflow timeout."""
        assert CHILD_CHUNK_SIZE == 500

    def test_dim_chunk_size_is_500(self):
        """drugs / meddra_terms: tiny ignore-duplicates upserts."""
        assert DIM_CHUNK_SIZE == 500

    def test_no_faers_upsert_chunk_size_env_var(self):
        """The single FAERS_UPSERT_CHUNK_SIZE env var was removed — chunk
        sizes are row-shape facts, not knobs. Hard-fail if it creeps back."""
        import pipelines.faers_weekly as mod
        assert not hasattr(mod, "FAERS_UPSERT_CHUNK_SIZE"), (
            "FAERS_UPSERT_CHUNK_SIZE was removed in favor of per-table "
            "constants — do not reintroduce the single-knob env var."
        )

    def test_flush_batch_uses_correct_per_table_chunk_size(self):
        """Every _bulk_insert call inside flush_batch must carry the chunk
        size for its table: parent -> 100, children -> 500, dims -> 500.
        Hard-fails if a wrong constant (or a literal) slips back in.
        """
        import pipelines.faers_weekly as mod

        expected_by_table = {
            "drugs": DIM_CHUNK_SIZE,
            "meddra_terms": DIM_CHUNK_SIZE,
            "drug_adverse_events": PARENT_CHUNK_SIZE,
            "drug_adverse_event_drugs": CHILD_CHUNK_SIZE,
            "drug_adverse_event_reactions": CHILD_CHUNK_SIZE,
        }

        calls: list[dict] = []

        def fake_bulk_insert(table, rows, **kwargs):
            calls.append({"table": table, "chunk_size": kwargs.get("chunk_size")})
            return len(rows)

        def fake_get_table(table, params):
            if table == "drugs":
                keys = params.get("unique_match_key", "")
                if keys.startswith("in.("):
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

        parents = [{"safetyreportid": "RPT-1", "raw_payload": {}}]
        drug_children = {"RPT-1": [{"drug_seq": 1, "_match_key": "name:foo"}]}
        reaction_children = {"RPT-1": [{"reaction_seq": 1, "reactionmeddrapt": "HEADACHE"}]}
        new_drugs = {"name:foo": {"unique_match_key": "name:foo", "canonical_name": "foo"}}
        new_meddra = {"headache": {"pt_name": "HEADACHE", "pt_name_canonical": "headache"}}

        with patch("pipelines.faers_weekly._bulk_insert", side_effect=fake_bulk_insert), \
             patch("pipelines.faers_weekly._get", side_effect=fake_get_table), \
             patch("pipelines.faers_weekly._delete"):
            mod.flush_batch(
                parents=parents,
                drug_children_by_sri=drug_children,
                reaction_children_by_sri=reaction_children,
                new_drugs=new_drugs,
                new_meddra_terms=new_meddra,
                drugs_index={},
                meddra_index=set(),
                stats=IngestStats(),
            )

        assert calls, "flush_batch made no _bulk_insert calls"
        for call in calls:
            expected = expected_by_table[call["table"]]
            assert call["chunk_size"] == expected, (
                f"_bulk_insert for {call['table']} got chunk_size="
                f"{call['chunk_size']}, expected {expected}"
            )
        # All five tables should be exercised by this fixture.
        tables = {c["table"] for c in calls}
        for t in expected_by_table:
            assert t in tables, f"flush_batch did not write to {t}"
