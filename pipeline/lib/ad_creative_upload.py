"""
ad_creative_upload — upload captured ad-creative image bytes to Supabase Storage.

Mirrors lib/tort_landing_snapshot.py: a raw httpx POST to the Storage REST API
with the service-role key (which bypasses RLS). The bucket is public, so the
returned public URL renders directly in the in-app creative modal.

Path convention: ad-creatives/<channel>/<id>.<ext>  (e.g. meta/<ad_archive_id>.jpg)
"""
from __future__ import annotations

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

BUCKET = "ad-creatives"

_EXT_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}


def ext_for_content_type(content_type: str | None) -> str:
    """Map a response content-type to a file extension (default jpg)."""
    if not content_type:
        return "jpg"
    return _EXT_BY_CONTENT_TYPE.get(content_type.split(";")[0].strip().lower(), "jpg")


def public_url(path: str) -> str:
    """Public URL for an object already in the bucket."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"


def upload_creative_image(
    path: str,
    image_bytes: bytes,
    content_type: str = "image/jpeg",
) -> Optional[str]:
    """Upload image bytes to the ad-creatives bucket; return the public URL.

    `path` is the bucket-relative key (e.g. "meta/<ad_archive_id>.jpg").
    Returns None on failure. A 409 (object already exists) is treated as a
    successful no-op and the existing public URL is returned. Live dry-run
    flag is read from the environment (the module-level DRY_RUN binds at import
    and goes stale when a pipeline's --dry-run flips it after import).
    """
    if not image_bytes:
        return None

    dry = os.environ.get("DRY_RUN", "").strip().lower() in ("true", "1", "yes")
    if dry:
        logger.info("  [DRY RUN] Would upload creative to %s/%s (%d bytes)",
                    BUCKET, path, len(image_bytes))
        return public_url(path)

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase env missing; cannot upload creative")
        return None

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
    try:
        resp = httpx.post(
            url,
            content=image_bytes,
            headers={
                # Both headers are required: the project uses the new
                # sb_secret_* key format (not a JWT), so Storage rejects a
                # bare `Authorization: Bearer` with "Invalid Compact JWS".
                # The apikey header is what authenticates the non-JWT key.
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": content_type,
                # Refresh the stored copy if we re-capture the same id.
                "x-upsert": "true",
                "cache-control": "max-age=2592000",
            },
            timeout=30,
        )
        if resp.status_code == 409:
            return public_url(path)
        if resp.status_code >= 400:
            logger.warning("Creative upload failed %d for %s: %s",
                           resp.status_code, path, resp.text[:200])
            return None
        return public_url(path)
    except httpx.RequestError as e:
        logger.warning("Creative upload error for %s: %s", path, e)
        return None


def download_image(src_url: str, timeout: int = 30) -> Optional[tuple[bytes, str]]:
    """Fetch an image URL; return (bytes, content_type) or None.

    Rejects non-image / empty responses so we never store an HTML error page
    or an expired-URL redirect body as a creative.
    """
    if not src_url:
        return None
    try:
        resp = httpx.get(src_url, timeout=timeout, follow_redirects=True)
    except httpx.RequestError as e:
        logger.warning("Image download error for %s: %s", src_url[:120], e)
        return None
    if resp.status_code >= 400:
        logger.warning("Image download %d for %s", resp.status_code, src_url[:120])
        return None
    content_type = (resp.headers.get("content-type") or "").lower()
    if "image/" not in content_type:
        logger.warning("Skipping non-image response (%s) for %s",
                       content_type or "no content-type", src_url[:120])
        return None
    if not resp.content:
        return None
    return resp.content, content_type


__all__ = [
    "upload_creative_image",
    "download_image",
    "ext_for_content_type",
    "public_url",
    "BUCKET",
]
