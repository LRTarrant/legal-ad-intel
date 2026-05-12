#!/usr/bin/env python3
"""
backfill_tort_landing_pages — one-shot baseline of tort_landing_pages from
the trailing 30 days of serp_results_raw, so the velocity matview has data
on day one.

Idempotent: re-running just refreshes last_seen_at / rank on rows it already
created via the dedup unique index. Does NOT re-classify domains that are
already cached and non-expired.

Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \\
      python pipeline/scripts/backfill_tort_landing_pages.py
    # add --days 60 to backfill more
    # add --dry-run to print without writing
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lib.pipeline import PipelineRun, _get, _bulk_insert  # noqa: E402
from lib.domain_mapper import extract_root_domain  # noqa: E402
from lib.landing_page_classifier import classify_domain  # noqa: E402
from lib.tort_landing_common import (  # noqa: E402
    load_active_torts, load_synonyms_by_tort,
    load_allow_list_domains, load_manufacturer_domains,
    compute_slug_match,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(message)s")

SERP_FEATURE_BY_RESULT_TYPE = {"organic": "organic", "paid": "ads", "local_pack": "local_pack"}
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30, help="Backfill window in days")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    cutoff = datetime.combine(date.today() - timedelta(days=args.days), datetime.min.time(), tzinfo=timezone.utc)

    with PipelineRun("backfill_tort_landing_pages", trigger="manual") as run:
        with run.step("load_context") as step:
            torts = load_active_torts()
            tort_by_fs_slug = {(t.get("advertising_page_slug") or t["slug"]): t for t in torts}
            synonyms = load_synonyms_by_tort([t["id"] for t in torts])
            allow_list = load_allow_list_domains()
            manuf = load_manufacturer_domains()
            step.set_metadata({"active_torts": len(torts), "days": args.days})

        with run.step("read_serp_history") as step:
            fs_slugs = list(tort_by_fs_slug.keys())
            rows = _get("serp_results_raw", {
                "select": "tort_slug,result_type,position,link,title,fetched_at",
                "tort_slug": f"in.({','.join(fs_slugs)})",
                "result_type": "in.(organic,paid,local_pack)",
                "fetched_at": f"gte.{cutoff.isoformat()}",
                "limit": "200000",
            })
            step.set_counts(rows_in=0, rows_out=len(rows))

        with run.step("classify_and_upsert") as step:
            grouped: dict[tuple, dict] = {}
            for r in rows:
                link = (r.get("link") or "").strip()
                if not link:
                    continue
                tort = tort_by_fs_slug.get(r["tort_slug"])
                if not tort:
                    continue
                domain = extract_root_domain(link)
                if not domain:
                    continue
                syn = synonyms.get(tort["id"], {})
                slug_match = compute_slug_match(link, syn)
                key = (tort["id"], domain, slug_match)
                first_seen = r["fetched_at"]
                existing = grouped.get(key)
                if existing is None or r.get("position", 999) < existing["rank"]:
                    grouped[key] = {
                        "tort_id": tort["id"],
                        "url": link,
                        "registered_domain": domain,
                        "slugified_path_tort_match": slug_match,
                        "dma_code": None,
                        "rank": r.get("position", 999),
                        "serp_feature": SERP_FEATURE_BY_RESULT_TYPE.get(r["result_type"], "organic"),
                        "title": r.get("title"),
                        "first_seen_at": first_seen,
                        "last_seen_at": first_seen,
                    }

            # Classify each unique domain (or skip via cache).
            unique_domains = sorted({v["registered_domain"] for v in grouped.values()})
            verdicts: dict[str, dict] = {}
            cached = _get("domain_classifications", {
                "select": "registered_domain,is_law_firm,classifier_source,confidence,expires_at",
                "registered_domain": f"in.({','.join(unique_domains)})",
                "expires_at": f"gt.{datetime.now(timezone.utc).isoformat()}",
            }) if unique_domains else []
            for c in cached:
                verdicts[c["registered_domain"]] = c

            new_classifications = []
            for domain in unique_domains:
                if domain in verdicts:
                    continue
                # Pick a sample URL for this domain.
                sample_url = next(v["url"] for v in grouped.values() if v["registered_domain"] == domain)
                try:
                    result = classify_domain(
                        domain, sample_url=sample_url,
                        allow_list_domains=allow_list,
                        manufacturer_domains=manuf,
                        called_from="scripts.backfill_tort_landing_pages",
                        openai_api_key=OPENAI_API_KEY or None,
                    )
                except Exception as e:  # noqa: BLE001
                    logger.warning("Classifier crashed for %s: %s", domain, e)
                    continue
                verdicts[domain] = {
                    "is_law_firm": result.is_law_firm,
                    "classifier_source": result.source,
                    "confidence": result.confidence,
                }
                new_classifications.append({
                    "registered_domain": domain,
                    "is_law_firm": result.is_law_firm,
                    "classifier_source": result.source,
                    "confidence": result.confidence,
                    "signal_score": result.signal_score if result.signal_score >= 0 else None,
                    "matched_signals": result.matched_signals,
                    "expires_at": result.expires_at.isoformat(),
                })

            if new_classifications:
                _bulk_insert("domain_classifications", new_classifications,
                             on_conflict="registered_domain", resolution="merge-duplicates")

            # Build the upsert rows.
            upsert_rows = []
            for v in grouped.values():
                verdict = verdicts.get(v["registered_domain"])
                if not verdict:
                    classification_status = "pending"
                    is_law_firm = False
                    confidence = None
                else:
                    is_law_firm = verdict["is_law_firm"]
                    if verdict["classifier_source"] == "openai" and verdict["confidence"] == "medium":
                        classification_status = "candidate"
                    else:
                        classification_status = "confirmed" if is_law_firm else "denied"
                    confidence = "confirmed" if is_law_firm else None
                upsert_rows.append({
                    **v,
                    "is_law_firm": is_law_firm,
                    "confidence": confidence,
                    "classification_status": classification_status,
                    "raw_serp": {"source": "backfill", "window_days": args.days},
                })

            count = _bulk_insert(
                "tort_landing_pages", upsert_rows,
                on_conflict="tort_id,registered_domain,slugified_path_tort_match",
                resolution="merge-duplicates",
            )
            step.set_counts(rows_in=len(rows), rows_out=count)
            step.set_metadata({
                "unique_keys": len(grouped),
                "new_classifications": len(new_classifications),
                "confirmed": sum(1 for r in upsert_rows if r["classification_status"] == "confirmed"),
                "denied": sum(1 for r in upsert_rows if r["classification_status"] == "denied"),
            })

        with run.step("refresh_velocity_matview") as step:
            import httpx
            from lib.pipeline import _headers, SUPABASE_URL
            resp = httpx.post(
                f"{SUPABASE_URL}/rest/v1/rpc/refresh_tort_landing_page_velocity",
                headers=_headers(), json={}, timeout=120,
            )
            step.set_metadata({"status": resp.status_code})
            step.set_counts(rows_in=0, rows_out=1 if resp.status_code < 400 else 0)


if __name__ == "__main__":
    main()
