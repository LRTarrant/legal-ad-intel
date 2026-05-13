"""Tests for cpsc_recalls — severity tier, normalization, fallback, upsert delta.

All tests mock the HTTP and Supabase layers. No live API calls.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pipelines.cpsc_recalls import (  # noqa: E402
    RECALL_URL_INCLUSION_PATTERN,
    compute_severity_tier,
    fetch_existing_state,
    normalize_manufacturer_name,
    normalize_recall,
    parse_death_count,
    parse_injury_count,
    parse_units_recalled,
    resolve_window,
)

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "cpsc"


def _load(name: str) -> dict:
    return json.loads((FIXTURE_DIR / name).read_text())


# ---------------------------------------------------------------------------
# parse_units_recalled
# ---------------------------------------------------------------------------

class TestParseUnitsRecalled:
    def test_plain_thousands(self):
        assert parse_units_recalled("About 34,000") == 34_000

    def test_approximately(self):
        assert parse_units_recalled("Approximately 250") == 250

    def test_million_keyword(self):
        assert parse_units_recalled("About 8.2 million") == 8_200_000

    def test_billion_keyword(self):
        assert parse_units_recalled("About 1.5 billion") == 1_500_000_000

    def test_first_number_wins_with_canada_caveat(self):
        assert parse_units_recalled(
            "About 34,000 (in addition to 9,450 in Canada)"
        ) == 34_000

    def test_first_match_when_million_appears_first(self):
        # "About 8.2 million (in addition to 6.6 million in Canada)"
        # First match: 8.2 million.
        assert parse_units_recalled(
            "About 8.2 million (in addition to 6.6 million in Canada)"
        ) == 8_200_000

    def test_empty(self):
        assert parse_units_recalled("") is None

    def test_none(self):
        assert parse_units_recalled(None) is None

    def test_no_number(self):
        assert parse_units_recalled("Unknown") is None


# ---------------------------------------------------------------------------
# parse_death_count / parse_injury_count
# ---------------------------------------------------------------------------

class TestParseCounts:
    def test_one_child_died(self):
        # Peloton language: "One child died."
        text = "Peloton has received 72 reports... One child died."
        assert parse_death_count(text) == 1

    def test_word_count(self):
        text = "Fisher-Price is aware of more than 30 reported infant fatalities"
        assert parse_death_count(text) == 30

    def test_no_death(self):
        text = "received 9 reports of fires; no injuries reported"
        assert parse_death_count(text) is None

    def test_injury_count_numeric(self):
        text = "received 29 reports of injuries to children"
        assert parse_injury_count(text) == 29


# ---------------------------------------------------------------------------
# compute_severity_tier
# ---------------------------------------------------------------------------

class TestSeverityTier:
    def test_tier_a_via_death_count(self):
        assert compute_severity_tier(
            title="X recall",
            injuries_text="",
            hazards=["Fall Hazard"],
            units_int=100,
            death_count=1,
        ) == "A"

    def test_tier_a_via_death_language_in_injuries_text(self):
        # Death-language in injuries_text triggers Tier A. Title-only death
        # mentions don't (CPSC titles routinely contain "risk of death" as
        # hazard boilerplate); the caller is expected to pre-compute
        # death_count from parse_death_count() over title+injuries.
        assert compute_severity_tier(
            title="X recall",
            injuries_text="Reports of one child died after using the product",
            hazards=["Fall Hazard"],
            units_int=100,
            death_count=None,
        ) == "A"

    def test_title_boilerplate_alone_does_not_trigger_tier_a(self):
        # "Risk of death" is a hazard descriptor, not a reported death.
        # Without death_count, hazard match, or injuries text death-language,
        # this drops to Tier B (serious injury or death + units threshold)
        # or lower.
        assert compute_severity_tier(
            title="X recalls Y due to risk of death",
            injuries_text="",
            hazards=["Fall Hazard"],
            units_int=100,
            death_count=None,
        ) == "D"

    def test_tier_a_via_hazard_set(self):
        assert compute_severity_tier(
            title="Mundane recall",
            injuries_text="",
            hazards=["Suffocation Hazard"],
            units_int=100,
            death_count=None,
        ) == "A"

    def test_tier_b_serious_injury_language_plus_units(self):
        assert compute_severity_tier(
            title="X recalls Y due to risk of serious injury or death",
            injuries_text="",
            hazards=[],
            units_int=125_000,
            death_count=None,
        ) == "B"

    def test_tier_b_fire_hazard_plus_units(self):
        assert compute_severity_tier(
            title="Battery recall",
            injuries_text="",
            hazards=["Fire Hazard"],
            units_int=12_500,
            death_count=None,
        ) == "B"

    def test_tier_b_demotes_to_c_below_units_threshold(self):
        # Fire hazard but only 500 units AND injuries reported -> Tier C.
        assert compute_severity_tier(
            title="Battery recall",
            injuries_text="received 3 reports of fires",
            hazards=["Fire Hazard"],
            units_int=500,
            death_count=None,
        ) == "C"

    def test_tier_c_when_only_injury_text(self):
        assert compute_severity_tier(
            title="Mundane recall",
            injuries_text="received 2 reports of minor cuts",
            hazards=["Laceration Hazard"],
            units_int=500,
            death_count=None,
        ) == "C"

    def test_tier_d_defect_only(self):
        assert compute_severity_tier(
            title="Recall due to mislabeling",
            injuries_text="",
            hazards=["Choking Hazard"],
            units_int=1000,
            death_count=None,
        ) == "D"


# ---------------------------------------------------------------------------
# Manufacturer normalization
# ---------------------------------------------------------------------------

class TestNormalizeManufacturer:
    def test_lowercase(self):
        assert normalize_manufacturer_name("PELOTON") == "peloton"

    def test_strip_inc(self):
        assert normalize_manufacturer_name("Peloton Interactive, Inc.") \
            == "peloton interactive"

    def test_strip_llc(self):
        # Strips LLC and "north america" but intentionally NOT "services" —
        # the suffix list is conservative because "services" is a meaningful
        # part of many corp names. Curators add this raw form to the alias
        # table when they want it merged.
        assert normalize_manufacturer_name("IKEA North America Services LLC") \
            == "ikea services"

    def test_strip_corp(self):
        # "corp" is stripped; "north america" is also stripped via the
        # geographical-suffix branch of _LEGAL_SUFFIX_RE.
        assert normalize_manufacturer_name("Olympus Corp. of the Americas") \
            == "olympus"

    def test_collapse_whitespace(self):
        assert normalize_manufacturer_name("  Fisher   Price   Inc.  ") \
            == "fisher price"

    def test_empty(self):
        assert normalize_manufacturer_name("") == ""

    def test_check_constraint_form(self):
        """Output must satisfy the cpsc_manufacturer_aliases CHECK constraint."""
        import re
        for raw in [
            "Peloton Interactive, Inc.",
            "  IKEA   Supply   AG  ",
            "Mattel, Inc.",
            "Fisher-Price",
        ]:
            n = normalize_manufacturer_name(raw)
            # CHECK constraint: alias_text = lower(regexp_replace(btrim(alias_text), '\s+', ' ', 'g'))
            assert n == n.lower()
            assert n == n.strip()
            assert "  " not in n
            assert n == re.sub(r"\s+", " ", n)


# ---------------------------------------------------------------------------
# Alias / canonical lookup behavior via normalize_recall
# ---------------------------------------------------------------------------

class TestNormalizeRecall:
    def test_peloton_alias_hit(self):
        raw = _load("peloton_tread_recall.json")
        # Curated alias -> some manufacturer uuid.
        alias_map = {"peloton interactive": "mfr-uuid-peloton"}
        norm = normalize_recall(raw, alias_map=alias_map, canonical_map={})
        assert norm is not None
        assert norm["parent"]["severity_tier"] == "A"
        assert norm["parent"]["cpsc_recall_id"] == 21178
        assert norm["parent"]["death_count"] == 1
        # Primary manufacturer joins.
        primary = [m for m in norm["manufacturers"] if m["role"] == "manufacturer"]
        assert len(primary) == 1
        assert primary[0]["manufacturer_id"] == "mfr-uuid-peloton"
        assert primary[0]["raw_name"] == "Peloton Interactive, Inc."
        assert norm["unmatched_manufacturers"] == []

    def test_peloton_canonical_fallback(self):
        """Alias map miss but canonical_map covers the same normalized form."""
        raw = _load("peloton_tread_recall.json")
        norm = normalize_recall(
            raw,
            alias_map={},
            canonical_map={"peloton interactive": "mfr-uuid-canonical"},
        )
        assert norm is not None
        primary = [m for m in norm["manufacturers"] if m["role"] == "manufacturer"]
        assert primary[0]["manufacturer_id"] == "mfr-uuid-canonical"

    def test_peloton_unmatched_logs_raw(self):
        raw = _load("peloton_tread_recall.json")
        norm = normalize_recall(raw, alias_map={}, canonical_map={})
        assert norm is not None
        primary = [m for m in norm["manufacturers"] if m["role"] == "manufacturer"]
        assert primary[0]["manufacturer_id"] is None
        assert primary[0]["raw_name"] == "Peloton Interactive, Inc."
        assert "Peloton Interactive, Inc." in norm["unmatched_manufacturers"]

    def test_ikea_tier_a_via_death_language(self):
        raw = _load("furniture_tipover_recall.json")
        norm = normalize_recall(raw, alias_map={}, canonical_map={})
        assert norm is not None
        # "fatalities" in injuries text triggers Tier A.
        assert norm["parent"]["severity_tier"] == "A"
        assert norm["parent"]["units_recalled_int"] == 8_200_000
        assert norm["parent"]["units_recalled_text"].startswith("About 8.2 million")
        # IKEA Supply AG is the primary manufacturer; IKEA North America
        # Services LLC surfaces as an importer.
        primary = [m for m in norm["manufacturers"] if m["role"] == "manufacturer"]
        importers = [m for m in norm["manufacturers"] if m["role"] == "importer"]
        assert len(primary) == 1
        assert primary[0]["raw_name"] == "IKEA Supply AG"
        assert primary[0]["country"] == "Sweden"
        assert len(importers) == 1
        assert importers[0]["raw_name"] == "IKEA North America Services LLC"

    def test_chinese_ebike_empty_manufacturers_falls_back_to_importer(self):
        """Empty Manufacturers[] -> primary role = importer (cpsc.md §3 fallback)."""
        raw = _load("chinese_ebike_recall.json")
        norm = normalize_recall(raw, alias_map={}, canonical_map={})
        assert norm is not None
        # Fire Hazard + 12_500 units -> Tier B.
        assert norm["parent"]["severity_tier"] == "B"
        roles = {m["role"] for m in norm["manufacturers"]}
        # Primary fell back to importer; no manufacturer-role row was created.
        assert "manufacturer" not in roles
        assert "importer" in roles
        importer_rows = [m for m in norm["manufacturers"] if m["role"] == "importer"]
        assert len(importer_rows) == 1
        assert importer_rows[0]["raw_name"] == "Sample Importer LLC"
        assert importer_rows[0]["manufacturer_id"] is None
        assert "Sample Importer LLC" in norm["unmatched_manufacturers"]
        # Retailer (Amazon.com) is still captured as a separate role row.
        retailer_rows = [m for m in norm["manufacturers"] if m["role"] == "retailer"]
        assert any(r["raw_name"] == "Amazon.com" for r in retailer_rows)

    def test_url_filter_rejects_non_recall_url(self):
        raw = _load("peloton_tread_recall.json")
        raw_bad_url = {
            **raw,
            "URL": "https://www.cpsc.gov/Newsroom/News-Releases/2026/Beware-of-Recall-Scam",
        }
        assert normalize_recall(raw_bad_url, alias_map={}, canonical_map={}) is None

    def test_url_filter_accepts_recall_url(self):
        raw = _load("peloton_tread_recall.json")
        assert normalize_recall(raw, alias_map={}, canonical_map={}) is not None

    def test_missing_recall_id_returns_none(self):
        raw = _load("peloton_tread_recall.json")
        bad = {**raw}
        bad.pop("RecallID")
        assert normalize_recall(bad, alias_map={}, canonical_map={}) is None


# ---------------------------------------------------------------------------
# Re-announcement / upsert delta logic
# ---------------------------------------------------------------------------

class TestReannouncementDetection:
    """Verify that an advancing LastPublishDate flags the recall for child refresh.

    We simulate the publish-step decision logic directly: build the normalized
    record from the re-announced fixture, compare against a synthetic 'pre_state'
    representing an existing row with the older last_publish_date, and confirm
    the recall lands in the refresh set.
    """

    def test_lpd_advance_triggers_refresh(self):
        raw = _load("reannounced_recall.json")
        norm = normalize_recall(raw, alias_map={}, canonical_map={})
        assert norm is not None
        cid = norm["parent"]["cpsc_recall_id"]
        new_lpd = norm["parent"]["last_publish_date"]
        assert new_lpd == "2023-01-09"

        # Existing row with the original 2019 publish date.
        pre_state = {cid: ("existing-uuid", "2019-04-12")}
        to_refresh: set[int] = set()
        if cid not in pre_state:
            to_refresh.add(cid)
        elif pre_state[cid][1] != new_lpd:
            to_refresh.add(cid)
        assert to_refresh == {cid}

    def test_lpd_unchanged_does_not_trigger_refresh(self):
        raw = _load("reannounced_recall.json")
        norm = normalize_recall(raw, alias_map={}, canonical_map={})
        assert norm is not None
        cid = norm["parent"]["cpsc_recall_id"]
        new_lpd = norm["parent"]["last_publish_date"]

        pre_state = {cid: ("existing-uuid", new_lpd)}
        to_refresh: set[int] = set()
        if cid not in pre_state:
            to_refresh.add(cid)
        elif pre_state[cid][1] != new_lpd:
            to_refresh.add(cid)
        assert to_refresh == set()

    def test_first_time_insert_triggers_refresh(self):
        raw = _load("peloton_tread_recall.json")
        norm = normalize_recall(raw, alias_map={}, canonical_map={})
        assert norm is not None
        cid = norm["parent"]["cpsc_recall_id"]
        pre_state: dict[int, tuple[str, str | None]] = {}
        to_refresh: set[int] = set()
        if cid not in pre_state:
            to_refresh.add(cid)
        assert to_refresh == {cid}


# ---------------------------------------------------------------------------
# Window resolution
# ---------------------------------------------------------------------------

class TestResolveWindow:
    def test_year_arg(self):
        from datetime import date
        start, end, by_field = resolve_window(
            backfill_since=None, year=2019, rolling_days=60,
        )
        assert start == date(2019, 1, 1)
        assert end == date(2019, 12, 31)
        assert by_field == "RecallDate"

    def test_backfill_since(self):
        from datetime import date
        start, end, by_field = resolve_window(
            backfill_since="2021-01-01", year=None, rolling_days=60,
        )
        assert start == date(2021, 1, 1)
        assert by_field == "RecallDate"

    def test_year_overrides_backfill(self):
        from datetime import date
        start, end, _ = resolve_window(
            backfill_since="2021-01-01", year=2019, rolling_days=60,
        )
        assert start == date(2019, 1, 1)
        assert end == date(2019, 12, 31)

    def test_default_rolling_uses_last_publish_date(self):
        from datetime import date, datetime, timedelta, timezone
        start, end, by_field = resolve_window(
            backfill_since=None, year=None, rolling_days=60,
        )
        today = datetime.now(timezone.utc).date()
        assert end == today
        assert start == today - timedelta(days=60)
        # Critical: re-announcement detection requires LastPublishDate as the
        # delta axis; RecallDate would miss Rock 'n Play 2023 re-announces.
        assert by_field == "LastPublishDate"

    def test_invalid_backfill_since_raises(self):
        with pytest.raises(SystemExit):
            resolve_window(backfill_since="not-a-date", year=None, rolling_days=60)


# ---------------------------------------------------------------------------
# URL inclusion pattern
# ---------------------------------------------------------------------------

class TestUrlInclusion:
    def test_recall_path_included(self):
        assert RECALL_URL_INCLUSION_PATTERN.search(
            "https://www.cpsc.gov/Recalls/2021/Peloton-Recalls-Tread"
        )

    def test_newsroom_path_excluded(self):
        assert not RECALL_URL_INCLUSION_PATTERN.search(
            "https://www.cpsc.gov/Newsroom/News-Releases/2026/Beware-of-Recall-Scam"
        )

    def test_case_insensitive(self):
        assert RECALL_URL_INCLUSION_PATTERN.search(
            "https://www.cpsc.gov/recalls/2024/Some-Recall"
        )
