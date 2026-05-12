"""Tests for ensure_manufacturer() caching behaviour.

Verifies that the in-memory cache eliminates redundant HTTP calls to
Supabase for manufacturer lookups during a single pipeline run.
"""
import os
import sys
from unittest.mock import MagicMock, patch, call

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.pop("DRY_RUN", None)
# Supabase env vars required by lib.pipeline at import time
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "fake-key")

from pipelines.openfda_device_recalls import ensure_manufacturer, slugify, canonicalize_manufacturer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_db_row(slug: str, canonical: str, aliases: list[str] | None = None) -> dict:
    return {
        "id": f"uuid-{slug}",
        "slug": slug,
        "canonical_name": canonical,
        "aliases": aliases or [],
    }


# ---------------------------------------------------------------------------
# Cache miss: first lookup hits Supabase
# ---------------------------------------------------------------------------

def test_cache_miss_calls_find_by_slug():
    """First lookup for a slug calls _find_by_slug exactly once."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("philips-respironics", "Philips Respironics")
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row) as mock_find, \
         patch("pipelines.openfda_device_recalls._update_aliases"):
        result = ensure_manufacturer("Philips Respironics, Inc.", cache)
    assert result == "uuid-philips-respironics"
    assert mock_find.call_count == 1


def test_cache_populated_after_miss():
    """After a miss, the slug is in the cache with id, canonical_name, known_aliases."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("abbott-molecular", "Abbott Molecular", aliases=["Abbott Molecular Inc."])
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row), \
         patch("pipelines.openfda_device_recalls._update_aliases"):
        ensure_manufacturer("Abbott Molecular Inc.", cache)

    slug = slugify(canonicalize_manufacturer("Abbott Molecular Inc."))
    assert slug in cache
    entry = cache[slug]
    assert entry["id"] == "uuid-abbott-molecular"
    assert entry["canonical_name"] == "Abbott Molecular"
    assert isinstance(entry["known_aliases"], set)


# ---------------------------------------------------------------------------
# Cache hit: second lookup must not call _find_by_slug
# ---------------------------------------------------------------------------

def test_cache_hit_skips_http_call():
    """Second lookup of the same slug uses cached entry — zero additional HTTP calls."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("philips-respironics", "Philips Respironics")
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row) as mock_find, \
         patch("pipelines.openfda_device_recalls._update_aliases"):
        ensure_manufacturer("Philips Respironics, Inc.", cache)  # miss
        ensure_manufacturer("Philips Respironics, Inc.", cache)  # hit
        ensure_manufacturer("Philips Respironics, Inc.", cache)  # hit

    # _find_by_slug called exactly once despite 3 total lookups
    assert mock_find.call_count == 1


def test_many_rows_same_slug_single_http_call():
    """Simulating 200 recall rows from the same manufacturer → 1 HTTP call total."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("boston-scientific", "Boston Scientific")
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row) as mock_find, \
         patch("pipelines.openfda_device_recalls._update_aliases"):
        for _ in range(200):
            ensure_manufacturer("Boston Scientific Corporation", cache)

    assert mock_find.call_count == 1


# ---------------------------------------------------------------------------
# None / empty raw_name: handled without any HTTP calls
# ---------------------------------------------------------------------------

def test_none_raw_name_returns_none():
    cache: dict[str, dict] = {}
    with patch("pipelines.openfda_device_recalls._find_by_slug") as mock_find:
        result = ensure_manufacturer("", cache)
    assert result is None
    mock_find.assert_not_called()


def test_whitespace_raw_name_returns_none():
    cache: dict[str, dict] = {}
    with patch("pipelines.openfda_device_recalls._find_by_slug") as mock_find:
        result = ensure_manufacturer("   ", cache)
    assert result is None
    mock_find.assert_not_called()


# ---------------------------------------------------------------------------
# Alias update: only when raw_name is new
# ---------------------------------------------------------------------------

def test_new_alias_triggers_update_on_miss():
    """First encounter with an unknown raw_name triggers _update_aliases if needed."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("medtronic", "Medtronic", aliases=[])
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row), \
         patch("pipelines.openfda_device_recalls._update_aliases") as mock_update:
        ensure_manufacturer("Medtronic, Inc.", cache)

    mock_update.assert_called_once()


def test_existing_alias_does_not_retrigger_update():
    """raw_name already in aliases → no _update_aliases call."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("medtronic", "Medtronic", aliases=["Medtronic, Inc."])
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row), \
         patch("pipelines.openfda_device_recalls._update_aliases") as mock_update:
        ensure_manufacturer("Medtronic, Inc.", cache)

    mock_update.assert_not_called()


