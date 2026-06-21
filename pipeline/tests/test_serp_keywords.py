from pipelines.serp_intel_daily import SERP_SEARCH_TERMS


def test_motorcycle_keywords_present():
    assert "motorcycle" in SERP_SEARCH_TERMS
    assert len(SERP_SEARCH_TERMS["motorcycle"]) >= 2


def test_boating_keywords_present():
    assert "boating" in SERP_SEARCH_TERMS
    assert len(SERP_SEARCH_TERMS["boating"]) >= 2
