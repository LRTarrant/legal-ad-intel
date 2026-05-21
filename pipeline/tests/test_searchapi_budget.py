"""
Tests for the Searchapi budget guardrail.

Verifies threshold logic without hitting Supabase: get_budget_status is
patched to return canned states, and we assert the right exception /
side effect.
"""
import os
import sys
from datetime import date
from unittest.mock import patch

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.searchapi_budget import (  # noqa: E402
    BudgetExceeded, BudgetStatus, assert_budget_ok,
)


def _make_status(used, quota, projected):
    pct_used = used / quota if quota else 0.0
    pct_projected = projected / quota if quota else 0.0
    return BudgetStatus(
        used_this_month=used,
        monthly_quota=quota,
        projected_total=projected,
        pct_used=pct_used,
        pct_projected=pct_projected,
        days_remaining_in_month=10,
    )


@patch("lib.searchapi_budget.get_budget_status")
def test_assert_ok_under_threshold(mock_status):
    mock_status.return_value = _make_status(used=2000, quota=10000, projected=4000)
    result = assert_budget_ok(additional_calls_planned=625)
    assert result.pct_projected == 0.4


@patch("lib.searchapi_budget.get_budget_status")
def test_assert_ok_at_warning_threshold(mock_status, caplog):
    mock_status.return_value = _make_status(used=8500, quota=10000, projected=9000)
    with caplog.at_level("WARNING"):
        assert_budget_ok(additional_calls_planned=500, warning_threshold=0.85)
    assert any("WARNING" in rec.message for rec in caplog.records)


@patch("lib.searchapi_budget.get_budget_status")
def test_assert_aborts_at_abort_threshold(mock_status):
    mock_status.return_value = _make_status(used=9000, quota=10000, projected=9600)
    with pytest.raises(BudgetExceeded) as excinfo:
        assert_budget_ok(additional_calls_planned=1625, abort_threshold=0.95)
    assert "9600" in str(excinfo.value)


@patch("lib.searchapi_budget.get_budget_status")
def test_zero_quota_doesnt_divide_by_zero(mock_status):
    mock_status.return_value = _make_status(used=0, quota=0, projected=0)
    # Should not raise — pct_projected stays 0 when quota is 0.
    assert_budget_ok(additional_calls_planned=500, abort_threshold=0.95)