def test_repeated_new_alias_triggers_update_only_once():
    """Same new raw_name repeated 100×: _update_aliases fires on first encounter only."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("stryker", "Stryker", aliases=[])
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row), \
         patch("pipelines.openfda_device_recalls._update_aliases") as mock_update:
        for _ in range(100):
            ensure_manufacturer("Stryker Corporation", cache)

    # First call fires update (new alias); subsequent 99 hits use cached known_aliases
    assert mock_update.call_count == 1


def test_second_distinct_alias_triggers_second_update():
    """Two distinct new raw_names → two _update_aliases calls (one per new alias)."""
    cache: dict[str, dict] = {}
    db_row = _make_db_row("j-j", "J J", aliases=[])
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row), \
         patch("pipelines.openfda_device_recalls._update_aliases") as mock_update:
        ensure_manufacturer("Johnson & Johnson", cache)  # miss → update
        ensure_manufacturer("J&J Medical", cache)        # hit with new alias → update

    assert mock_update.call_count == 2


# ---------------------------------------------------------------------------
# known_aliases updated in cache after alias write
# ---------------------------------------------------------------------------

def test_cache_updated_after_alias_write():
    """After an alias update, the cached known_aliases reflects the new name."""
    cache: dict[str, dict] = {}
    slug = slugify(canonicalize_manufacturer("Baxter International"))
    db_row = _make_db_row(slug, "Baxter International", aliases=[])
    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=db_row), \
         patch("pipelines.openfda_device_recalls._update_aliases"):
        ensure_manufacturer("Baxter International Inc.", cache)

    assert "Baxter International Inc." in cache[slug]["known_aliases"]


# ---------------------------------------------------------------------------
# Insert new manufacturer (not in DB)
# ---------------------------------------------------------------------------

def test_new_manufacturer_inserted_and_cached():
    """Unknown slug → POST to Supabase, new id returned and cached."""
    cache: dict[str, dict] = {}
    fake_response = MagicMock()
    fake_response.raise_for_status.return_value = None
    fake_response.json.return_value = [{"id": "new-uuid-123"}]

    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=None), \
         patch("pipelines.openfda_device_recalls.httpx.post", return_value=fake_response):
        result = ensure_manufacturer("NovaBiomedical Corporation", cache)

    assert result == "new-uuid-123"
    slug = slugify(canonicalize_manufacturer("NovaBiomedical Corporation"))
    assert cache[slug]["id"] == "new-uuid-123"


def test_new_manufacturer_second_call_uses_cache():
    """After insert, repeat call uses cached entry — no second POST."""
    cache: dict[str, dict] = {}
    fake_response = MagicMock()
    fake_response.raise_for_status.return_value = None
    fake_response.json.return_value = [{"id": "new-uuid-456"}]

    with patch("pipelines.openfda_device_recalls._find_by_slug", return_value=None), \
         patch("pipelines.openfda_device_recalls.httpx.post", return_value=fake_response) as mock_post:
        ensure_manufacturer("NovaBiomedical Corporation", cache)  # insert
        ensure_manufacturer("NovaBiomedical Corporation", cache)  # cache hit

    assert mock_post.call_count == 1


# ---------------------------------------------------------------------------
# DRY_RUN mode
# ---------------------------------------------------------------------------

def test_dry_run_uses_cache_without_http():
    """In DRY_RUN mode, new manufacturers get a fake id and are cached."""
    cache: dict[str, dict] = {}
    with patch("pipelines.openfda_device_recalls.DRY_RUN", True), \
         patch("pipelines.openfda_device_recalls._find_by_slug", return_value=None), \
         patch("pipelines.openfda_device_recalls.httpx") as mock_httpx:
        result1 = ensure_manufacturer("FakeMed Inc.", cache)
        result2 = ensure_manufacturer("FakeMed Inc.", cache)

    mock_httpx.post.assert_not_called()
    assert result1 == result2
    assert result1 is not None
