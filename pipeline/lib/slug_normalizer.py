"""
slug_normalizer — compute slugified_path_tort_match for a URL + tort.

The dedup key on tort_landing_pages is
  (tort_id, registered_domain, slugified_path_tort_match, dma_code)

so this function is load-bearing: a bug here produces duplicate rows for the
same firm's coverage of the same tort, or merges genuinely distinct pages.

Algorithm (matches the migration's COMMENT ON COLUMN doc and the PR plan):

  1. Lowercase. Strip query + fragment. Strip trailing slash.
  2. Split path into segments. Drop these boilerplate segments outright:
     practice-areas, practice, cases, lawsuits, attorneys, lawyers, services,
     blog, info, news. (These are firm-org structure, not tort-identifying.)
  3. For each remaining segment, check if it contains any of the tort's
     synonyms (substring match, hyphens treated as word boundaries). On match,
     replace the segment with the tort's *primary* synonym.
  4. From the matched segment, strip these trailing modifier tokens (split by
     `-`): lawsuit, lawsuits, attorney, attorneys, lawyer, lawyers, claim,
     claims, case, cases, form, info, settlement, settlements, mdl,
     litigation. The stem that remains is the canonical key.
  5. If no segment matched, return '' (general firm page; one such row is
     allowed per (tort, registered_domain) via the partial unique index).

Edge cases:

  - Multi-tort URLs like /roundup-and-paraquat/ use first-segment-match-wins
    by synonym ordering. This is INTENTIONAL but surprising. A page like
    smithlaw.com/roundup-and-paraquat/ will canonicalize differently depending
    on which tort we're scoring it against — that's correct: the page is
    relevant to both torts, and the dedup happens per-tort.
  - URLs with uppercase, query strings, fragments, www. prefix all normalize
    away before matching.
  - Paths containing only the synonym substring with no other tokens (e.g.
    `/talc/`) return the primary synonym unchanged.
"""
from __future__ import annotations

import re
from typing import Iterable, Optional
from urllib.parse import urlparse

# Boilerplate path segments dropped before synonym matching.
_BOILERPLATE_SEGMENTS = frozenset({
    "practice-areas", "practice", "cases", "lawsuits", "attorneys",
    "lawyers", "services", "blog", "info", "news", "areas",
})

# Trailing modifier tokens stripped from the matched segment.
_MODIFIER_TOKENS = frozenset({
    "lawsuit", "lawsuits", "attorney", "attorneys", "lawyer", "lawyers",
    "claim", "claims", "case", "cases", "form", "info", "settlement",
    "settlements", "mdl", "litigation", "update", "updates", "news",
})


def _path_segments(url: str) -> list[str]:
    """Lowercase, strip query/fragment/trailing slash, split into segments."""
    if not url:
        return []
    # urlparse handles scheme + query + fragment cleanly.
    parsed = urlparse(url if "://" in url else f"https://{url}")
    path = (parsed.path or "").lower().rstrip("/")
    return [seg for seg in path.split("/") if seg]


def _segment_matches_synonym(segment: str, synonym: str) -> bool:
    """Substring match treating hyphens as word boundaries.

    A synonym like 'talc' matches the segment 'talcum-powder-lawsuit' AND
    'talc-claim-form' AND bare 'talc'. We use the hyphen-normalized form
    of both sides to avoid matching across word boundaries inside other
    words (e.g. 'talcum' should match synonym 'talc' — and it does, via
    plain substring — but 'practitioner' should not match synonym 'rac').
    To prevent that, we require the synonym to appear at a hyphen boundary
    OR at start/end of segment.
    """
    seg_padded = f"-{segment}-"
    syn_padded = f"-{synonym}-"
    if syn_padded in seg_padded:
        return True
    # Allow substring match when synonym is a recognized prefix/stem
    # (e.g. 'talc' in 'talcum-powder'). Only accept when synonym is
    # at least 4 chars to avoid spurious 3-letter matches.
    if len(synonym) >= 4 and synonym in segment:
        return True
    return False


def slugified_path_tort_match(
    url: str,
    *,
    primary_synonym: str,
    aliases: Iterable[str],
) -> str:
    """Compute the canonical tort-match key for a URL given a tort's synonyms.

    Args:
      url: Raw URL or bare path. Scheme/host/query/fragment are ignored.
      primary_synonym: The tort's canonical synonym (replaces matched seg).
      aliases: Other accepted synonyms. Order doesn't matter; all are tried.

    Returns:
      The canonical key. Empty string when no segment matches any synonym.
    """
    segments = _path_segments(url)
    if not segments:
        return ""

    # Drop boilerplate segments.
    relevant = [s for s in segments if s not in _BOILERPLATE_SEGMENTS]

    # Try synonyms in this order: primary first, then aliases.
    all_synonyms = [primary_synonym, *(a for a in aliases if a != primary_synonym)]

    for segment in relevant:
        for syn in all_synonyms:
            if not syn:
                continue
            if _segment_matches_synonym(segment, syn):
                # Replace the segment with the primary synonym, then strip
                # modifier tokens. The segment may also contain modifier
                # tokens BEFORE the synonym (rare but possible, e.g.
                # 'free-consultation-talc-lawsuit'). Strip both directions.
                tokens = segment.split("-")
                # Remove modifier tokens from both ends.
                while tokens and tokens[0] in _MODIFIER_TOKENS:
                    tokens.pop(0)
                while tokens and tokens[-1] in _MODIFIER_TOKENS:
                    tokens.pop()
                # If anything in the cleaned segment matched the synonym,
                # collapse to the primary synonym. Otherwise return cleaned.
                joined = "-".join(tokens) if tokens else syn
                # If the cleaned stem is just the synonym or a prefix of it,
                # canonicalize to primary_synonym.
                if joined == syn or joined == primary_synonym or syn in joined:
                    return primary_synonym
                return joined
    return ""


__all__ = ["slugified_path_tort_match"]
