import json

from pipelines.meta_creative_capture import best_image_url, _parse_snapshot
from lib.ad_creative_upload import ext_for_content_type, public_url


def test_parse_snapshot_handles_string_dict_and_garbage():
    # meta_ads_daily stores snapshot via json.dumps() -> reads back as a string
    s = json.dumps({"body": {"text": "hi"}})
    assert _parse_snapshot(s) == {"body": {"text": "hi"}}
    assert _parse_snapshot({"already": "object"}) == {"already": "object"}
    assert _parse_snapshot(None) is None
    assert _parse_snapshot("") is None
    assert _parse_snapshot("not json") is None
    assert _parse_snapshot(json.dumps([1, 2, 3])) is None  # non-dict JSON


def test_best_image_url_prefers_video_poster():
    snap = {
        "videos": [{"video_preview_image_url": "https://cdn/poster.jpg"}],
        "images": [{"original_image_url": "https://cdn/img.jpg"}],
    }
    assert best_image_url(snap) == "https://cdn/poster.jpg"


def test_best_image_url_falls_back_to_image_then_card():
    assert best_image_url(
        {"images": [{"resized_image_url": "https://cdn/img.png"}]}
    ) == "https://cdn/img.png"
    assert best_image_url(
        {"cards": [{"original_image_url": "https://cdn/card.jpg"}]}
    ) == "https://cdn/card.jpg"


def test_best_image_url_none_when_no_media():
    assert best_image_url({"body": {"text": "x"}}) is None
    assert best_image_url({"videos": [], "images": [], "cards": []}) is None


def test_ext_for_content_type():
    assert ext_for_content_type("image/jpeg") == "jpg"
    assert ext_for_content_type("image/png") == "png"
    assert ext_for_content_type("image/webp; charset=binary") == "webp"
    assert ext_for_content_type(None) == "jpg"
    assert ext_for_content_type("text/html") == "jpg"  # non-image -> safe default


def test_public_url_shape(monkeypatch):
    import lib.ad_creative_upload as up
    monkeypatch.setattr(up, "SUPABASE_URL", "https://proj.supabase.co")
    assert up.public_url("meta/abc.jpg") == (
        "https://proj.supabase.co/storage/v1/object/public/ad-creatives/meta/abc.jpg"
    )
