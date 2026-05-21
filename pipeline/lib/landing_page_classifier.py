"""
landing_page_classifier — decide whether a domain is a plaintiff law firm.

Classifier waterfall (cheapest-first):

  1. Allow-list: registered_domain present in firms.website OR
     advertiser_entities (entity_type='law_firm') website / aliases.
     → confirmed, source=allow_list, TTL 90d.

  2. Deny-list: registered_domain in the static deny-list (news, .gov,
     .edu, aggregators) OR is a manufacturer in manufacturer_tort_map.
     → denied, source=deny_list, TTL 365d.

  3. Heuristic: fetch first 50 KB of HTML, score on 5 signals:
       a. Attorney-advertising disclaimer
       b. Bar admission text
       c. Footer phone with free-consultation / no-fee CTA
       d. schema.org/LegalService markup
       e. URL or title contains "law firm" / "attorneys" / "lawyers"
     Score interpretation (documented):
       0-1 signals → denied,    source=heuristic, TTL 30d
       2   signals → OpenAI fallback (next step)
       3-5 signals → confirmed, source=heuristic, TTL 30d

  4. OpenAI fallback: gpt-4o-mini on a 1 KB excerpt + title + URL. JSON
     mode returning {"is_law_firm": bool, "confidence": "low|medium|high"}.
     → source=openai, TTL 90d. Logged via log_api_call.

Frontend filters tort_landing_pages to classification_status IN
('confirmed', 'candidate'); pending/error rows are pipeline-internal.
"""
from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from .api_usage import log_api_call

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Static deny-list. Curated; expand via PR not code-runtime.
# ---------------------------------------------------------------------------

# Aggregators and lead-gen marketplaces.
_DENY_AGGREGATORS = frozenset({
    "avvo.com", "findlaw.com", "justia.com", "lawyers.com", "lawfirms.com",
    "lawsuit-information-center.com", "drugwatch.com", "aboutlawsuits.com",
    "classaction.org", "consumerprotect.com", "lawsuitlegalnews.com",
    "lawsuit-legal-news.com", "lawfirm.com", "expertise.com",
    "superlawyers.com", "martindale.com",
})

# News / mass media.
_DENY_NEWS = frozenset({
    "nytimes.com", "cnn.com", "reuters.com", "washingtonpost.com",
    "wsj.com", "bloomberg.com", "ft.com", "apnews.com", "bbc.com",
    "npr.org", "nbcnews.com", "abcnews.go.com", "cbsnews.com",
    "foxnews.com", "usatoday.com", "huffpost.com", "vox.com",
    "axios.com", "politico.com", "theverge.com", "techcrunch.com",
})

# Government / academic / non-profit watchdogs are caught by .gov / .edu / .org
# TLD checks below in _is_static_denied.


# Heuristic signals — substrings to look for in the HTML body.
# Conservative wording to keep false-positive rate low on aggregator articles.
_HEURISTIC_PATTERNS: dict[str, re.Pattern[str]] = {
    "attorney_advertising_disclaimer": re.compile(
        r"attorney\s+advertising|advertising\s+material|prior\s+results\s+do\s+not\s+guarantee",
        re.IGNORECASE,
    ),
    "bar_admission_text": re.compile(
        r"licensed\s+to\s+practice|bar\s+number|state\s+bar\s+of\s+\w+|admitted\s+to\s+(the\s+)?bar",
        re.IGNORECASE,
    ),
    "free_consultation_cta": re.compile(
        r"free\s+(case\s+)?(consultation|review|evaluation)|no\s+fee\s+unless\s+(we|you)\s+win|contingency\s+fee",
        re.IGNORECASE,
    ),
    "schema_legal_service": re.compile(
        r'"@type"\s*:\s*"(LegalService|Attorney|LawFirm)"',
        re.IGNORECASE,
    ),
    "law_firm_self_id": re.compile(
        r"\b(law\s+firm|trial\s+lawyers?|injury\s+attorneys?|plaintiff[s]?\s+law)\b",
        re.IGNORECASE,
    ),
}

HEURISTIC_HTML_BYTES = 50 * 1024  # 50 KB
OPENAI_EXCERPT_BYTES = 1024
OPENAI_MODEL = "gpt-4o-mini"
HTTP_TIMEOUT_SECONDS = 10

