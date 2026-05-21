"""Tests for _bulk_insert chunk sizing and per-chunk retry logic."""
import os
import sys
from unittest.mock import MagicMock, patch

import httpx
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure lib is importable and DRY_RUN is off
os.environ.pop("DRY_RUN", None)

from lib.pipeline import _bulk_insert, BULK_CHUNK_SIZE, _BULK_CHUNK_RETRY_DELAYS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(status_code: int, text: str = "") -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.text = text
    if status_code >= 400:
        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            f"Error {status_code}", request=MagicMock(), response=resp
        )
    else:
        resp.raise_for_status.return_value = None
    return resp


def _rows(n: int) -> list[dict]:
    return [{"id": i, "val": f"v{i}"} for i in range(n)]


# ---------------------------------------------------------------------------
# Basic chunking behaviour
# ---------------------------------------------------------------------------

def test_single_chunk_success():
    """3 rows with chunk_size=10 → one POST call, returns 3."""
    ok = _make_response(201)
    with patch("lib.pipeline.httpx.post", return_value=ok) as mock_post:
        result = _bulk_insert("test_table", _rows(3), chunk_size=10)
    assert result == 3
    assert mock_post.call_count == 1


def test_multi_chunk_success():
    """5 rows with chunk_size=2 → three POST calls (2+2+1), returns 5."""
    ok = _make_response(201)
    with patch("lib.pipeline.httpx.post", return_value=ok) as mock_post:
        result = _bulk_insert("test_table", _rows(5), chunk_size=2)
    assert result == 5
    assert mock_post.call_count == 3


def test_chunk_size_param_splits_correctly():
    """10 rows with chunk_size=3 → 4 POST calls (3+3+3+1)."""
    ok = _make_response(201)
    with patch("lib.pipeline.httpx.post", return_value=ok) as mock_post:
        result = _bulk_insert("test_table", _rows(10), chunk_size=3)
    assert result == 10
    assert mock_post.call_count == 4


def test_empty_rows_returns_zero_without_posting():
    with patch("lib.pipeline.httpx.post") as mock_post:
        result = _bulk_insert("test_table", [])
    assert result == 0
    mock_post.assert_not_called()


# ---------------------------------------------------------------------------
# 4xx: no retry
# ---------------------------------------------------------------------------

def test_400_raises_immediately_no_retry():
    """A 400 client error raises on the first attempt; no sleep, no retry."""
    bad = _make_response(400, "bad request")
    with patch("lib.pipeline.httpx.post", return_value=bad), \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        with pytest.raises(httpx.HTTPStatusError):
            _bulk_insert("test_table", _rows(3), chunk_size=10)
    mock_sleep.assert_not_called()


def test_404_raises_immediately_no_retry():
    bad = _make_response(404, "not found")
    with patch("lib.pipeline.httpx.post", return_value=bad), \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        with pytest.raises(httpx.HTTPStatusError):
            _bulk_insert("test_table", _rows(3), chunk_size=10)
    mock_sleep.assert_not_called()


# ---------------------------------------------------------------------------
# 5xx: retry with backoff
# ---------------------------------------------------------------------------

def _sleep_args(mock_sleep) -> list[float]:
    """Return the positional float arg passed to each time.sleep call."""
    return [c.args[0] for c in mock_sleep.call_args_list]


def _assert_jittered(actual: float, base: int) -> None:
    """Each retry sleeps `base + uniform(0, 0.25 * base)` seconds."""
    assert base <= actual <= base * 1.25 + 1e-6, (
        f"expected ~{base}s (+25% jitter), got {actual}s"
    )


def test_500_retries_exhausted_then_raises():
    """1 initial + len(delays) retries on persistent 500 → raises."""
    err = _make_response(500, "internal server error")
    with patch("lib.pipeline.httpx.post", return_value=err), \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        with pytest.raises(httpx.HTTPStatusError):
            _bulk_insert("test_table", _rows(3), chunk_size=10)
    assert mock_sleep.call_count == len(_BULK_CHUNK_RETRY_DELAYS)
    for actual, base in zip(_sleep_args(mock_sleep), _BULK_CHUNK_RETRY_DELAYS):
        _assert_jittered(actual, base)


def test_500_retries_total_post_count():
    """1 initial + 3 retries = 4 total httpx.post calls on a single chunk."""
    err = _make_response(500)
    with patch("lib.pipeline.httpx.post", return_value=err) as mock_post, \
         patch("lib.pipeline.time.sleep"):
        with pytest.raises(httpx.HTTPStatusError):
            _bulk_insert("test_table", _rows(3), chunk_size=10)
    # 1 initial + 3 retries
    assert mock_post.call_count == len(_BULK_CHUNK_RETRY_DELAYS) + 1


