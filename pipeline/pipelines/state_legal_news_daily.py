#!/usr/bin/env python3
"""
state_legal_news_daily pipeline — per-state single-incident PI legal news.

Queries Google News (via SearchApi.io) per state x practice area for recent
single-incident PI activity (verdicts, settlements, crashes, OSHA fatalities,
filings), applies a relevance filter, classifies each item into a category +
stream (+ extracts a dollar figure), and upserts into `state_legal_news`.

SCOPE: single-incident PI only (MVA, trucking, motorcycle, construction/OSHA,
sexual abuse, TBI, explosions). NO mass torts. Republishable sources only —
we store headline + source + date + link + our own summary, never full article
text. See docs / the migration header for the full republish-wall rationale.

Usage:
    python -m pipelines.state_legal_news_daily
    python -m pipelines.state_legal_news_daily --dry-run
    python -m pipelines.state_legal_news_daily --states AL              # one state
    python -m pipelines.state_legal_news_daily --states AL,GA,FL --no-ai
    DRY_RUN=true python -m pipelines.state_legal_news_daily --states AL

Environment variables:
    SUPABASE_URL            — Supabase project URL (required)
    SUPABASE_SERVICE_KEY    — Supabase service role key (required)
    SEARCHAPI_API_KEY       — Searchapi.io API key (required for real data)
    OPENAI_API_KEY          — OpenAI key (optional; enables the AI refiner)
    DRY_RUN                 — "true" to skip all DB writes (optional)
    PIPELINE_TRIGGER        — "scheduled" | "manual" (optional, default "manual")
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (  # noqa: E402
    PipelineRun, DRY_RUN,
    _bulk_insert, _dedup_rows,
    SUPABASE_URL, _headers,
)
from lib.api_usage import log_api_call  # noqa: E402

try:
    import dateparser  # type: ignore
except ImportError:  # dateparser is in scripts/requirements; degrade gracefully
    dateparser = None

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_MODEL = "gpt-4o-mini"

REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3

# Cap rows kept per state so a high-volume state doesn't bloat the carousel /
# table. The UI shows the newest ~15; keep a little headroom for dedup churn.
MAX_ROWS_PER_STATE = 40

# ---------------------------------------------------------------------------
# Dimensions: states + single-incident PI practice areas
# ---------------------------------------------------------------------------

STATES: dict[str, str] = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "Washington DC", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

# practice_area key -> (query fragment, suffix). The suffix steers each query:
# incident queries lean toward fresh events; the outcome query chases the
# higher-value but lower-volume verdict/settlement stream (the differentiator).
PRACTICE_AREAS: list[tuple[str, str]] = [
    ("mva", "car accident"),
    ("trucking", "truck accident"),
    ("motorcycle", "motorcycle accident"),
    ("construction", "construction accident OR workplace death"),
    ("sexual_abuse", "sexual abuse lawsuit"),
    ("tbi", "traumatic brain injury lawsuit"),
    ("explosion", "explosion OR fire injury lawsuit"),
]

# Dedicated outcome queries — verdicts/settlements rarely surface under the
# incident queries above, so chase them explicitly. practice_area is tagged
# from the query's own subject.
OUTCOME_QUERIES: list[tuple[str, str]] = [
    ("mva", "personal injury verdict OR settlement million"),
    ("trucking", "truck accident verdict OR settlement"),
    ("sexual_abuse", "sexual abuse settlement OR verdict"),
]

# ---------------------------------------------------------------------------
# Relevance filter + classification (keyword rules)
# ---------------------------------------------------------------------------

# Hard rejects: SEO spam, lead-gen landing pages, "how-to" / "average
# settlement" pages, and product-liability/mass-tort solicitation (out of scope).
_REJECT_PATTERNS = re.compile(
    r"\b(average settlement|how much|how to|what to do|calculator|"
    r"near me|best (lawyer|attorney|law firm)|top \d+|free consultation|"
    r"free case (review|evaluation)|case evaluation|get a free|claim review|"
    r"hiring a lawyer|do i need|statute of limitations|find a lawyer|"
    r"settlement amounts?|compensation calculator|"
    r"primary election|general election|ballot|voters|campaign trail|"
    r"senate race|governor.{0,3}s race)\b",
    re.IGNORECASE,
)

# Criminal-justice news (executions, sentencing, guilty pleas) is not a civil
# PI signal — drop it even though it contains "killed"/"raped" relevance words.
_CRIMINAL_PATTERNS = re.compile(
    r"\b(execution date|death row|executed|sentenced to|pleads? guilty|"
    r"convicted|found guilty|guilty verdict|murder trial|capital murder|"
    r"charged with murder|murder charge|state of [a-z]+ v(s|ersus)?\b|"
    r"grand jury indicts?|arraign|on death row|life in prison)\b",
    re.IGNORECASE,
)

# Lead-gen titles are almost always "<Product> Lawsuit | <Firm>" — a pipe
# followed by law-firm branding. Reject those outright.
_LEADGEN_TITLE = re.compile(r"\|\s*(s&c|.*law (firm|group|office)|get )", re.IGNORECASE)

# An item must contain at least one of these to be a real event (outcome or incident).
_RELEVANCE_PATTERNS = re.compile(
    r"\b(verdict|settlement|settles?|settled|awarded|jury|lawsuit|"
    r"sues?|sued|filed|complaint|killed|dies?|died|dead|fatal|"
    r"injured|injuries|crash|collision|wreck|pileup|"
    r"osha|cited|electrocut|trench|struck|charged)\b",
    re.IGNORECASE,
)

_OUTCOME_PATTERNS = re.compile(
    r"\b(verdict|jury awarded|jury finds|awarded|settlement|settles?|"
    r"settled|agrees to pay|resolves?|payout|damages)\b",
    re.IGNORECASE,
)


def truncate_summary(text: str, max_chars: int = 240) -> str:
    clean = re.sub(r"<[^>]+>", "", text or "").strip()
    if len(clean) <= max_chars:
        return clean
    return clean[:max_chars].rsplit(" ", 1)[0] + "…"


def classify_category(title: str, snippet: str) -> str:
    text = f"{title} {snippet}".lower()
    if any(w in text for w in ["verdict", "jury awarded", "jury finds", "jury awards", "damages awarded"]):
        return "verdict"
    if any(w in text for w in ["settlement", "settles", "settled", "agrees to pay", "resolves"]):
        return "settlement"
    if any(w in text for w in ["osha", "trench", "electrocut", "workplace death", "scaffold"]):
        return "osha"
    if any(w in text for w in ["crash", "collision", "wreck", "pileup", "killed", "fatal", "dies", "died"]):
        return "crash"
    if any(w in text for w in ["fda", "epa", "warning letter", "regulator", "recall"]):
        return "regulatory"
    if any(w in text for w in ["filed", "lawsuit", "complaint", "sues", "sued", "charged"]):
        return "filing"
    return "general"


_AMOUNT_RE = re.compile(
    r"\$\s*([\d,]+(?:\.\d+)?)\s*(billion|million|thousand|b|m|k)?",
    re.IGNORECASE,
)
_SCALE = {
    "billion": 1_000_000_000, "b": 1_000_000_000,
    "million": 1_000_000, "m": 1_000_000,
    "thousand": 1_000, "k": 1_000,
}


def extract_amount(title: str, snippet: str) -> float | None:
    """Pull the largest dollar figure mentioned (verdicts lead with the number)."""
    text = f"{title} {snippet}"
    best: float | None = None
    for num, scale in _AMOUNT_RE.findall(text):
        try:
            val = float(num.replace(",", ""))
        except ValueError:
            continue
        val *= _SCALE.get(scale.lower(), 1) if scale else 1
        # Ignore tiny figures (phone-number-ish or "$5 fee"); PI events are ≥ $1k.
        if val < 1000:
            continue
        if best is None or val > best:
            best = val
    return best


def is_relevant(title: str, snippet: str) -> bool:
    text = f"{title} {snippet}"
    if _REJECT_PATTERNS.search(text):
        return False
    if _LEADGEN_TITLE.search(title):
        return False
    if _CRIMINAL_PATTERNS.search(text):
        return False
    return bool(_RELEVANCE_PATTERNS.search(text))


def mentions_state(text: str, abbr: str, name: str) -> bool:
    """Geographic relevance gate. Google News returns global results for a
    state-keyword query (an 'Alabama car accident' query surfaces crashes in
    India and Qatar), so require a genuine state signal: the full state name,
    or a '<City>, AL' dateline. Abbreviation-only matching is avoided because
    many 2-letter codes (IN, OR, OK, ME, HI) are common English words.
    """
    if name.lower() in text.lower():
        return True
    # Dateline form, e.g. "Birmingham, AL" — comma before the uppercase abbr.
    if re.search(rf",\s*{re.escape(abbr)}\b", text):
        return True
    return False


def parse_published_date(date_str: str | None) -> str | None:
    if not date_str:
        return None
    if dateparser is None:
        return None
    parsed = dateparser.parse(date_str)
    return parsed.isoformat() if parsed else None


# ---------------------------------------------------------------------------
# Optional OpenAI refiner — sharpens stream + amount on relevant rows only.
# ---------------------------------------------------------------------------

_AI_SYSTEM_PROMPT = (
    "You classify U.S. single-incident personal-injury news headlines. "
    "Given a headline and snippet, return JSON: "
    '{"relevant": true|false, "stream": "outcome"|"incident", '
    '"amount_usd": number|null}. '
    "relevant=false for mass-tort/class-action news, legal marketing/SEO pages, "
    "or anything that is not a concrete single-incident PI event. "
    'stream="outcome" for a verdict or settlement, "incident" for a crash, '
    "death, injury, OSHA citation, or newly filed suit. amount_usd is the "
    "verdict/settlement dollar figure if stated, else null."
)


def ai_refine(title: str, snippet: str, *, called_from: str) -> dict | None:
    """Refine classification via gpt-4o-mini. Returns None on any error."""
    if not OPENAI_API_KEY:
        return None
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": _AI_SYSTEM_PROMPT},
            {"role": "user", "content": f"Headline: {title}\nSnippet: {snippet}"},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
        "max_tokens": 60,
    }
    try:
        resp = httpx.post(
            OPENAI_CHAT_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=30,
        )
        if resp.status_code >= 400:
            logger.warning("OpenAI refine failed %d: %s", resp.status_code, resp.text[:200])
            return None
        data = resp.json()
        usage = data.get("usage", {})
        prompt_tokens = int(usage.get("prompt_tokens", 0))
        completion_tokens = int(usage.get("completion_tokens", 0))
        cost_usd = (prompt_tokens / 1_000_000) * 0.150 + (completion_tokens / 1_000_000) * 0.600
        log_api_call(
            provider="openai",
            operation="state_legal_news_refine",
            model_or_actor=OPENAI_MODEL,
            units_consumed=prompt_tokens + completion_tokens,
            unit_type="tokens",
            cost_usd=cost_usd,
            called_from=called_from,
            metadata={"input_tokens": prompt_tokens, "output_tokens": completion_tokens},
        )
        parsed = json.loads(data["choices"][0]["message"]["content"])
        if not isinstance(parsed.get("relevant"), bool):
            return None
        if parsed.get("stream") not in ("outcome", "incident"):
            parsed["stream"] = "incident"
        return parsed
    except (httpx.RequestError, json.JSONDecodeError, KeyError) as e:
        logger.warning("OpenAI refine exception: %s", e)
        return None


# ---------------------------------------------------------------------------
# SearchApi
# ---------------------------------------------------------------------------

def _searchapi_google_news(query: str) -> dict:
    """Call Searchapi.io Google News with retry + exponential backoff."""
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google_news",
                "q": query,
                "api_key": SEARCHAPI_API_KEY,
                "time_period": "last_month",
                "sort_by": "most_recent",
                "gl": "us",
                "hl": "en",
            }, timeout=30)
            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on '%s', backing off %.1fs", query, backoff)
                time.sleep(backoff)
                continue
            resp.raise_for_status()
            log_api_call(
                provider="searchapi", operation="searchapi_google_news",
                model_or_actor="google_news", units_consumed=1, unit_type="searches",
                cost_usd=0.0, called_from="pipelines.state_legal_news_daily",
                metadata={"q": query},
            )
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s", query, MAX_RETRIES, e)
    return {}


def _build_rows_for_state(abbr: str, name: str, *, use_ai: bool) -> tuple[list[dict], dict]:
    """Query every practice area for one state; return (rows, stats)."""
    rows: list[dict] = []
    fetched = 0
    rejected = 0

    queries: list[tuple[str, str]] = [
        (area, f'"{name}" {frag} (lawsuit OR verdict OR settlement OR filed OR killed OR injured)')
        for area, frag in PRACTICE_AREAS
    ] + [
        (area, f'"{name}" {frag}') for area, frag in OUTCOME_QUERIES
    ]

    for area_key, query in queries:
        data = _searchapi_google_news(query)
        for item in data.get("organic_results", []):
            fetched += 1
            title = (item.get("title") or "").strip()
            link = (item.get("link") or "").strip()
            snippet = (item.get("snippet") or "").strip()
            if not link or not title:
                continue

            # Geographic gate first (drops global + national-lead-gen noise),
            # then topical relevance / spam rejection.
            if not mentions_state(f"{title} {snippet}", abbr, name):
                rejected += 1
                continue
            if not is_relevant(title, snippet):
                rejected += 1
                continue

            category = classify_category(title, snippet)
            amount = extract_amount(title, snippet)
            stream = "outcome" if (_OUTCOME_PATTERNS.search(f"{title} {snippet}") or amount) else "incident"

            if use_ai:
                refined = ai_refine(title, snippet, called_from="pipelines.state_legal_news_daily")
                if refined is not None:
                    if refined.get("relevant") is False:
                        rejected += 1
                        continue
                    stream = refined.get("stream", stream)
                    if refined.get("amount_usd"):
                        amount = float(refined["amount_usd"])

            rows.append({
                "state_abbr": abbr,
                "title": title[:500],
                "summary": truncate_summary(snippet),
                "source_name": item.get("source") or "Google News",
                "source_url": link,
                "published_at": parse_published_date(item.get("date")),
                "category": category,
                "stream": stream,
                "amount_usd": amount,
                "location": None,
                "practice_area": area_key,
                "query_bucket": "searchapi_google_news",
                "query_term": query[:500],
                "raw": item,
            })
        time.sleep(REQUEST_DELAY_SECONDS)

    # Dedup within state by source_url; keep the newest MAX_ROWS_PER_STATE.
    rows = _dedup_rows(rows, ("state_abbr", "source_url"))
    rows.sort(key=lambda r: r.get("published_at") or "", reverse=True)
    rows = rows[:MAX_ROWS_PER_STATE]
    return rows, {"fetched": fetched, "rejected": rejected, "kept": len(rows)}


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def step_fetch_raw(step, states: list[str], use_ai: bool) -> int:
    if not SEARCHAPI_API_KEY:
        raise ValueError(
            "SEARCHAPI_API_KEY not set — state_legal_news_daily needs a live "
            "Google News feed (no seed-data fallback for real news)."
        )

    total_inserted = 0
    per_state: dict[str, dict] = {}

    for abbr in states:
        name = STATES.get(abbr)
        if not name:
            logger.warning("Unknown state code '%s', skipping", abbr)
            continue
        logger.info("  [%s] fetching legal news…", abbr)
        rows, stats = _build_rows_for_state(abbr, name, use_ai=use_ai)
        per_state[abbr] = stats
        if rows:
            # Upsert per state so a mid-run timeout keeps completed states.
            total_inserted += _bulk_insert(
                "state_legal_news", rows,
                on_conflict="state_abbr,source_url",
                resolution="merge-duplicates",
            )

    step.set_metadata({
        "states": states,
        "use_ai": use_ai,
        "rows_inserted": total_inserted,
        "per_state": per_state,
    })
    step.set_counts(rows_in=0, rows_out=total_inserted)
    return total_inserted


def step_publish(step, raw_count: int):
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        print("\n  [DRY RUN] Skipping verification")
        return
    url = f"{SUPABASE_URL}/rest/v1/state_legal_news"
    headers = {**_headers(), "Prefer": "count=exact"}
    resp = httpx.head(url, headers=headers, params={"select": "*"}, timeout=30)
    resp.raise_for_status()
    cr = resp.headers.get("content-range", "")
    total = int(cr.split("/")[-1]) if "/" in cr and cr.split("/")[-1] != "*" else 0
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({"total_rows": total, "publish_timestamp": datetime.now(timezone.utc).isoformat()})
    print(f"\n  state_legal_news total rows: {total}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Per-state single-incident PI legal news pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Run without writing to database")
    parser.add_argument("--states", type=str, default=None,
                        help="Comma-separated state codes to limit (e.g. 'AL,GA'). Default: all.")
    parser.add_argument("--no-ai", action="store_true",
                        help="Disable the OpenAI refiner even if OPENAI_API_KEY is set.")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    if args.states:
        states = [s.strip().upper() for s in args.states.split(",") if s.strip()]
    else:
        states = list(STATES.keys())

    use_ai = bool(OPENAI_API_KEY) and not args.no_ai
    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("state_legal_news_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_count = step_fetch_raw(step, states, use_ai)
        with run.step("publish") as step:
            step_publish(step, raw_count)


if __name__ == "__main__":
    main()
