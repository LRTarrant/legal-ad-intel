import json

from pipelines.meta_ads_daily import _ads_to_rows, _date_part


def test_date_part_handles_missing_and_iso():
    assert _date_part(None) is None
    assert _date_part("") is None
    assert _date_part("2024-10-21T07:00:00Z") == "2024-10-21"


def test_ads_to_rows_parses_core_fields():
    ads = [{
        "ad_archive_id": "2241585879557827",
        "page_id": "171489872877097",
        "page_name": "Law Offices of Gary Martin Hays & Associates, P.C.",
        "start_date": "2024-10-21T07:00:00Z",
        "end_date": "2026-06-22T07:00:00Z",
        "is_active": True,
        "publisher_platform": ["FACEBOOK", "INSTAGRAM"],
        "collation_count": 1,
        "snapshot": {"title": "Injured?"},
    }]
    rows = _ads_to_rows(ads, "motor_vehicle", "car accident lawyer")
    assert len(rows) == 1
    r = rows[0]
    assert r["ad_archive_id"] == "2241585879557827"
    assert r["page_id"] == "171489872877097"
    assert r["page_name"].startswith("Law Offices")
    assert r["case_type"] == "motor_vehicle"
    assert r["keyword"] == "car accident lawyer"
    assert r["start_date"] == "2024-10-21"
    assert r["end_date"] == "2026-06-22"
    assert r["is_active"] is True
    assert r["publisher_platforms"] == ["FACEBOOK", "INSTAGRAM"]
    assert r["collation_count"] == 1
    assert r["country"] == "US"
    assert json.loads(r["raw_json"])["ad_archive_id"] == "2241585879557827"


def test_ads_missing_id_are_skipped():
    rows = _ads_to_rows([{"page_name": "No Id LLC"}], "motor_vehicle", "kw")
    assert rows == []


def test_envelope_ads_key_parses_through():
    # Locks in the SearchApi meta_ad_library envelope: ads under top-level "ads".
    envelope = {
        "ads": [{
            "ad_archive_id": "X1",
            "page_name": "Firm",
            "start_date": "2025-01-01T00:00:00Z",
        }],
        "pagination": {},
        "search_information": {"total_results": 100},
    }
    rows = _ads_to_rows(envelope.get("ads", []), "truck_accident", "truck accident lawyer")
    assert len(rows) == 1
    assert rows[0]["ad_archive_id"] == "X1"
