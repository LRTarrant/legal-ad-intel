#!/usr/bin/env python3
"""
Digital Advertising Presence Enrichment Pipeline

Given a JSON list of law firm advertisers, enriches each with boolean flags
for presence on Google Ads, YouTube, Meta Ad Library, and TikTok Ad Library
using public signals (no paid APIs required).

Detection strategies per platform:
  - Google Ads: Website pixel detection (gtag.js / AW- conversion IDs)
  - YouTube:    Server-rendered YouTube search for branded channels
  - Meta:       Website pixel detection (fbq / Meta Pixel)
  - TikTok:     Website pixel detection (ttq / TikTok Pixel)

The website pixel approach checks if a firm's own website loads ad platform
tracking pixels (gtag, fbq, ttq), which definitively proves they actively
run ads on those platforms. This is more reliable than scraping the ad
libraries directly, which are fully JS-rendered SPAs with anti-bot measures.

For ad library scraping at scale, integrate Apify actors as a follow-up.

Usage:
    python scripts/enrich_digital_presence.py \
        --input birmingham_top10.json \
        --output birmingham_top10_enriched.json
"""

import argparse
import json
import logging
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared HTTP client config
# ---------------------------------------------------------------------------
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

TIMEOUT = httpx.Timeout(15.0, connect=10.0)
DELAY_BETWEEN_CALLS = 1.0  # seconds — be API-polite


def _client() -> httpx.Client:
    return httpx.Client(
        headers=HEADERS,
        timeout=TIMEOUT,
        follow_redirects=True,
    )


# ---------------------------------------------------------------------------
# Retry decorator for transient network errors
# ---------------------------------------------------------------------------
_retry_on_network = retry(
    retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.TransportError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)


# ---------------------------------------------------------------------------
# Helper: determine search name(s) for a firm
# ---------------------------------------------------------------------------
def _search_names(firm: dict) -> list[str]:
    """Return ordered list of names to try searching.

    For tort-specific advertiser names (contain hyphens with a prefix like
    "Rideshare Sexual Assault-Blue Sky Legal"), search by parent first.
    """
    advertiser = firm.get("advertiser", "")
    parent = firm.get("parent", "")

    is_tort_specific = (
        "-" in advertiser
        and parent
        and advertiser != parent
        and not advertiser.lower().startswith(parent.lower())
    )

    if is_tort_specific and parent:
        return [parent, advertiser]
    if parent and parent != advertiser:
        return [advertiser, parent]
    return [advertiser]


# ---------------------------------------------------------------------------
# Website pixel detection — checks a firm's website for ad platform pixels
# ---------------------------------------------------------------------------

# Google Ads markers: gtag.js with AW- conversion IDs, google_conversion,
# googletagmanager, or direct googleads references
GOOGLE_ADS_MARKERS = [
    "googletagmanager.com",
    "gtag(",
    "AW-",
    "google_conversion",
    "googleads.g.doubleclick",
    "/pagead/",
]

# Meta/Facebook pixel markers: fbq() calls, facebook.com/tr pixel, fbevents.js
META_MARKERS = [
    "fbq(",
    "fbevents.js",
    "facebook.com/tr",
    "connect.facebook.net",
]

# TikTok pixel markers: ttq calls, analytics.tiktok.com
TIKTOK_MARKERS = [
    "ttq.",
    "analytics.tiktok.com",
    "tiktok.com/i18n/pixel",
]


def _check_website_pixels(
    client: httpx.Client, url: str
) -> dict[str, bool]:
    """Fetch a website and detect ad platform tracking pixels.

    Returns dict with googleAds/meta/tiktok bools plus _reachable flag.
    """
    result: dict[str, bool] = {
        "googleAds": False, "meta": False, "tiktok": False, "_reachable": False,
    }
    try:
        resp = client.get(url, timeout=httpx.Timeout(10.0, connect=8.0))
        if resp.status_code >= 400:
            return result
        body = resp.text
        # Only consider it a real site if it has substantial content
        if len(body) < 1000:
            return result
        result["_reachable"] = True
        result["googleAds"] = any(m in body for m in GOOGLE_ADS_MARKERS)
        result["meta"] = any(m in body for m in META_MARKERS)
        result["tiktok"] = any(m in body for m in TIKTOK_MARKERS)
    except Exception as exc:
        log.debug("  Website fetch failed for %s: %s", url, exc)
    return result


