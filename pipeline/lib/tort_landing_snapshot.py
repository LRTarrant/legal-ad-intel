"""
tort_landing_snapshot — upload the first 50 KB of HTML to Supabase Storage.

Path convention: tort-landing-snapshots/<registered_domain>/<html_hash>.html

The hash key means each unique HTML body is uploaded once per domain.
If the firm later changes the page, a new hash → new object → first_seen_at
remains the moment we first detected this *version* of the page.

Storage RLS: super_admin SELECT only (see migration). Service-role bypasses
RLS so the pipeline can write.
"""
from __future__ import annotations

import hashlib
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY", "")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() in ("true", "1", "yes")

BUCKET = "tort-landing-snapshots"
MAX_SNAPSHOT_BYTES = 50 * 1024


def html_hash(html: str) -> str:
    """SHA-256 of the truncated HTML; first 16 hex chars are plenty."""
    truncated = html[:MAX_SNAPSHOT_BYTES].encode("utf-8", errors="ignore")
    return hashlib.sha256(truncated).hexdigest()[:16]


def upload_snapshot(registered_domain: str, html: str) -> Optional[tuple[str, str]]:
    """Upload (or no-op if already exists) and return (path, html_hash).

    Returns None on failure; the caller leaves snapshot_path NULL.
    """
    if not html:
        return None
    digest = html_hash(html)
    path = f"{registered_domain}/{digest}.html"
    if DRY_RUN:
        logger.info("  [DRY RUN] Would upload snapshot to %s/%s", BUCKET, path)
        return (path, digest)
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase env missing; cannot upload snapshot")
        return None

    body = html[:MAX_SNAPSHOT_BYTES].encode("utf-8", errors="ignore")
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    try:
        resp = httpx.post(
            url,
            content=body,
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "text/html; charset=utf-8",
                # x-upsert: same hash → same content → skip the write.
                "x-upsert": "false",
                "cache-control": "max-age=2592000",
            },
            timeout=30,
        )
        if resp.status_code == 409:
            # Already exists for this hash. That's a successful no-op.
            return (path, digest)
        if resp.status_code >= 400:
            logger.warning(
                "Snapshot upload failed %d for %s: %s",
                resp.status_code, path, resp.text[:200],
            )
            return None
        return (path, digest)
    except httpx.RequestError as e:
        logger.warning("Snapshot upload error for %s: %s", path, e)
        return None


__all__ = ["upload_snapshot", "html_hash", "BUCKET", "MAX_SNAPSHOT_BYTES"]
