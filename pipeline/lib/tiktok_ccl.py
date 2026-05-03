"""
TikTok Commercial Content Library (CCL) source wrapper.

Replaces the noisy SearchAPI TikTok scraper with TikTok's official
Research API → Commercial Content Library, which only returns paid
commercial content (ads) with verified advertiser metadata.

References:
  - https://developers.tiktok.com/products/research-api/commercial-content-library
  - https://developers.tiktok.com/doc/commercial-content-api-overview
  - https://developers.tiktok.com/doc/commercial-content-api-query-commercial-contents

Credentials: requires TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET. The pipeline
should NOT fall back to the old SearchAPI source if these are missing — the
pipeline should skip the step instead. See callers.
"""

from __future__ import annotations

import logging
import os
import time
from datetime import date, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

OAUTH_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
# TikTok has shipped this under multiple paths; this is the documented
# Research API → Commercial Content Library "query" endpoint as of 2026.
# If the path 404s in production, log the response body and consult the
# linked docs for the current canonical URL.
CCL_QUERY_URL = (
    "https://open.tiktokapis.com/v2/research/adlib/commercial_content/query/"
)

# Default pagination + lookback windows
DEFAULT_MAX_RESULTS = 50
DEFAULT_LOOKBACK_DAYS = 30
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3


# ---------------------------------------------------------------------------
# Credential probe
# ---------------------------------------------------------------------------


def credentials_present() -> bool:
    """Return True iff both TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are set."""
    return bool(os.environ.get("TIKTOK_CLIENT_KEY")) and bool(
        os.environ.get("TIKTOK_CLIENT_SECRET")
    )


# ---------------------------------------------------------------------------
# OAuth2 client-credentials flow with in-process token cache
# ---------------------------------------------------------------------------


class _TokenCache:
    """Single-process bearer token cache. Tokens last ~2 hours."""

    def __init__(self) -> None:
        self._access_token: Optional[str] = None
        self._expires_at_epoch: float = 0.0

    def get(self) -> Optional[str]:
        if self._access_token and time.time() < self._expires_at_epoch:
            return self._access_token
        return None

    def set(self, token: str, ttl_seconds: int) -> None:
        self._access_token = token
        # Refresh ~60s before actual expiry
        self._expires_at_epoch = time.time() + max(ttl_seconds - 60, 60)


_TOKEN = _TokenCache()


def _request_access_token() -> tuple[str, int]:
    """Obtain a fresh client-credentials bearer token. Raises on failure."""
    client_key = os.environ.get("TIKTOK_CLIENT_KEY", "")
    client_secret = os.environ.get("TIKTOK_CLIENT_SECRET", "")
    if not client_key or not client_secret:
        raise RuntimeError(
            "TikTok CCL credentials missing — check TIKTOK_CLIENT_KEY and "
            "TIKTOK_CLIENT_SECRET environment variables."
        )

    resp = httpx.post(
        OAUTH_TOKEN_URL,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Cache-Control": "no-cache",
        },
        data={
            "client_key": client_key,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    if resp.status_code >= 400:
        # Log body for diagnosis — TikTok endpoints have churned historically
        logger.error(
            "TikTok OAuth failure %d: %s", resp.status_code, resp.text[:500]
        )
        resp.raise_for_status()

    data = resp.json()
    token = data.get("access_token")
    expires_in = int(data.get("expires_in", 7200))
    if not token:
        raise RuntimeError(
            f"TikTok OAuth response missing access_token: {data!r}"
        )
    return token, expires_in


def _bearer_token() -> str:
    """Return a cached or freshly fetched access token."""
    cached = _TOKEN.get()
    if cached:
        return cached
    token, ttl = _request_access_token()
    _TOKEN.set(token, ttl)
    return token


# ---------------------------------------------------------------------------
# Commercial Content Library search
# ---------------------------------------------------------------------------


def fetch_commercial_ads(
    keyword: str,
    *,
    country: str = "US",
    max_results: int = DEFAULT_MAX_RESULTS,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
) -> list[dict]:
    """Query the Commercial Content Library for ads matching `keyword`.

    Returns a list of normalized ad dicts (one per matching ad). Each dict
    has the fields the caller maps into ad_observations_raw:
      - ad_id (str)
      - advertiser_business_name (str | None)
      - advertiser_business_id (str | None)
      - country_code (str | None)
      - first_shown_date (str ISO date | None)
      - last_shown_date (str ISO date | None)
      - creative_url (str | None)
      - description (str | None)
      - raw (dict)  full TikTok payload, kept for raw_json

    Returns [] when the API legitimately returns no results. Raises on
    auth or transport failures so the caller can decide whether to mark
    the step failed or partial.
    """
    if not keyword:
        return []

    today = date.today()
    body = {
        "search_term": keyword,
        "country_code": country,
        "min_create_date": (today - timedelta(days=lookback_days)).isoformat(),
        "max_create_date": today.isoformat(),
        "max_count": max_results,
    }
    fields = ",".join([
        "ad_id",
        "advertiser_business_name",
        "advertiser_business_id",
        "country_code",
        "first_shown_date",
        "last_shown_date",
        "creative_url",
        "description",
        "create_date",
    ])

    for attempt in range(MAX_RETRIES):
        try:
            token = _bearer_token()
            resp = httpx.post(
                CCL_QUERY_URL,
                params={"fields": fields},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=body,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )

            if resp.status_code == 401:
                # Token may have aged out mid-run; force-refresh once.
                logger.warning("TikTok CCL 401; refreshing token and retrying")
                _TOKEN.set("", 0)
                continue
            if resp.status_code == 429:
                backoff = 2 ** attempt
                logger.warning(
                    "TikTok CCL rate-limited on '%s'; backoff %.1fs",
                    keyword, backoff,
                )
                time.sleep(backoff)
                continue
            if resp.status_code >= 400:
                logger.error(
                    "TikTok CCL error %d for '%s': %s",
                    resp.status_code, keyword, resp.text[:500],
                )
                resp.raise_for_status()

            payload = resp.json()
            return _normalize_response(payload)
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning(
                    "TikTok CCL transport error for '%s' (attempt %d): %s",
                    keyword, attempt + 1, e,
                )
                time.sleep(2 ** attempt)
            else:
                logger.error(
                    "TikTok CCL failed for '%s' after %d attempts: %s",
                    keyword, MAX_RETRIES, e,
                )
                raise
    return []


def _normalize_response(payload: dict) -> list[dict]:
    """Pull the result list out of the CCL response, no matter where TikTok
    nests it (the field has moved between API versions)."""
    data = payload.get("data") or {}
    items = (
        data.get("commercial_contents")
        or data.get("ads")
        or data.get("contents")
        or payload.get("commercial_contents")
        or payload.get("ads")
        or []
    )
    out: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        out.append({
            "ad_id": str(item.get("ad_id") or item.get("id") or ""),
            "advertiser_business_name": item.get("advertiser_business_name"),
            "advertiser_business_id": (
                str(item.get("advertiser_business_id"))
                if item.get("advertiser_business_id") is not None
                else None
            ),
            "country_code": item.get("country_code"),
            "first_shown_date": item.get("first_shown_date") or item.get("create_date"),
            "last_shown_date": item.get("last_shown_date"),
            "creative_url": item.get("creative_url") or item.get("video_url"),
            "description": item.get("description") or item.get("content_text"),
            "raw": item,
        })
    return [r for r in out if r["ad_id"]]
