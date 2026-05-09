"""Tests for openfda_device_recalls — enforcement endpoint join logic."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipelines.openfda_device_recalls import (
    _severity_for_recall,
    build_recall_row,
    canonicalize_manufacturer,
    slugify,
    parse_date,
)


# ---------------------------------------------------------------------------
# _severity_for_recall — enforcement join
# ---------------------------------------------------------------------------

SAMPLE_MAP = {
    "Z-1234-2021": "Class I",
    "Z-5678-2022": "Class II",
    "Z-9012-2023": "Class III",
}


def test_severity_hit_class_i():
    row = {"product_res_number": "Z-1234-2021"}
    assert _severity_for_recall(row, SAMPLE_MAP) == "Class I"


def test_severity_hit_class_ii():
    row = {"product_res_number": "Z-5678-2022"}
    assert _severity_for_recall(row, SAMPLE_MAP) == "Class II"


def test_severity_hit_class_iii():
    row = {"product_res_number": "Z-9012-2023"}
    assert _severity_for_recall(row, SAMPLE_MAP) == "Class III"


def test_severity_miss_returns_unclassified():
    """product_res_number not in enforcement map → Unclassified."""
    row = {"product_res_number": "Z-9999-2020"}
    assert _severity_for_recall(row, SAMPLE_MAP) == "Unclassified"


def test_severity_empty_enforcement_map():
    """Empty enforcement map → every row is Unclassified."""
    row = {"product_res_number": "Z-1234-2021"}
    assert _severity_for_recall(row, {}) == "Unclassified"


def test_severity_no_product_res_number():
    """Row without product_res_number → Unclassified (empty string lookup)."""
    assert _severity_for_recall({}, SAMPLE_MAP) == "Unclassified"


def test_severity_none_product_res_number():
    """Explicit None product_res_number → Unclassified."""
    row = {"product_res_number": None}
    assert _severity_for_recall(row, SAMPLE_MAP) == "Unclassified"


def test_severity_strips_whitespace():
    """product_res_number with surrounding whitespace still matches."""
    row = {"product_res_number": "  Z-1234-2021  "}
    assert _severity_for_recall(row, SAMPLE_MAP) == "Class I"


# ---------------------------------------------------------------------------
# build_recall_row — enforcement_map wired through to recall_class
# ---------------------------------------------------------------------------

def test_build_recall_row_sets_severity_from_enforcement_map():
    event = {
        "product_res_number": "Z-1234-2021",
        "res_event_number": "88058",
        "product_description": "CPAP device",
        "reason_for_recall": "PE-PUR foam degradation",
        "event_date_initiated": "20210614",
    }
    row = build_recall_row(event, manufacturer_id=None, enforcement_map=SAMPLE_MAP)
    assert row["recall_class"] == "Class I"
    assert row["external_id"] == "Z-1234-2021"
    assert row["source"] == "openfda_device"


def test_build_recall_row_unclassified_when_no_match():
    event = {
        "product_res_number": "Z-0000-2000",
        "res_event_number": "99999",
    }
    row = build_recall_row(event, manufacturer_id=None, enforcement_map=SAMPLE_MAP)
    assert row["recall_class"] == "Unclassified"


def test_build_recall_row_external_id_falls_back_to_res_event_number():
    """When product_res_number is absent, external_id should use res_event_number."""
    event = {"res_event_number": "88058"}
    row = build_recall_row(event, manufacturer_id=None, enforcement_map={})
    assert row["external_id"] == "88058"


# ---------------------------------------------------------------------------
# Manufacturer normalization (regression)
# ---------------------------------------------------------------------------

def test_canonicalize_strips_inc():
    assert canonicalize_manufacturer("Philips Respironics, Inc.") == "Philips Respironics"


def test_canonicalize_empty():
    assert canonicalize_manufacturer("") == ""


def test_slugify_basic():
    assert slugify("Philips Respironics") == "philips-respironics"


# ---------------------------------------------------------------------------
# parse_date
# ---------------------------------------------------------------------------

def test_parse_date_yyyymmdd():
    assert parse_date("20210614") == "2021-06-14"


def test_parse_date_iso():
    assert parse_date("2021-06-14") == "2021-06-14"


def test_parse_date_none():
    assert parse_date(None) is None


def test_parse_date_invalid():
    assert parse_date("not-a-date") is None