# Known website domains for firms (populated during POC; extend as needed).
# Keys are lowercased advertiser or parent names.
KNOWN_DOMAINS: dict[str, str] = {
    "morgan & morgan": "https://www.forthepeople.com",
    "morgan & morgan pa": "https://www.forthepeople.com",
    "alexander shunnarah trial attorneys": "https://www.shunnarah.com",
    "shunnarah injury lawyers pc": "https://www.shunnarah.com",
    "mike slocumb law firm": "https://www.slocumblaw.com",
    "topdog law": "https://www.topdoglaw.com",
    "helm law group llc": "https://www.topdoglaw.com",
    "wettermark keith": "https://www.wettermarkkeith.com",
    "wettermark keith llc": "https://www.wettermarkkeith.com",
    "morris bart": "https://www.morrisbart.com",
    "morris bart llc": "https://www.morrisbart.com",
    "blue sky legal": "https://www.blueskylegal.com",
    "mezrano law firm": "https://mezrano.com",
    "mezrano law firm pc": "https://mezrano.com",
    "hollis wright & clay": "https://www.hwclaw.com",
    "hollis wright & clay pc": "https://www.hwclaw.com",
    "farris riley & pitt": "https://www.frplegal.com",
    "farris riley & pitt llp": "https://www.frplegal.com",
}


def _guess_website_urls(firm: dict) -> list[str]:
    """Generate candidate website URLs from firm/parent name.

    Checks known domain mappings first, then generates common patterns.
    """
    names = _search_names(firm)
    urls: list[str] = []

    # Check known domains first
    for name in names:
        known = KNOWN_DOMAINS.get(name.lower())
        if known:
            urls.append(known)

    # Generate guesses from name patterns
    for name in names:
        clean = re.sub(
            r"\s+(PA|PC|LLC|LLP|PLLC|Inc|PLC)\s*$", "", name, flags=re.IGNORECASE
        ).strip()
        slug = clean.lower()
        slug = re.sub(r"[^a-z0-9]+", "", slug)
        urls.extend([
            f"https://www.{slug}.com",
            f"https://{slug}.com",
            f"https://www.{slug}law.com",
            f"https://{slug}law.com",
        ])

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            unique.append(u)
    return unique


# ---------------------------------------------------------------------------
# Platform checkers
# ---------------------------------------------------------------------------

@_retry_on_network
def check_youtube(client: httpx.Client, name: str) -> tuple[bool, str]:
    """Check if the firm has a branded YouTube channel via server-rendered search."""
    search_url = f"https://www.youtube.com/results?search_query={quote_plus(name)}"
    try:
        resp = client.get(search_url)
        body = resp.text
        # YouTube server-renders initial data as JSON inside script tags.
        # Look for channelRenderer which indicates a branded channel result.
        has_channel = bool(re.search(r'"channelRenderer"', body))
        if not has_channel:
            # Check for video results with the firm name in the owner/channel
            first_word = re.escape(name.split()[0])
            has_channel = bool(
                re.search(
                    r'"ownerText".*?"text"\s*:\s*"[^"]*' + first_word + r'[^"]*"',
                    body,
                    re.IGNORECASE,
                )
            )
        return has_channel, search_url
    except (httpx.HTTPStatusError, httpx.TransportError):
        return False, search_url


# ---------------------------------------------------------------------------
# Per-firm enrichment orchestrator
# ---------------------------------------------------------------------------

