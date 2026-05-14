"""Tests for openfda_device_recalls — enforcement endpoint join logic."""
import os
import sys
from unittest.mock import MagicMock, patch

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Supabase env vars required by lib.pipeline at import time
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-key")

from pipelines.openfda_device_recalls import (
    _severity_for_recall,
    build_recall_row,
    canonicalize_manufacturer,
    slugify,
    parse_date,
    fetch_recalls,
    fetch_enforcement_classifications,
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


# ---------------------------------------------------------------------------
# Behavior preservation — fetch_recalls / fetch_enforcement_classifications
# through the new shared client. These exist to catch any regression
# introduced by the openfda_client refactor.
# ---------------------------------------------------------------------------

def _mock_resp(status: int, json_body: dict | None = None) -> MagicMock:
    r = MagicMock(spec=httpx.Response)
    r.status_code = status
    r.request = MagicMock(spec=httpx.Request)
    r.json.return_value = json_body or {}
    if status >= 400:
        r.raise_for_status.side_effect = httpx.HTTPStatusError(
            f"{status}", request=r.request, response=r,
        )
    else:
        r.raise_for_status.return_value = None
    return r


def _ofda_page(results: list[dict], total: int) -> dict:
    return {"results": results, "meta": {"results": {"total": total}}}


def test_fetch_recalls_paginates_and_flattens():
    """fetch_recalls should walk pages and return all rows flattened."""
    page1 = _mock_resp(200, _ofda_page([{"product_res_number": f"Z-{i}"} for i in range(100)], 150))
    page2 = _mock_resp(200, _ofda_page([{"product_res_number": f"Z-{i}"} for i in range(100, 150)], 150))
    with patch("lib.openfda_client.httpx.get", side_effect=[page1, page2]), \
         patch("lib.openfda_client.time.sleep"):
        rows = fetch_recalls("2024-01-01")
    assert len(rows) == 150
    assert rows[0]["product_res_number"] == "Z-0"
    assert rows[-1]["product_res_number"] == "Z-149"


def test_fetch_recalls_handles_zero_results():
    """openFDA 404 for empty query must surface as empty list, not error."""
    with patch("lib.openfda_client.httpx.get", return_value=_mock_resp(404)):
        rows = fetch_recalls("2024-01-01")
    assert rows == []


def test_fetch_enforcement_classifications_builds_severity_map():
    """Only Class I/II/III records with a non-empty recall_number should land."""
    page = _mock_resp(200, _ofda_page([
        {"recall_number": "Z-1", "classification": "Class I"},
        {"recall_number": "Z-2", "classification": "Class II"},
        {"recall_number": "Z-3", "classification": "Class III"},
        {"recall_number": "Z-4", "classification": "Not In Effect"},  # rejected
        {"recall_number": "", "classification": "Class I"},  # rejected (no rn)
    ], 5))
    with patch("lib.openfda_client.httpx.get", return_value=page), \
         patch("lib.openfda_client.time.sleep"):
        m = fetch_enforcement_classifications("2024-01-01")
    assert m == {"Z-1": "Class I", "Z-2": "Class II", "Z-3": "Class III"}


def test_fetch_enforcement_classifications_handles_empty():
    """Empty / 404 response yields an empty map (downstream raises on this)."""
    with patch("lib.openfda_client.httpx.get", return_value=_mock_resp(404)):
        m = fetch_enforcement_classifications("2024-01-01")
    assert m == {}
