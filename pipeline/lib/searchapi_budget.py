"""
searchapi_budget — pre-flight check against api_usage_log + api_pricing_config.

Used by tort_landing_pages_weekly (and any future high-volume Searchapi
caller) to abort before the monthly cap is exceeded. Reads its own usage
from api_usage_log in real time, so as soon as a call has been logged it
counts toward the projection.

Thresholds (callable in either order):
  - warning_threshold (default 0.85)  → log warning, continue
  - abort_threshold   (default 0.95)  → raise BudgetExceeded
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import date

import httpx

from .api_pricing import get_searchapi_pricing

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY", "")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)


class BudgetExceeded(RuntimeError):
    pass


@dataclass(frozen=True)
class BudgetStatus:
    used_this_month: int
    monthly_quota: int
    projected_total: int
    pct_used: float
    pct_projected: float
    days_remaining_in_month: int


def _days_remaining_in_month(today: date) -> int:
    if today.month == 12:
        first_of_next = date(today.year + 1, 1, 1)
    else:
        first_of_next = date(today.year, today.month + 1, 1)
    return (first_of_next - today).days


def _month_start(today: date) -> date:
    return date(today.year, today.month, 1)


def get_budget_status(*, additional_calls_planned: int = 0) -> BudgetStatus:
    """Query current-month Searchapi usage and compute projection.

    additional_calls_planned lets a caller test the post-run state before
    actually firing the calls. For a 1,625-call run set this to 1625.
    """
    pricing = get_searchapi_pricing()
    monthly_quota = pricing.get("monthly_quota_units") or 10000

    today = date.today()
    start = _month_start(today)
    days_into_month = (today - start).days + 1
    days_remaining = _days_remaining_in_month(today)

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning(
            "searchapi_budget: SUPABASE env missing; can't read usage."
        )
        return BudgetStatus(
            used_this_month=0,
            monthly_quota=monthly_quota,
            projected_total=additional_calls_planned,
            pct_used=0.0,
            pct_projected=additional_calls_planned / monthly_quota if monthly_quota else 0.0,
            days_remaining_in_month=days_remaining,
        )

    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    # PostgREST RPC-less aggregate: pull rows in a tight window and sum locally.
    # Volume is bounded (a few thousand/month), so this is cheap.
    try:
        resp = httpx.get(
            f"{SUPABASE_URL}/rest/v1/api_usage_log",
            headers=headers,
            params={
                "select": "units_consumed",
                "provider": "eq.searchapi",
                "created_at": f"gte.{start.isoformat()}",
                "limit": "100000",
            },
            timeout=30,
        )
        resp.raise_for_status()
        used = sum(int(row.get("units_consumed", 0)) for row in resp.json())
    except httpx.HTTPError as e:
        logger.warning("searchapi_budget: usage query failed: %s", e)
        used = 0

    # Linear projection from days-into-month to month-end.
    avg_daily = used / days_into_month if days_into_month > 0 else 0.0
    projected_remaining = avg_daily * days_remaining
    projected_total = int(used + projected_remaining + additional_calls_planned)

    return BudgetStatus(
        used_this_month=used,
        monthly_quota=monthly_quota,
        projected_total=projected_total,
        pct_used=used / monthly_quota if monthly_quota else 0.0,
        pct_projected=projected_total / monthly_quota if monthly_quota else 0.0,
        days_remaining_in_month=days_remaining,
    )


def assert_budget_ok(
    *,
    additional_calls_planned: int,
    warning_threshold: float = 0.85,
    abort_threshold: float = 0.95,
) -> BudgetStatus:
    """Compute status and raise BudgetExceeded if projection > abort threshold."""
    status = get_budget_status(additional_calls_planned=additional_calls_planned)

    msg = (
        f"Searchapi budget: used {status.used_this_month}/{status.monthly_quota} "
        f"({status.pct_used:.0%}). With this run's {additional_calls_planned} "
        f"additional calls, projected month-end {status.projected_total} "
        f"({status.pct_projected:.0%})."
    )

    if status.pct_projected >= abort_threshold:
        raise BudgetExceeded(
            f"ABORT: {msg} Exceeds {abort_threshold:.0%} cap."
        )
    if status.pct_projected >= warning_threshold:
        logger.warning("WARNING: %s Above %.0f%% threshold.", msg, warning_threshold * 100)
    else:
        logger.info(msg)
    return status


__all__ = ["BudgetExceeded", "BudgetStatus", "get_budget_status", "assert_budget_ok"]
