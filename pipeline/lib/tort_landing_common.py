"""
Shared helpers for the tort_landing_pages_{daily,weekly} pipelines.

Keeps DB-query boilerplate and dict-shape logic in one place so the two
pipeline scripts focus on orchestration.
"""
from __future__ import annotations

import logging
from typing import Optional

from .pipeline import _get
from .slug_normalizer import slugified_path_tort_match

logger = logging.getLogger(__name__)


def load_active_torts() -> list[dict]:
    """Return mass_torts with has_advertising_page=true.

    Each row: {id, slug (db), advertising_page_slug (or None), name}.
    Pipelines should match SERP rows by `advertising_page_slug or slug`,
    since SERP keys on the filesystem slug.
    """
    return _get("mass_torts", {
        "select": "id,slug,advertising_page_slug,name",
        "has_advertising_page": "eq.true",
        "order": "slug.asc",
    })


def load_synonyms_by_tort(tort_ids: list[str]) -> dict[str, dict]:
    """Return {tort_id: {"primary": str, "aliases": [str], "primary_label": str}}.

    Empty list of tort_ids returns {}.
    """
    if not tort_ids:
        return {}
    rows = _get("tort_synonyms", {
        "select": "tort_id,synonym,is_primary",
        "tort_id": f"in.({','.join(tort_ids)})",
    })
    out: dict[str, dict] = {}
    for row in rows:
        tid = row["tort_id"]
        entry = out.setdefault(tid, {"primary": "", "aliases": [], "primary_label": ""})
        if row["is_primary"]:
            entry["primary"] = row["synonym"]
            entry["primary_label"] = row["synonym"]
        else:
            entry["aliases"].append(row["synonym"])
    return out


def load_allow_list_domains() -> frozenset[str]:
    """Domains belonging to known law firms (firms + advertiser_entities)."""
    from .domain_mapper import extract_root_domain

    domains: set[str] = set()

    firms = _get("firms", {"select": "website_url", "website_url": "not.is.null"})
    for r in firms:
        d = extract_root_domain(r.get("website_url", "") or "")
        if d:
            domains.add(d)

    # Restrict advertiser_entities to law-firm entity_type so we don't
    # accidentally allow-list manufacturers or media sellers.
    ents = _get("advertiser_entities", {
        "select": "website,aliases",
        "entity_type": "eq.law_firm",
    })
    for r in ents:
        d = extract_root_domain(r.get("website", "") or "")
        if d:
            domains.add(d)
        for alias in r.get("aliases") or []:
            d = extract_root_domain(alias)
            if d:
                domains.add(d)

    return frozenset(domains)


def load_manufacturer_domains() -> frozenset[str]:
    """Domains in manufacturer_tort_map (deny-list side).

    `manufacturer_tort_map` doesn't carry a domain column itself — it links
    to `recall_manufacturers` via manufacturer_id, where `website` lives.
    Embed via PostgREST FK so we only pull the 8-ish mapped rows rather
    than all 1,400+ manufacturers.
    """
    from .domain_mapper import extract_root_domain

    rows = _get("manufacturer_tort_map", {"select": "recall_manufacturers(website)"})
    return frozenset(
        d for d in (
            extract_root_domain((r.get("recall_manufacturers") or {}).get("website") or "")
            for r in rows
        ) if d
    )


def compute_slug_match(url: str, synonyms_entry: dict) -> str:
    """Wrapper that supplies an empty-string default when no synonyms exist."""
    if not synonyms_entry or not synonyms_entry.get("primary"):
        return ""
    return slugified_path_tort_match(
        url,
        primary_synonym=synonyms_entry["primary"],
        aliases=synonyms_entry["aliases"],
    )


__all__ = [
    "load_active_torts",
    "load_synonyms_by_tort",
    "load_allow_list_domains",
    "load_manufacturer_domains",
    "compute_slug_match",
]