def test_500_total_post_calls_via_mock():
    """Explicit post-call count via mock — confirms 4 attempts on single chunk."""
    err = _make_response(500)
    with patch("lib.pipeline.httpx.post", return_value=err) as mock_post, \
         patch("lib.pipeline.time.sleep"):
        with pytest.raises(httpx.HTTPStatusError):
            _bulk_insert("test_table", _rows(3), chunk_size=10)
    assert mock_post.call_count == len(_BULK_CHUNK_RETRY_DELAYS) + 1


def test_chunk_fails_twice_then_succeeds():
    """Two 500s then a 201 on a single chunk → succeeds, returns row count."""
    err = _make_response(500)
    ok = _make_response(201)
    responses = [err, err, ok]
    with patch("lib.pipeline.httpx.post", side_effect=responses) as mock_post, \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        result = _bulk_insert("test_table", _rows(3), chunk_size=10)
    assert result == 3
    assert mock_post.call_count == 3
    assert mock_sleep.call_count == 2
    for actual, base in zip(_sleep_args(mock_sleep), _BULK_CHUNK_RETRY_DELAYS[:2]):
        _assert_jittered(actual, base)


# ---------------------------------------------------------------------------
# Network errors: retry
# ---------------------------------------------------------------------------

def test_connect_timeout_retries_then_raises():
    """httpx.ConnectTimeout retries and eventually re-raises."""
    with patch("lib.pipeline.httpx.post", side_effect=httpx.ConnectTimeout("timeout")), \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        with pytest.raises(httpx.ConnectTimeout):
            _bulk_insert("test_table", _rows(3), chunk_size=10)
    assert mock_sleep.call_count == len(_BULK_CHUNK_RETRY_DELAYS)


def test_network_error_retries_then_raises():
    """httpx.NetworkError retries and eventually re-raises."""
    with patch("lib.pipeline.httpx.post", side_effect=httpx.NetworkError("net error")), \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        with pytest.raises(httpx.NetworkError):
            _bulk_insert("test_table", _rows(3), chunk_size=10)
    assert mock_sleep.call_count == len(_BULK_CHUNK_RETRY_DELAYS)


def test_network_error_then_success():
    """One ConnectTimeout then a 201 → succeeds."""
    ok = _make_response(201)
    with patch("lib.pipeline.httpx.post",
               side_effect=[httpx.ConnectTimeout("t/o"), ok]) as mock_post, \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        result = _bulk_insert("test_table", _rows(3), chunk_size=10)
    assert result == 3
    assert mock_post.call_count == 2
    assert mock_sleep.call_count == 1
    _assert_jittered(_sleep_args(mock_sleep)[0], _BULK_CHUNK_RETRY_DELAYS[0])


# ---------------------------------------------------------------------------
# Backoff timing constants
# ---------------------------------------------------------------------------

def test_retry_delay_sequence():
    """Backoff delays follow _BULK_CHUNK_RETRY_DELAYS in order, with jitter."""
    err = _make_response(500)
    ok = _make_response(201)
    responses = [err] * len(_BULK_CHUNK_RETRY_DELAYS) + [ok]
    with patch("lib.pipeline.httpx.post", side_effect=responses), \
         patch("lib.pipeline.time.sleep") as mock_sleep:
        _bulk_insert("test_table", _rows(1), chunk_size=10)
    assert mock_sleep.call_count == len(_BULK_CHUNK_RETRY_DELAYS)
    for actual, base in zip(_sleep_args(mock_sleep), _BULK_CHUNK_RETRY_DELAYS):
        _assert_jittered(actual, base)


# ---------------------------------------------------------------------------
# RECALLS_UPSERT_CHUNK_SIZE env var wired through in recalls script
# ---------------------------------------------------------------------------

def test_recalls_chunk_size_env_var_default():
    """Default RECALLS_UPSERT_CHUNK_SIZE is 200 when env var is absent."""
    os.environ.pop("RECALLS_UPSERT_CHUNK_SIZE", None)
    # Re-import to pick up fresh env state
    import importlib
    import pipelines.openfda_device_recalls as mod
    importlib.reload(mod)
    assert mod.RECALLS_UPSERT_CHUNK_SIZE == 200


def test_recalls_chunk_size_env_var_override():
    """RECALLS_UPSERT_CHUNK_SIZE env var overrides the default."""
    os.environ["RECALLS_UPSERT_CHUNK_SIZE"] = "50"
    import importlib
    import pipelines.openfda_device_recalls as mod
    importlib.reload(mod)
    assert mod.RECALLS_UPSERT_CHUNK_SIZE == 50
    os.environ.pop("RECALLS_UPSERT_CHUNK_SIZE", None)
