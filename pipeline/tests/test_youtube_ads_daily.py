import json

from pipelines.youtube_ads_daily import _creatives_to_rows, _date_part
from lib.domain_mapper import DomainMapper


def _empty_mapper():
    # No advertiser_entities → advertiser_id stays None (domain-keyed table).
    return DomainMapper([])


def test_date_part_handles_missing_and_iso():
    assert _date_part(None) is None
    assert _date_part("") is None
    assert _date_part("2026-06-21T23:15:45Z") == "2026-06-21"


def test_creatives_to_rows_parses_core_fields():
    creatives = [{
        "id": "CR123",
        "target_domain": "forthepeople.com",
        "advertiser": {"id": "AR999", "name": "Morgan & Morgan, P.A."},
        "first_shown_datetime": "2026-01-28T21:06:34Z",
        "last_shown_datetime": "2026-06-21T23:15:45Z",
        "total_days_shown": 145,
        "format": "video",
        "details_link": "https://adstransparency.google.com/x",
    }]
    rows = _creatives_to_rows(creatives, "forthepeople.com", _empty_mapper())
    assert len(rows) == 1
    r = rows[0]
    assert r["creative_id"] == "CR123"
    assert r["advertiser_domain"] == "forthepeople.com"
    assert r["advertiser_name"] == "Morgan & Morgan, P.A."
    assert r["advertiser_ar_id"] == "AR999"
    assert r["advertiser_id"] is None
    assert r["target_domain"] == "forthepeople.com"
    assert r["ad_format"] == "video"
    assert r["first_shown"] == "2026-01-28"
    assert r["last_shown"] == "2026-06-21"
    assert r["total_days_shown"] == 145
    assert r["region"] == "US"
    assert json.loads(r["raw_json"])["id"] == "CR123"


def test_creatives_missing_id_are_skipped():
    creatives = [{"advertiser": {"name": "No Id LLC"}, "format": "video"}]
    rows = _creatives_to_rows(creatives, "example.com", _empty_mapper())
    assert rows == []
