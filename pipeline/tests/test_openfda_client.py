"""Tests for lib.openfda_client — HTTP + retry + pagination plumbing.

These tests mock httpx at the network boundary; no live API calls are made.
"""
from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Supabase env vars are required by lib.pipeline (imported transitively for
# _retry_sleep). Provide harmless placeholders so import succeeds.
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-key")

from lib.openfda_client import (  # noqa: E402
    DEFAULT_BASE_URL,
    DEVICE_ENFORCEMENT_PATH,
    DEVICE_RECALL_PATH,
    DRUG_EVENT_PATH,
    OpenFDAClient,
    _default_cursor_extractor,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resp(status: int, *, json_body: dict | None = None) -> MagicMock:
    """Build a mock httpx.Response for a given status code."""
    r = MagicMock(spec=httpx.Response)
    r.status_code = status
    r.request = MagicMock(spec=httpx.Request)
    r.reason_phrase = "Mocked"
    r.json.return_value = json_body if json_body is not None else {}
    if status >= 400:
        r.raise_for_status.side_effect = httpx.HTTPStatusError(
            f"{status}", request=r.request, response=r,
        )
    else:
        r.raise_for_status.return_value = None
    return r


def _page(results: list[dict], total: int) -> dict:
    return {"results": results, "meta": {"results": {"total": total}}}


def _no_sleep():
    """Patch the jittered sleep so retry tests are fast."""
    return patch("lib.openfda_client._retry_sleep")


# ---------------------------------------------------------------------------
# Construction & env-var resolution
# ---------------------------------------------------------------------------

class TestConstruction:
    def test_default_base_url_when_env_unset(self, monkeypatch):
        monkeypatch.delenv("OPENFDA_BASE_URL", raising=False)
        client = OpenFDAClient()
        assert client.base_url == DEFAULT_BASE_URL

    def test_env_var_overrides_default(self, monkeypatch):
        monkeypatch.setenv("OPENFDA_BASE_URL", "https://api.aems.fda.gov/")
        client = OpenFDAClient()
        assert client.base_url == "https://api.aems.fda.gov"  # trailing slash stripped

    def test_constructor_arg_overrides_env(self, monkeypatch):
        monkeypatch.setenv("OPENFDA_BASE_URL", "https://api.aems.fda.gov")
        client = OpenFDAClient(base_url="https://custom.example.com")
        assert client.base_url == "https://custom.example.com"

    def test_api_key_from_env(self, monkeypatch):
        monkeypatch.setenv("OPENFDA_API_KEY", "secret-123")
        client = OpenFDAClient()
        assert client.api_key == "secret-123"

    def test_api_key_unset_means_none(self, monkeypatch):
        monkeypatch.delenv("OPENFDA_API_KEY", raising=False)
        client = OpenFDAClient()
        assert client.api_key is None

    def test_api_key_empty_string_env_treated_as_none(self, monkeypatch):
        monkeypatch.setenv("OPENFDA_API_KEY", "")
        client = OpenFDAClient()
        assert client.api_key is None

    def test_api_key_constructor_arg_can_force_anonymous(self, monkeypatch):
        monkeypatch.setenv("OPENFDA_API_KEY", "from-env")
        client = OpenFDAClient(api_key="")
        assert client.api_key is None

    def test_env_read_at_instantiation_not_module_load(self, monkeypatch):
        monkeypatch.setenv("OPENFDA_BASE_URL", "https://first.example.com")
        c1 = OpenFDAClient()
        monkeypatch.setenv("OPENFDA_BASE_URL", "https://second.example.com")
        c2 = OpenFDAClient()
        assert c1.base_url == "https://first.example.com"
        assert c2.base_url == "https://second.example.com"


# ---------------------------------------------------------------------------
# URL building (AEMS adapter)
# ---------------------------------------------------------------------------

class TestUrlBuilding:
    def test_build_url_default_base(self):
        client = OpenFDAClient(base_url=DEFAULT_BASE_URL)
        assert client.build_url(DEVICE_RECALL_PATH) == "https://api.fda.gov/device/recall.json"

    def test_build_url_handles_path_without_leading_slash(self):
        client = OpenFDAClient(base_url=DEFAULT_BASE_URL)
        assert client.build_url("device/recall.json") == "https://api.fda.gov/device/recall.json"

    def test_aems_base_url_flips_host_only(self):
        """One env-var flip swings the entire client to AEMS."""
        client = OpenFDAClient(base_url="https://api.aems.fda.gov")
        assert client.build_url(DEVICE_RECALL_PATH) == "https://api.aems.fda.gov/device/recall.json"
        assert client.build_url(DEVICE_ENFORCEMENT_PATH) == "https://api.aems.fda.gov/device/enforcement.json"
        assert client.build_url(DRUG_EVENT_PATH) == "https://api.aems.fda.gov/drug/event.json"


# ---------------------------------------------------------------------------
# fetch_page — happy path + 404 + auth injection
# ---------------------------------------------------------------------------

class TestFetchPage:
    def test_returns_results_and_total(self):
        client = OpenFDAClient()
        rows = [{"recall_number": "Z-1"}, {"recall_number": "Z-2"}]
        with patch("lib.openfda_client.httpx.get",
                   return_value=_resp(200, json_body=_page(rows, 42))):
            results, total = client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert results == rows
        assert total == 42

    def test_404_is_zero_results_not_error(self):
        """openFDA returns 404 for empty queries — surface as ([], 0)."""
        client = OpenFDAClient()
        with patch("lib.openfda_client.httpx.get", return_value=_resp(404)):
            results, total = client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert results == []
        assert total == 0

    def test_missing_meta_total_defaults_to_zero(self):
        client = OpenFDAClient()
        with patch("lib.openfda_client.httpx.get",
                   return_value=_resp(200, json_body={"results": [{"x": 1}]})):
            results, total = client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert results == [{"x": 1}]
        assert total == 0

    def test_api_key_injected_as_url_param(self):
        client = OpenFDAClient(api_key="secret-key")
        captured: dict = {}

        def fake_get(url, params, timeout):
            captured["params"] = params
            captured["url"] = url
            return _resp(200, json_body=_page([], 0))

        with patch("lib.openfda_client.httpx.get", side_effect=fake_get):
            client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert captured["params"]["api_key"] == "secret-key"
        assert captured["url"] == "https://api.fda.gov/device/recall.json"

    def test_no_api_key_means_no_api_key_param(self):
        client = OpenFDAClient(api_key="")  # force anonymous
        captured: dict = {}
        with patch("lib.openfda_client.httpx.get",
                   side_effect=lambda url, params, timeout: captured.update(params=params)
                   or _resp(200, json_body=_page([], 0))):
            client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert "api_key" not in captured["params"]

    def test_4xx_other_than_404_raises(self):
        client = OpenFDAClient()
        with patch("lib.openfda_client.httpx.get", return_value=_resp(400)):
            with pytest.raises(httpx.HTTPStatusError):
                client.fetch_page(DEVICE_RECALL_PATH, "search:foo")

    def test_skip_param_used_by_default(self):
        client = OpenFDAClient(api_key="")
        captured: dict = {}
        with patch("lib.openfda_client.httpx.get",
                   side_effect=lambda url, params, timeout: captured.update(params=params)
                   or _resp(200, json_body=_page([], 0))):
            client.fetch_page(DEVICE_RECALL_PATH, "search:foo", skip=300, limit=50)
        assert captured["params"]["skip"] == 300
        assert captured["params"]["limit"] == 50
        assert "search_after" not in captured["params"]

    def test_search_after_takes_precedence_over_skip(self):
        client = OpenFDAClient(api_key="")
        captured: dict = {}
        with patch("lib.openfda_client.httpx.get",
                   side_effect=lambda url, params, timeout: captured.update(params=params)
                   or _resp(200, json_body=_page([], 0))):
            client.fetch_page(
                DEVICE_RECALL_PATH, "search:foo",
                skip=300, search_after="cursor-x", sort="receivedate:asc",
            )
        assert captured["params"]["search_after"] == "cursor-x"
        assert captured["params"]["sort"] == "receivedate:asc"
        assert "skip" not in captured["params"]


# ---------------------------------------------------------------------------
# Retry / backoff
# ---------------------------------------------------------------------------

class TestRetry:
    def test_500_then_success_retries_silently(self, caplog):
        client = OpenFDAClient(retry_delays=(1, 1))
        responses = [_resp(500), _resp(200, json_body=_page([{"x": 1}], 1))]
        with patch("lib.openfda_client.httpx.get", side_effect=responses), _no_sleep():
            results, total = client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert results == [{"x": 1}]
        assert total == 1

    def test_500_retries_exhausted_then_raises(self):
        client = OpenFDAClient(retry_delays=(1, 1))
        # 3 attempts total (initial + 2 retries), all 500
        with patch("lib.openfda_client.httpx.get", return_value=_resp(500)), _no_sleep():
            with pytest.raises(httpx.HTTPStatusError):
                client.fetch_page(DEVICE_RECALL_PATH, "search:foo")

    def test_network_error_then_success(self):
        client = OpenFDAClient(retry_delays=(1, 1))
        ok = _resp(200, json_body=_page([], 0))
        side_effects = [httpx.ConnectTimeout("boom"), ok]
        with patch("lib.openfda_client.httpx.get", side_effect=side_effects), _no_sleep():
            results, _ = client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert results == []

    def test_network_error_exhausted_then_raises(self):
        client = OpenFDAClient(retry_delays=(1, 1))
        with patch("lib.openfda_client.httpx.get",
                   side_effect=httpx.ReadTimeout("nope")), _no_sleep():
            with pytest.raises(httpx.ReadTimeout):
                client.fetch_page(DEVICE_RECALL_PATH, "search:foo")

    def test_404_not_retried(self):
        client = OpenFDAClient(retry_delays=(1, 1))
        get = MagicMock(return_value=_resp(404))
        with patch("lib.openfda_client.httpx.get", get), _no_sleep():
            results, total = client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert results == []
        assert total == 0
        assert get.call_count == 1

    def test_400_not_retried(self):
        """Real client errors should fail fast — no point burning retries."""
        client = OpenFDAClient(retry_delays=(1, 1))
        get = MagicMock(return_value=_resp(400))
        with patch("lib.openfda_client.httpx.get", get), _no_sleep():
            with pytest.raises(httpx.HTTPStatusError):
                client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        assert get.call_count == 1

    def test_retry_emits_warning_log(self, caplog):
        """Silent retries hide flakiness — every retry must log a WARNING."""
        client = OpenFDAClient(retry_delays=(1, 1))
        responses = [_resp(500), _resp(200, json_body=_page([], 0))]
        with patch("lib.openfda_client.httpx.get", side_effect=responses), _no_sleep():
            with caplog.at_level("WARNING", logger="lib.openfda_client"):
                client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        retry_records = [r for r in caplog.records if "retry" in r.message.lower()]
        assert retry_records, "expected at least one WARNING about retry"
        msg = retry_records[0].message
        # Useful debug breadcrumbs in the message
        assert "1/" in msg              # attempt number
        assert "device/recall.json" in msg  # url
        assert "HTTP 500" in msg or "500" in msg  # error context

    def test_retry_uses_jittered_sleep(self):
        """retry_delays drive the jittered sleep — order preserved."""
        client = OpenFDAClient(retry_delays=(7, 13))
        responses = [_resp(500), _resp(500), _resp(200, json_body=_page([], 0))]
        with patch("lib.openfda_client.httpx.get", side_effect=responses), \
             patch("lib.openfda_client._retry_sleep") as mock_sleep:
            client.fetch_page(DEVICE_RECALL_PATH, "search:foo")
        # Two retries, with the configured base delays in order
        assert mock_sleep.call_count == 2
        assert mock_sleep.call_args_list[0].args == (7,)
        assert mock_sleep.call_args_list[1].args == (13,)


# ---------------------------------------------------------------------------
# paginate_skip
# ---------------------------------------------------------------------------

class TestPaginateSkip:
    def test_single_page(self):
        client = OpenFDAClient(api_key="")
        rows = [{"i": i} for i in range(3)]
        with patch("lib.openfda_client.httpx.get",
                   return_value=_resp(200, json_body=_page(rows, 3))), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_skip(DEVICE_RECALL_PATH, "s:x", page_size=100))
        assert len(pages) == 1
        assert pages[0][0] == rows
        assert pages[0][1] == 3

    def test_stops_at_short_page(self):
        """Short page indicates end of results."""
        client = OpenFDAClient(api_key="")
        full = _resp(200, json_body=_page([{"i": i} for i in range(100)], 250))
        short = _resp(200, json_body=_page([{"i": i} for i in range(50)], 250))
        with patch("lib.openfda_client.httpx.get", side_effect=[full, short]), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_skip(DEVICE_RECALL_PATH, "s:x", page_size=100))
        assert len(pages) == 2
        assert sum(len(p[0]) for p in pages) == 150

    def test_stops_when_skip_reaches_total(self):
        client = OpenFDAClient(api_key="")
        full = _resp(200, json_body=_page([{"i": i} for i in range(100)], 100))
        with patch("lib.openfda_client.httpx.get", return_value=full), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_skip(DEVICE_RECALL_PATH, "s:x", page_size=100))
        assert len(pages) == 1  # never makes the would-be-empty 2nd call

    def test_max_pages_safety_cap(self):
        client = OpenFDAClient(api_key="")
        full = _resp(200, json_body=_page([{"i": i} for i in range(100)], 9999))
        with patch("lib.openfda_client.httpx.get", return_value=full), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_skip(
                DEVICE_RECALL_PATH, "s:x", page_size=100, max_pages=3,
            ))
        assert len(pages) == 3

    def test_empty_first_page_yields_nothing(self):
        client = OpenFDAClient(api_key="")
        with patch("lib.openfda_client.httpx.get", return_value=_resp(404)):
            pages = list(client.paginate_skip(DEVICE_RECALL_PATH, "s:x"))
        assert pages == []

    def test_skip_advances_per_call(self):
        client = OpenFDAClient(api_key="")
        captured: list[int] = []

        def fake_get(url, params, timeout):
            captured.append(params["skip"])
            if params["skip"] >= 200:
                return _resp(404)
            return _resp(200, json_body=_page([{"i": i} for i in range(100)], 250))

        with patch("lib.openfda_client.httpx.get", side_effect=fake_get), \
             patch("lib.openfda_client.time.sleep"):
            list(client.paginate_skip(DEVICE_RECALL_PATH, "s:x", page_size=100))
        assert captured == [0, 100, 200]