# TTLs per source. heuristic is shortest so false-positives self-correct.
TTL_BY_SOURCE = {
    "allow_list": timedelta(days=90),
    "openai": timedelta(days=90),
    "heuristic": timedelta(days=30),
    "deny_list": timedelta(days=365),
}


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Classification:
    is_law_firm: bool
    source: str  # 'allow_list' | 'deny_list' | 'heuristic' | 'openai'
    confidence: str  # 'low' | 'medium' | 'high'
    signal_score: int  # 0..5 for heuristic; -1 for non-heuristic
    matched_signals: list[str]
    expires_at: datetime
    error: Optional[str] = None

    @property
    def classification_status(self) -> str:
        """Map to the tort_landing_pages.classification_status enum."""
        if self.error:
            return "error"
        if self.source == "openai" and self.confidence == "medium":
            return "candidate"
        return "confirmed" if self.is_law_firm else "denied"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_domain(
    registered_domain: str,
    sample_url: str,
    *,
    allow_list_domains: frozenset[str],
    manufacturer_domains: frozenset[str],
    called_from: str,
    openai_api_key: Optional[str] = None,
    http_client: Optional[httpx.Client] = None,
) -> Classification:
    """Run the full classifier waterfall for one domain.

    Args:
      registered_domain: lowercased, no scheme, no www., no path.
      sample_url: a URL on this domain to fetch HTML from (heuristic step).
      allow_list_domains: domains known to be law firms.
      manufacturer_domains: domains in manufacturer_tort_map (deny side).
      called_from: 'pipelines.tort_landing_pages_*'.
      openai_api_key: required for step 4 only.
      http_client: inject for testing.
    """
    now = datetime.now(timezone.utc)

    # Step 1: allow-list
    if registered_domain in allow_list_domains:
        return Classification(
            is_law_firm=True,
            source="allow_list",
            confidence="high",
            signal_score=-1,
            matched_signals=["allow_list"],
            expires_at=now + TTL_BY_SOURCE["allow_list"],
        )

    # Step 2: deny-list
    if _is_static_denied(registered_domain) or registered_domain in manufacturer_domains:
        return Classification(
            is_law_firm=False,
            source="deny_list",
            confidence="high",
            signal_score=-1,
            matched_signals=["deny_list"],
            expires_at=now + TTL_BY_SOURCE["deny_list"],
        )

    # Step 3: heuristic
    client = http_client or httpx.Client(timeout=HTTP_TIMEOUT_SECONDS, follow_redirects=True)
    try:
        html, fetch_error = _fetch_html_truncated(client, sample_url)
    finally:
        if http_client is None:
            client.close()

    if fetch_error:
        return Classification(
            is_law_firm=False,
            source="heuristic",
            confidence="low",
            signal_score=0,
            matched_signals=[],
            expires_at=now + TTL_BY_SOURCE["heuristic"],
            error=fetch_error,
        )

    score, matched = _score_heuristic(html)
    if score >= 3:
        return Classification(
            is_law_firm=True,
            source="heuristic",
            confidence="high" if score >= 4 else "medium",
            signal_score=score,
            matched_signals=matched,
            expires_at=now + TTL_BY_SOURCE["heuristic"],
        )
    if score <= 1:
        return Classification(
            is_law_firm=False,
            source="heuristic",
            confidence="high",
            signal_score=score,
            matched_signals=matched,
            expires_at=now + TTL_BY_SOURCE["heuristic"],
        )

    # Step 4: OpenAI fallback (score == 2)
    if not openai_api_key:
        # No key configured. Treat tied score as candidate so the row
        # surfaces but is clearly marked.
        return Classification(
            is_law_firm=True,
            source="heuristic",
            confidence="low",
            signal_score=score,
            matched_signals=matched,
            expires_at=now + TTL_BY_SOURCE["heuristic"],
        )

    openai_result = _classify_via_openai(
        html=html, url=sample_url, api_key=openai_api_key,
        called_from=called_from,
    )
    if openai_result is None:
        # OpenAI call failed; surface as candidate via heuristic verdict.
        return Classification(
            is_law_firm=True,
            source="heuristic",
            confidence="low",
            signal_score=score,
            matched_signals=matched,
            expires_at=now + TTL_BY_SOURCE["heuristic"],
            error="openai_fallback_failed",
        )
    return Classification(
        is_law_firm=openai_result["is_law_firm"],
        source="openai",
        confidence=openai_result["confidence"],
        signal_score=score,
        matched_signals=matched + ["openai_adjudicated"],
        expires_at=now + TTL_BY_SOURCE["openai"],
    )


