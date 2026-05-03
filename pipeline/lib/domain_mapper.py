"""
Shared domain → advertiser_entity mapper.

Used by google_ads_daily and serp_intel_daily to normalize domains
to known advertiser entities via the aliases JSONB array and website
column on advertiser_entities.

Also exposes a name-fuzzy fallback used by tiktok_ads_daily and as a
last-ditch matcher for google_ads_daily when a domain doesn't resolve
(e.g., the SearchAPI ad's link is to a tracking shim domain rather
than the advertiser's real homepage).
"""

from __future__ import annotations

import logging
import re
from difflib import SequenceMatcher
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


_NAME_FILLER_TOKENS = frozenset({"and", "the", "a", "an", "of", "for", "&"})


def _normalize_for_name_match(text: str) -> str:
    """Lowercase, strip punctuation, drop filler tokens, collapse whitespace.

    Used as the input form for name fuzzy matching so that
    "Morgan & Morgan" and "morgan and morgan, p.a." land at the same
    canonical token sequence ("morgan morgan").
    """
    if not text:
        return ""
    s = text.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    # Strip common law-firm legal-form suffixes BEFORE filler-token removal
    # (so "p a" from "P.A." doesn't get caught by the single-letter "a"
    # filler removal that would leave "p" stranded).
    for suffix in (" pllc", " p a", " pa", " pc", " llp", " llc", " law firm", " law", " attorneys", " attorney"):
        if s.endswith(suffix):
            s = s[: -len(suffix)].strip()
    # Strip filler tokens that add noise without identity (and, the, of, ...)
    tokens = [t for t in s.split() if t not in _NAME_FILLER_TOKENS]
    s = " ".join(tokens)
    return s


class DomainMapper:
    """Maps domains and (fuzzy) names to advertiser_entity IDs.

    Domain matching is exact against `website` and `aliases`. Name fuzzy
    matching is a fallback used when (a) the domain didn't resolve or
    (b) the caller never had a domain in the first place (e.g. TikTok
    handles or Google Ads ad headlines).
    """

    NAME_FUZZY_THRESHOLD = 0.78

    def __init__(self, entities: list[dict]):
        """Build lookup index from advertiser_entities rows.

        Each entity dict should have: id, canonical_name, website (nullable),
        aliases (nullable jsonb array of strings).
        """
        self._by_domain: dict[str, str] = {}  # domain → entity_id
        self._names: list[tuple[str, str]] = []  # (normalized_name, entity_id)
        self._unmatched: set[str] = set()
        self._unmatched_names: set[str] = set()

        for ent in entities:
            eid = ent["id"]

            # Index by website domain
            website = ent.get("website") or ""
            if website:
                domain = extract_root_domain(website)
                if domain and domain not in _BLOCKED_DOMAINS:
                    self._by_domain[domain] = eid

            # Index by each alias — keep both as a domain candidate AND as
            # a name candidate, since aliases may be either form
            # (e.g., "forthepeople.com" or "For the People").
            aliases = ent.get("aliases") or []
            if isinstance(aliases, list):
                for alias in aliases:
                    if not isinstance(alias, str):
                        continue
                    domain = extract_root_domain(alias)
                    if domain and domain not in _BLOCKED_DOMAINS:
                        self._by_domain[domain] = eid
                    norm = _normalize_for_name_match(alias)
                    if norm:
                        self._names.append((norm, eid))

            # Index canonical_name for fuzzy fallback
            canonical = ent.get("canonical_name") or ""
            norm_canonical = _normalize_for_name_match(canonical)
            if norm_canonical:
                self._names.append((norm_canonical, eid))

    def match(self, url_or_domain: str) -> Optional[str]:
        """Return entity_id for a URL/domain, or None if no match.

        Domain-only lookup; does not fall back to name matching. Use
        `match_with_name_fallback` when a name string is also available.
        """
        domain = extract_root_domain(url_or_domain)
        if not domain or domain in _BLOCKED_DOMAINS:
            return None

        entity_id = self._by_domain.get(domain)
        if entity_id is None and domain not in self._unmatched:
            self._unmatched.add(domain)
            logger.debug("Unmatched domain: %s", domain)

        return entity_id

    def match_name(self, name: str, threshold: Optional[float] = None) -> Optional[str]:
        """Fuzzy-match an advertiser name against canonical_name + aliases.

        Returns the best entity_id whose normalized name has a
        SequenceMatcher ratio >= threshold (default 0.78). On miss, the
        normalized name is recorded in `unmatched_names`.
        """
        if not name:
            return None
        norm = _normalize_for_name_match(name)
        if not norm:
            return None
        thr = self.NAME_FUZZY_THRESHOLD if threshold is None else threshold
        best_id: Optional[str] = None
        best_score = 0.0
        for cand, eid in self._names:
            # Cheap pre-check: containment is a strong signal
            if norm in cand or cand in norm:
                score = max(0.85, SequenceMatcher(None, norm, cand).ratio())
            else:
                score = SequenceMatcher(None, norm, cand).ratio()
            if score > best_score:
                best_score = score
                best_id = eid
        if best_score >= thr:
            return best_id
        if norm not in self._unmatched_names:
            self._unmatched_names.add(norm)
            logger.debug("Unmatched name: %s (best=%.2f)", norm, best_score)
        return None

    def match_with_name_fallback(
        self, url_or_domain: str, name: str, threshold: Optional[float] = None
    ) -> Optional[str]:
        """Try domain match first; fall back to fuzzy name match."""
        eid = self.match(url_or_domain) if url_or_domain else None
        if eid is not None:
            return eid
        return self.match_name(name, threshold=threshold)

    @property
    def unmatched_domains(self) -> set[str]:
        """Domains seen that could not be matched to any entity."""
        return self._unmatched.copy()

    @property
    def unmatched_names(self) -> set[str]:
        """Normalized names seen that could not be matched to any entity."""
        return self._unmatched_names.copy()
