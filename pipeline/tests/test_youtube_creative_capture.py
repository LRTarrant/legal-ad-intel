import json

from pipelines.youtube_creative_capture import extract_video_id, _details_script_link


def test_extract_video_id_from_ytimg_thumbnail():
    # Real shape observed in the details-script body.
    body = "...ytimg.com/vi/Ph2IjJA3jH0/hqdefault.jpg', 480, 360);..."
    assert extract_video_id(body) == "Ph2IjJA3jH0"


def test_extract_video_id_from_watch_and_embed_and_short():
    assert extract_video_id("see https://www.youtube.com/watch?v=dQw4w9WgXcQ end") == "dQw4w9WgXcQ"
    assert extract_video_id("<iframe src='https://www.youtube.com/embed/abc123XYZ_-'>") == "abc123XYZ_-"
    assert extract_video_id("https://youtu.be/A1b2C3d4E5F here") == "A1b2C3d4E5F"


def test_extract_video_id_none_when_absent():
    assert extract_video_id("") is None
    assert extract_video_id("no video here, just text and a .jpg") is None
    # 11-char id is required; a short fragment must not match
    assert extract_video_id("ytimg.com/vi/short/x.jpg") is None


def test_details_script_link_handles_string_dict_and_missing():
    s = json.dumps({"details_script_link": "https://x/content.js", "format": "video"})
    assert _details_script_link(s) == "https://x/content.js"
    assert _details_script_link({"details_script_link": "https://y/c.js"}) == "https://y/c.js"
    assert _details_script_link(json.dumps({"format": "video"})) is None
    assert _details_script_link(None) is None
    assert _details_script_link("not json") is None
