from pipelines.serp_metro_daily import _extract_organic, SEO_TORT_QUERIES


def test_extract_organic_maps_fields_and_dma():
    serp = {
        "organic_results": [
            {"position": 1, "link": "https://www.forthepeople.com/car-accidents", "title": "Morgan & Morgan", "snippet": "Injured? Call us."},
            {"position": 2, "link": "https://nolo.com/legal-encyclopedia", "title": "Nolo", "snippet": "Legal info"},
            {"position": 3, "title": "no link -> dropped"},
        ]
    }
    rows = _extract_organic(serp, "630", "motor_vehicle", "car accident lawyer")
    assert len(rows) == 2  # the no-link row is dropped
    r = rows[0]
    assert r["domain"] == "forthepeople.com"
    assert r["dma_code"] == "630"
    assert r["tort_slug"] == "motor_vehicle"
    assert r["result_type"] == "organic"
    assert r["position"] == 1
    assert r["query"] == "car accident lawyer"
    assert r["page"] == 1
    assert r["link"].startswith("https://")


def test_extract_organic_empty():
    assert _extract_organic({}, "630", "motorcycle", "q") == []
    assert _extract_organic({"organic_results": []}, "630", "motorcycle", "q") == []


def test_seo_tort_queries_cover_the_six_seo_case_types():
    assert set(SEO_TORT_QUERIES) == {
        "motor_vehicle", "truck_accident", "motorcycle",
        "boating", "nursing_home", "workers_comp",
    }