# ---------------------------------------------------------------------------
# paginate_search_after
# ---------------------------------------------------------------------------

class TestPaginateSearchAfter:
    def test_requires_sort(self):
        client = OpenFDAClient()
        with pytest.raises(ValueError):
            list(client.paginate_search_after(DRUG_EVENT_PATH, "s:x", sort=""))

    def test_single_page_stops(self):
        client = OpenFDAClient(api_key="")
        rows = [{"receivedate": "20240101"}, {"receivedate": "20240102"}]
        with patch("lib.openfda_client.httpx.get",
                   return_value=_resp(200, json_body=_page(rows, 2))), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_search_after(
                DRUG_EVENT_PATH, "s:x", sort="receivedate:asc", page_size=100,
            ))
        assert len(pages) == 1
        assert pages[0][0] == rows

    def test_cursor_is_last_record_sort_value(self):
        """Second page uses the last record's sort-field value as search_after."""
        client = OpenFDAClient(api_key="")
        captured: list[dict] = []

        page_one_rows = [{"receivedate": "20240101"}] * 99 + [{"receivedate": "20240115"}]
        page_two_rows = [{"receivedate": "20240116"}, {"receivedate": "20240117"}]

        def fake_get(url, params, timeout):
            captured.append(dict(params))
            if "search_after" not in params:
                return _resp(200, json_body=_page(page_one_rows, 200))
            return _resp(200, json_body=_page(page_two_rows, 200))

        with patch("lib.openfda_client.httpx.get", side_effect=fake_get), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_search_after(
                DRUG_EVENT_PATH, "s:x", sort="receivedate:asc", page_size=100,
            ))

        assert len(pages) == 2
        # Second call carries the last record of page one as the cursor
        assert captured[1]["search_after"] == "20240115"
        # First call must NOT carry search_after
        assert "search_after" not in captured[0]

    def test_stops_on_short_page(self):
        client = OpenFDAClient(api_key="")
        page_one = [{"receivedate": f"2024010{i}"} for i in range(1, 10)]  # 9 < 100
        with patch("lib.openfda_client.httpx.get",
                   return_value=_resp(200, json_body=_page(page_one, 9))), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_search_after(
                DRUG_EVENT_PATH, "s:x", sort="receivedate:asc", page_size=100,
            ))
        assert len(pages) == 1

    def test_stops_when_cursor_field_missing(self):
        """If the sort field is missing on the last record, we'd loop forever."""
        client = OpenFDAClient(api_key="")
        full_no_cursor = [{"i": i} for i in range(100)]  # no `receivedate`
        with patch("lib.openfda_client.httpx.get",
                   return_value=_resp(200, json_body=_page(full_no_cursor, 9999))), \
             patch("lib.openfda_client.time.sleep"):
            pages = list(client.paginate_search_after(
                DRUG_EVENT_PATH, "s:x", sort="receivedate:asc", page_size=100, max_pages=10,
            ))
        assert len(pages) == 1


# ---------------------------------------------------------------------------
# _default_cursor_extractor
# ---------------------------------------------------------------------------

class TestCursorExtractor:
    def test_flat_field(self):
        assert _default_cursor_extractor({"a": 1}, "a") == 1

    def test_nested_field(self):
        record = {"patient": {"patientonsetage": 47}}
        assert _default_cursor_extractor(record, "patient.patientonsetage") == 47

    def test_missing_field_returns_none(self):
        assert _default_cursor_extractor({}, "a") is None

    def test_partial_path_returns_none(self):
        assert _default_cursor_extractor({"a": 1}, "a.b") is None
