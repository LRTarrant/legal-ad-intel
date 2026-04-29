#!/usr/bin/env python3
"""
Apply digital enrichment results to the TypeScript competitive landscape data files.

Reads the enriched JSON output and updates the corresponding .ts files by setting
googleAds/youtube/meta/tiktok booleans on the top-N entries per DMA.

Usage:
    python scripts/apply_enrichment_to_ts.py \
        --enriched /path/to/enriched.json \
        --data-dir web/lib/data/competitive-landscape
"""

import argparse
import json
import re
from pathlib import Path

STATE_FILES = {
    "alabama": "alabama.ts",
    "arizona": "arizona.ts",
    "california": "california.ts",
    "florida": "florida.ts",
    "tennessee": "tennessee.ts",
    "georgia": "georgia.ts",
}


def load_enriched(path: Path) -> dict[str, dict[str, dict]]:
    """Load enriched results and index by (state, dma, advertiser)."""
    with open(path) as f:
        data = json.load(f)

    index: dict[str, dict[str, dict]] = {}
    for firm in data:
        state = firm.get("state", "").lower()
        dma = firm.get("dma", "")
        advertiser = firm.get("advertiser", "")
        key = f"{state}|{dma}|{advertiser}"
        index[key] = firm
    return index


def update_ts_file(ts_path: Path, state: str, enriched_index: dict, checked_at: str) -> dict:
    """Update a .ts data file with enrichment results.

    Returns stats dict: {dma: {total, googleAds, youtube, meta, tiktok}}
    """
    content = ts_path.read_text()
    stats: dict[str, dict] = {}

    # Parse the JSON object from the TS file
    # The data object starts after "= \n{" — find the assignment operator first
    eq_idx = content.index("=\n") if "=\n" in content else content.index("= \n")
    json_start = content.index("{", eq_idx)
    json_end = content.rindex("}") + 1
    prefix = content[:json_start]
    suffix = content[json_end:]

    json_str = content[json_start:json_end]

    # Handle trailing commas (TS allows them, JSON doesn't)
    json_str_clean = re.sub(r',(\s*[}\]])', r'\1', json_str)

    data = json.loads(json_str_clean)

    # Update digitalPresenceCheckedAt
    data["digitalPresenceCheckedAt"] = checked_at

    for dma, entries in data.get("data", {}).items():
        dma_stats = {"total": 0, "googleAds": 0, "youtube": 0, "meta": 0, "tiktok": 0}

        for i, entry in enumerate(entries):
            advertiser = entry.get("advertiser", "")
            key = f"{state}|{dma}|{advertiser}"

            enriched = enriched_index.get(key)
            if enriched:
                # Apply enrichment — set booleans
                entry["googleAds"] = enriched.get("googleAds", False)
                entry["youtube"] = enriched.get("youtube", False)
                entry["meta"] = enriched.get("meta", False)
                entry["tiktok"] = enriched.get("tiktok", False)

                dma_stats["total"] += 1
                if enriched.get("googleAds"):
                    dma_stats["googleAds"] += 1
                if enriched.get("youtube"):
                    dma_stats["youtube"] += 1
                if enriched.get("meta"):
                    dma_stats["meta"] += 1
                if enriched.get("tiktok"):
                    dma_stats["tiktok"] += 1
            else:
                # Not in enrichment set — remove any existing booleans
                # (entries beyond top-20 should not have these)
                # But keep existing values for entries that were already enriched
                # and are NOT in the current run (shouldn't happen for top-20)
                pass

        stats[dma] = dma_stats

    # Write back as nicely formatted JSON embedded in TS
    json_output = json.dumps(data, indent=2, ensure_ascii=False)
    ts_path.write_text(prefix + json_output + suffix)

    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--enriched", required=True)
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--checked-at", default="April 21, 2026")
    args = parser.parse_args()

    enriched_path = Path(args.enriched)
    data_dir = Path(args.data_dir)

    enriched_index = load_enriched(enriched_path)
    print(f"Loaded {len(enriched_index)} enriched firms")

    all_stats = {}
    for state, filename in STATE_FILES.items():
        ts_path = data_dir / filename
        if not ts_path.exists():
            print(f"SKIP: {ts_path} not found")
            continue
        print(f"\nUpdating {ts_path}...")
        stats = update_ts_file(ts_path, state, enriched_index, args.checked_at)
        all_stats[state] = stats
        for dma, s in stats.items():
            print(f"  {dma}: {s['total']} enriched — GA:{s['googleAds']} YT:{s['youtube']} Meta:{s['meta']} TT:{s['tiktok']}")

    # Print summary table
    print("\n=== SUMMARY ===")
    print(f"{'State':<15} {'Firms':>6} {'Google':>7} {'YouTube':>8} {'Meta':>6} {'TikTok':>7}")
    print("-" * 55)
    for state, dma_stats in all_stats.items():
        total = sum(s["total"] for s in dma_stats.values())
        ga = sum(s["googleAds"] for s in dma_stats.values())
        yt = sum(s["youtube"] for s in dma_stats.values())
        meta = sum(s["meta"] for s in dma_stats.values())
        tt = sum(s["tiktok"] for s in dma_stats.values())
        print(f"{state.title():<15} {total:>6} {ga:>7} {yt:>8} {meta:>6} {tt:>7}")


if __name__ == "__main__":
    main()