def enrich_firm(client: httpx.Client, firm: dict) -> dict:
    """Enrich a single firm with digital presence signals.

    Strategy:
    1. YouTube: search YouTube for branded channel (server-rendered HTML)
    2. Google Ads / Meta / TikTok: detect tracking pixels on the firm's website
    """
    names = _search_names(firm)
    now = datetime.now(timezone.utc).isoformat()
    result = {
        "advertiser": firm["advertiser"],
        "parent": firm.get("parent", ""),
        "googleAds": False,
        "youtube": False,
        "meta": False,
        "tiktok": False,
        "evidenceUrls": {},
        "checkedAt": now,
    }

    # --- YouTube: search-based detection ---
    for name in names:
        try:
            log.info("  [youtube] searching: %s", name)
            found, url = check_youtube(client, name)
            time.sleep(DELAY_BETWEEN_CALLS)
            result["evidenceUrls"]["youtube"] = url
            if found:
                result["youtube"] = True
                break
        except Exception as exc:
            log.warning("  [youtube] error for '%s': %s", name, exc)
            time.sleep(DELAY_BETWEEN_CALLS)
    log.info("  [youtube] = %s", "\u2713" if result["youtube"] else "\u2717")

    # --- Google Ads / Meta / TikTok: website pixel detection ---
    website_urls = _guess_website_urls(firm)
    site_found = False
    for url in website_urls:
        try:
            log.info("  [pixels] checking: %s", url)
            pixels = _check_website_pixels(client, url)
            time.sleep(DELAY_BETWEEN_CALLS)
            if pixels.get("_reachable"):
                site_found = True
                result["evidenceUrls"].setdefault("website", url)
                if pixels["googleAds"]:
                    result["googleAds"] = True
                    result["evidenceUrls"]["googleAds"] = url
                if pixels["meta"]:
                    result["meta"] = True
                    result["evidenceUrls"]["meta"] = url
                if pixels["tiktok"]:
                    result["tiktok"] = True
                    result["evidenceUrls"]["tiktok"] = url
                break
        except Exception:
            continue

    if not site_found:
        log.info("  [pixels] could not reach any candidate website")

    # Store Ad Library search URLs as evidence even if not detected via pixels
    for platform, base in [
        ("googleAds", "https://adstransparency.google.com/?region=US&q="),
        ("meta", "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&search_type=keyword_unordered&q="),
        ("tiktok", "https://library.tiktok.com/ads?region=US&q="),
    ]:
        if platform not in result["evidenceUrls"]:
            result["evidenceUrls"][platform] = base + quote_plus(names[0])

    for platform in ["googleAds", "meta", "tiktok"]:
        log.info("  [%s] = %s", platform, "\u2713" if result[platform] else "\u2717")

    return result


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------
def run_pipeline(input_path: Path, output_path: Path) -> list[dict]:
    """Run enrichment for all firms in the input file."""
    with open(input_path) as f:
        firms = json.load(f)

    log.info("Loaded %d firms from %s", len(firms), input_path)

    results = []
    with _client() as client:
        for i, firm in enumerate(firms, 1):
            advertiser = firm.get("advertiser", "unknown")
            log.info("=== [%d/%d] %s ===", i, len(firms), advertiser)
            try:
                enriched = enrich_firm(client, firm)
                results.append(enriched)
            except Exception as exc:
                log.error("FAILED to enrich %s: %s", advertiser, exc)
                results.append({
                    "advertiser": advertiser,
                    "parent": firm.get("parent", ""),
                    "googleAds": False,
                    "youtube": False,
                    "meta": False,
                    "tiktok": False,
                    "evidenceUrls": {},
                    "checkedAt": datetime.now(timezone.utc).isoformat(),
                    "error": str(exc),
                })

    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    log.info("Wrote enrichment results to %s", output_path)

    return results


def print_results_table(results: list[dict]) -> None:
    """Print a summary table of enrichment results."""
    name_width = max(len(r["advertiser"]) for r in results)
    name_width = max(name_width, len("Firm"))

    header = (
        f"{'Firm':<{name_width}}  "
        f"{'Google Ads':^10}  {'YouTube':^8}  {'Meta':^6}  {'TikTok':^7}"
    )
    separator = "-" * len(header)
    print()
    print(header)
    print(separator)
    for r in results:
        g = "\u2713" if r["googleAds"] else "\u2717"
        y = "\u2713" if r["youtube"] else "\u2717"
        m = "\u2713" if r["meta"] else "\u2717"
        t = "\u2713" if r["tiktok"] else "\u2717"
        print(
            f"{r['advertiser']:<{name_width}}  "
            f"{g:^10}  {y:^8}  {m:^6}  {t:^7}"
        )
    print(separator)
    print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Enrich law firm advertisers with digital ad platform presence signals."
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Path to input JSON file with advertiser list",
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Path to write enriched JSON output",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        log.error("Input file not found: %s", input_path)
        sys.exit(1)

    results = run_pipeline(input_path, output_path)
    print_results_table(results)


if __name__ == "__main__":
    main()
