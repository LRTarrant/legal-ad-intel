"""
Tests for the landing-page classifier waterfall.

Covers:
  - Allow-list short-circuit
  - Deny-list (aggregator, .gov, manufacturer) short-circuit
  - Heuristic scoring at 0, 2, and 3+ signals (with OpenAI mock for ties)
  - Failed HTML fetch surfaces an error
"""
import os
import sys
from unittest.mock import MagicMock, patch

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Disable Supabase writes in api_usage during tests.
os.environ["DRY_RUN"] = "true"

from lib.landing_page_classifier import (  # noqa: E402
    classify_domain, _score_heuristic,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _mock_html_client(html_body: str, status: int = 200):
    """Build a MagicMock httpx.Client that returns html_body in a stream."""
    client = MagicMock(spec=httpx.Client)

    class _StreamCtx:
        def __init__(self):
            self.status_code = status

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def iter_bytes(self, _chunk_size):
            yield html_body.encode("utf-8")

    client.stream.return_value = _StreamCtx()
    return client


LAW_FIRM_HTML = """
<html><body>
<h1>Smith & Smith — Personal Injury Attorneys</h1>
<p>Attorney advertising. Prior results do not guarantee a similar outcome.</p>
<p>Our trial lawyers offer a free case evaluation. No fee unless we win.</p>
<script type="application/ld+json">{"@type": "LegalService", "name": "Smith Law"}</script>
<footer>Admitted to the Bar of the State of New York. Licensed to practice in NY, NJ.</footer>
</body></html>
"""

NEUTRAL_HTML = "<html><body><h1>About</h1><p>We sell widgets.</p></body></html>"


# ---------------------------------------------------------------------------
# Allow-list
# ---------------------------------------------------------------------------

def test_allow_list_short_circuits():
    result = classify_domain(
        "knownfirm.com", sample_url="https://knownfirm.com/talc/",
        allow_list_domains=frozenset({"knownfirm.com"}),
        manufacturer_domains=frozenset(),
        called_from="test",
    )
    assert result.source == "allow_list"
    assert result.is_law_firm is True
    assert result.confidence == "high"
    assert result.classification_status == "confirmed"


# ---------------------------------------------------------------------------
# Deny-list
# ---------------------------------------------------------------------------

def test_deny_list_aggregator():
    result = classify_domain(
        "avvo.com", sample_url="https://avvo.com/talc-lawyers",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset(),
        called_from="test",
    )
    assert result.source == "deny_list"
    assert result.is_law_firm is False
    assert result.classification_status == "denied"


def test_deny_list_gov_tld():
    result = classify_domain(
        "fda.gov", sample_url="https://fda.gov/talc-warning",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset(),
        called_from="test",
    )
    assert result.source == "deny_list"
    assert result.is_law_firm is False


def test_deny_list_manufacturer():
    result = classify_domain(
        "johnson-and-johnson.com", sample_url="https://johnson-and-johnson.com/talc",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset({"johnson-and-johnson.com"}),
        called_from="test",
    )
    assert result.source == "deny_list"
    assert result.is_law_firm is False


# ---------------------------------------------------------------------------
# Heuristic
# ---------------------------------------------------------------------------

def test_heuristic_high_signal_score():
    score, matched = _score_heuristic(LAW_FIRM_HTML)
    assert score >= 4
    assert "attorney_advertising_disclaimer" in matched
    assert "schema_legal_service" in matched


def test_heuristic_no_signals():
    score, matched = _score_heuristic(NEUTRAL_HTML)
    assert score == 0
    assert matched == []


def test_full_waterfall_high_signal_confirms():
    client = _mock_html_client(LAW_FIRM_HTML)
    result = classify_domain(
        "newfirm.com", sample_url="https://newfirm.com/talc/",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset(),
        called_from="test",
        http_client=client,
    )
    assert result.source == "heuristic"
    assert result.is_law_firm is True
    assert result.signal_score >= 3
    assert result.classification_status == "confirmed"


def test_full_waterfall_zero_signal_denies():
    client = _mock_html_client(NEUTRAL_HTML)
    result = classify_domain(
        "widgets.com", sample_url="https://widgets.com/about",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset(),
        called_from="test",
        http_client=client,
    )
    assert result.source == "heuristic"
    assert result.is_law_firm is False
    assert result.signal_score == 0
    assert result.classification_status == "denied"


# ---------------------------------------------------------------------------
# Tied score (2 signals) → OpenAI fallback
# ---------------------------------------------------------------------------

TIED_HTML = """
<html><body>
<h1>About our practice</h1>
<p>Free case evaluation available.</p>
<footer>Admitted to the Bar.</footer>
</body></html>
"""


def test_tied_score_falls_through_to_openai(monkeypatch):
    """When the heuristic scores exactly 2, OpenAI is called."""
    score, matched = _score_heuristic(TIED_HTML)
    assert score == 2  # invariant the test depends on

    fake_resp = {
        "choices": [{"message": {"content": '{"is_law_firm": true, "confidence": "high"}'}}],
        "usage": {"prompt_tokens": 100, "completion_tokens": 10},
    }

    def mock_post(*args, **kwargs):
        m = MagicMock()
        m.status_code = 200
        m.json = lambda: fake_resp
        return m

    monkeypatch.setattr("lib.landing_page_classifier.httpx.post", mock_post)

    client = _mock_html_client(TIED_HTML)
    result = classify_domain(
        "ambiguous.com", sample_url="https://ambiguous.com/about",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset(),
        called_from="test",
        http_client=client,
        openai_api_key="sk-test",
    )
    assert result.source == "openai"
    assert result.is_law_firm is True
    assert result.classification_status == "confirmed"


def test_tied_score_no_openai_key_returns_candidate():
    """Without an OpenAI key, a 2-signal hit surfaces as a low-confidence
    heuristic verdict (the tort_landing_pages row will be marked confirmed
    by the wrapper but with confidence=low so the UI can de-emphasize it)."""
    client = _mock_html_client(TIED_HTML)
    result = classify_domain(
        "ambiguous.com", sample_url="https://ambiguous.com/about",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset(),
        called_from="test",
        http_client=client,
        openai_api_key=None,
    )
    assert result.source == "heuristic"
    assert result.signal_score == 2
    assert result.confidence == "low"


# ---------------------------------------------------------------------------
# Failed HTML fetch
# ---------------------------------------------------------------------------

def test_http_error_marks_error():
    client = _mock_html_client("", status=503)
    result = classify_domain(
        "downhost.com", sample_url="https://downhost.com/",
        allow_list_domains=frozenset(),
        manufacturer_domains=frozenset(),
        called_from="test",
        http_client=client,
    )
    assert result.error is not None
    assert result.classification_status == "error"
