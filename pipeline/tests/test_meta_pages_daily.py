from pipelines.meta_pages_daily import classify_case_type, _snapshot_body, _ad_to_row


def test_classify_case_type_specific_before_generic():
    # "truck accident" must win over the generic car-accident bucket
    assert classify_case_type("Injured in an 18-wheeler accident?") == "truck_accident"
    assert classify_case_type("Hurt in a truck crash") == "truck_accident"
    assert classify_case_type("Motorcycle accident lawyer") == "motorcycle"
    assert classify_case_type("Nursing home abuse?") == "nursing_home"
    assert classify_case_type("Workers compensation claim denied?") == "workers_comp"
    assert classify_case_type("Boating accident on the lake") == "boating"
    assert classify_case_type("Car accident? Free case review") == "motor_vehicle"


def test_classify_case_type_defaults_to_general_pi():
    assert classify_case_type("We fight for the injured. Free consult.") == "general_pi"
    assert classify_case_type("") == "general_pi"
    assert classify_case_type(None) == "general_pi"


def test_snapshot_body_handles_shapes():
    assert _snapshot_body({"snapshot": {"body": {"text": "hi there"}}}) == "hi there"
    assert _snapshot_body({"snapshot": {"body": "plain string"}}) == "plain string"
    assert _snapshot_body({"snapshot": {}}) == ""
    assert _snapshot_body({}) == ""


def test_ad_to_row_classifies_and_tags_page_scan():
    ad = {
        "ad_archive_id": "999",
        "page_id": "p1",
        "page_name": "Test Firm",
        "snapshot": {"body": {"text": "Truck accident? Call us."}},
        "start_date": "2025-01-01T00:00:00Z",
        "is_active": True,
    }
    row = _ad_to_row(ad)
    assert row["ad_archive_id"] == "999"
    assert row["case_type"] == "truck_accident"
    assert row["keyword"] == "page_scan"
    assert row["start_date"] == "2025-01-01"
    assert _ad_to_row({"page_id": "x"}) is None  # no ad_archive_id
