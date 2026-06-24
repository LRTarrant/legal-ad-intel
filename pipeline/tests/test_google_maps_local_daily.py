from pipelines.google_maps_local_daily import (
    _parse_state,
    _extract_local,
    GMAPS_QUERIES,
)


def test_parse_state_from_address():
    assert _parse_state("2 20th St N Suite 100, Birmingham, AL 35203") == "AL"
    assert _parse_state("123 Main St, Mobile, AL 36602-1234") == "AL"  # ZIP+4
    assert _parse_state("100 Peachtree St NW, Atlanta, GA 30303") == "GA"


def test_parse_state_misses_are_none():
    assert _parse_state(None) is None
    assert _parse_state("") is None
    assert _parse_state("Birmingham, Alabama") is None  # no ZIP -> no match


def test_extract_local_fields_and_state():
    metro = {"id": "uuid-1", "dma_code": "630"}
    data = {
        "local_results": [
            {
                "place_id": "P1",
                "title": "Hollis Wright",
                "website": "https://www.hollis-wright.com/birmingham",
                "address": "2 20th St N, Birmingham, AL 35203",
                "gps_coordinates": {"latitude": 33.52, "longitude": -86.80},
                "rating": 4.9,
                "reviews": 412,
            },
            {  # no place_id -> dropped
                "title": "No place id",
                "address": "1 Main St, Birmingham, AL 35203",
            },
        ]
    }
    rows = _extract_local(data, metro, "personal injury lawyer")
    assert len(rows) == 1  # the place_id-less row is dropped
    r = rows[0]
    assert r["place_id"] == "P1"
    assert r["domain"] == "hollis-wright.com"  # normalized from website
    assert r["state"] == "AL"
    assert r["metro_id"] == "uuid-1"
    assert r["dma_code"] == "630"
    assert r["rating"] == 4.9
    assert r["reviews"] == 412
    assert r["latitude"] == 33.52
    assert r["query"] == "personal injury lawyer"


def test_extract_local_without_website_keeps_row_null_domain():
    metro = {"id": "uuid-2", "dma_code": "686"}
    data = {"local_results": [{
        "place_id": "P2", "title": "No Site Firm",
        "address": "5 Bay St, Mobile, AL 36602",
    }]}
    rows = _extract_local(data, metro, "car accident lawyer")
    assert len(rows) == 1
    assert rows[0]["domain"] is None  # listing with no website still recorded
    assert rows[0]["state"] == "AL"


def test_extract_local_empty():
    assert _extract_local({}, {"id": "x", "dma_code": "1"}, "q") == []
    assert _extract_local({"local_results": []}, {"id": "x", "dma_code": "1"}, "q") == []


def test_gmaps_queries_are_pi_focused():
    assert "personal injury lawyer" in GMAPS_QUERIES
    assert all(isinstance(q, str) and q for q in GMAPS_QUERIES)