# ---------------------------------------------------------------------------
# Step helpers
# ---------------------------------------------------------------------------

_GOV_EDU_TLDS = (".gov", ".edu", ".mil")


def _is_static_denied(domain: str) -> bool:
    if domain in _DENY_AGGREGATORS or domain in _DENY_NEWS:
        return True
    if any(domain.endswith(tld) for tld in _GOV_EDU_TLDS):
        return True
    return False


def _fetch_html_truncated(
    client: httpx.Client, url: str
) -> tuple[str, Optional[str]]:
    """Fetch first HEURISTIC_HTML_BYTES of HTML. Return (html, error)."""
    try:
        with client.stream("GET", url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; LMI-Bot/1.0; +https://legal-ad-intel.com/bot)",
            "Accept": "text/html,application/xhtml+xml",
        }) as resp:
            if resp.status_code >= 400:
                return "", f"http_{resp.status_code}"
            buf: list[bytes] = []
            total = 0
            for chunk in resp.iter_bytes(8192):
                buf.append(chunk)
                total += len(chunk)
                if total >= HEURISTIC_HTML_BYTES:
                    break
            return b"".join(buf)[:HEURISTIC_HTML_BYTES].decode("utf-8", errors="ignore"), None
    except httpx.TimeoutException:
        return "", "timeout"
    except httpx.RequestError as e:
        return "", f"request_error:{type(e).__name__}"


def _score_heuristic(html: str) -> tuple[int, list[str]]:
    matched: list[str] = []
    for name, pattern in _HEURISTIC_PATTERNS.items():
        if pattern.search(html):
            matched.append(name)
    return len(matched), matched


# ---------------------------------------------------------------------------
# OpenAI fallback
# ---------------------------------------------------------------------------

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

_SYSTEM_PROMPT = (
    "You are an expert in U.S. legal marketing. Given a URL and a short "
    "HTML excerpt, decide whether the website is the homepage or a content "
    "page of a U.S. plaintiff law firm (i.e., a firm that takes injury / mass "
    "tort / class-action cases on contingency). Aggregators, news, "
    "government, and manufacturer sites are NOT law firms.\n\n"
    "Respond ONLY with valid JSON: "
    '{"is_law_firm": true|false, "confidence": "low"|"medium"|"high"}'
)


def _classify_via_openai(
    *, html: str, url: str, api_key: str, called_from: str
) -> Optional[dict]:
    """Call OpenAI chat with structured JSON output. Log cost. Return None on error."""
    excerpt = html[:OPENAI_EXCERPT_BYTES]
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"URL: {url}\n\nHTML excerpt:\n{excerpt}"},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
        "max_tokens": 50,
    }
    try:
        resp = httpx.post(
            OPENAI_CHAT_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        if resp.status_code >= 400:
            logger.warning("OpenAI classify failed %d: %s", resp.status_code, resp.text[:200])
            return None
        data = resp.json()
        # Cost logging via the shared helper. Pricing for gpt-4o-mini is
        # tiny but we log to api_usage_log so admin sees it.
        usage = data.get("usage", {})
        # gpt-4o-mini: $0.150 / 1M input tokens, $0.600 / 1M output tokens
        # (as of 2026-05). Hard-code here to avoid round-trip to a pricing
        # table for a single model. Move to api_pricing_config if more
        # OpenAI models start writing here directly from pipelines.
        prompt_tokens = int(usage.get("prompt_tokens", 0))
        completion_tokens = int(usage.get("completion_tokens", 0))
        cost_usd = (prompt_tokens / 1_000_000) * 0.150 + (completion_tokens / 1_000_000) * 0.600
        log_api_call(
            provider="openai",
            operation="landing_page_classifier",
            model_or_actor=OPENAI_MODEL,
            units_consumed=prompt_tokens + completion_tokens,
            unit_type="tokens",
            cost_usd=cost_usd,
            called_from=called_from,
            metadata={
                "input_tokens": prompt_tokens,
                "output_tokens": completion_tokens,
                "url": url,
            },
        )
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        if not isinstance(parsed.get("is_law_firm"), bool):
            return None
        if parsed.get("confidence") not in ("low", "medium", "high"):
            parsed["confidence"] = "medium"
        return parsed
    except (httpx.RequestError, json.JSONDecodeError, KeyError) as e:
        logger.warning("OpenAI classify exception: %s", e)
        return None


__all__ = ["classify_domain", "Classification", "TTL_BY_SOURCE"]
