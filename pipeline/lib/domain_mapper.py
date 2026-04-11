"""
Shared domain → advertiser_entity mapper.

Used by google_ads_daily and serp_intel_daily to normalize domains
to known advertiser entities via the aliases JSONB array and website
column on advertiser_entities.
"""

from __future__ import annotations

import logging
import re
from typing import Optional
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Domains that should never match (too generic)
_BLOCKED_DOMAINS = frozenset({
    "google.com", "facebook.com", "youtube.com", "twitter.com",
    "instagram.com", "tiktok.com", "linkedin.com", "reddit.com",
    "wikipedia.org", "bing.com", "yahoo.com", "amazon.com",
})


def extract_root_domain(url_or_domain: str) -> str:
    """Extract root domain from a URL or bare domain string.

    Examples:
        "https://www.bencrump.com/camp-lejeune/" → "bencrump.com"
        "www.morganandmorgan.com" → "morganandmorgan.com"
        "classaction.org" → "classaction.org"
    """
    if not url_or_domain:
        return ""
    text = url_or_domain.strip()
    if not text:
        return ""

    # Add scheme if missing so urlparse works
    if not re.match(r"https?://", text, re.IGNORECASE):
        text = "https://" + text

    parsed = urlparse(text)
    host = (parsed.hostname or "").lower().strip(".")

    # Strip leading www.
    if host.startswith("www."):
        host = host[4:]

    return host


class DomainMapper:
    """Maps domains to advertiser_entity IDs using aliases and website columns."""

    def __init__(self, entities: list[dict]):
        """Build lookup index from advertiser_entities rows.

        Each entity dict should have: id, canonical_name, website (nullable),
        aliases (nullable jsonb array of strings).
        """
        self._by_domain: dict[str, str] = {}  # domain → entity_id
        self._unmatched: set[str] = set()

        for ent in entities:
            eid = ent["id"]

            # Index by website domain
            website = ent.get("website") or ""
            if website:
                domain = extract_root_domain(website)
                if domain and domain not in _BLOCKED_DOMAINS:
                    self._by_domain[domain] = eid

            # Index by each alias
            aliases = ent.get("aliases") or []
            if isinstance(aliases, list):
                for alias in aliases:
                    if isinstance(alias, str):
                        domain = extract_root_domain(alias)
                        if domain and domain not in _BLOCKED_DOMAINS:
                            self._by_domain[domain] = eid

    def match(self, url_or_domain: str) -> Optional[str]:
        """Return entity_id for a URL/domain, or None if no match."""
        domain = extract_root_domain(url_or_domain)
        if not domain or domain in _BLOCKED_DOMAINS:
            return None

        entity_id = self._by_domain.get(domain)
        if entity_id is None and domain not in self._unmatched:
            self._unmatched.add(domain)
            logger.debug("Unmatched domain: %s", domain)

        return entity_id

    @property
    def unmatched_domains(self) -> set[str]:
        """Domains seen that could not be matched to any entity."""
        return self._unmatched.copy()
