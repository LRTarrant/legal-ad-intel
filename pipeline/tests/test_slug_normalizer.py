"""
Tests for slugified_path_tort_match.

The dedup key on tort_landing_pages is
  (tort_id, registered_domain, slugified_path_tort_match, dma_code)

so this function is load-bearing. Cases below cover the worked examples
in the PR plan plus edge cases (trailing slashes, query params, fragments,
multi-tort URLs, the empty fallback).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.slug_normalizer import slugified_path_tort_match


# Talc synonyms used in most cases below.
TALC_PRIMARY = "talcum-powder"
TALC_ALIASES = ["talc", "baby-powder", "shower-to-shower"]


class TestPlanWorkedExamples:
    """The 3 URLs the user called out plus the 2 plan-table extensions."""

    def test_talcum_powder_lawsuit_with_trailing_slash(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/talcum-powder-lawsuit/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_practice_areas_talc(self):
        result = slugified_path_tort_match(
            "https://www.smithlaw.com/practice-areas/talc/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_talc_claim_form(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/talc-claim-form/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_contact_page_no_match(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/contact?utm=fb",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == ""

    def test_blog_post_collapses_into_primary(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/blog/2026-talc-update/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"


class TestEdgeCases:
    def test_uppercase_url_normalizes(self):
        result = slugified_path_tort_match(
            "HTTPS://SmithLaw.com/Talc/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_fragment_stripped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/talc-lawsuit#contact",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_query_string_stripped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/talc-lawsuit?gclid=xyz&utm_source=fb",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_root_url_empty(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == ""

    def test_empty_url(self):
        result = slugified_path_tort_match(
            "",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == ""

    def test_bare_primary_synonym_segment(self):
        # /talcum-powder/ should canonicalize to primary, not return the
        # segment with no transformation.
        result = slugified_path_tort_match(
            "https://smithlaw.com/talcum-powder/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_short_alias_no_false_match_on_unrelated_word(self):
        # 'talc' is 4 chars (substring-match threshold) but is NOT a substring
        # of 'galactic' (g-a-l-a-c-t-i-c contains no 't-a-l-c'). Verify the
        # algorithm doesn't over-match.
        result = slugified_path_tort_match(
            "https://galactic-defense.com/galactic-defense/",
            primary_synonym=TALC_PRIMARY,
            aliases=["talc"],
        )
        assert result == ""

    def test_short_alias_does_match_legitimate_prefix(self):
        # 'talc' SHOULD match 'talcum-powder' (legitimate prefix).
        result = slugified_path_tort_match(
            "https://smithlaw.com/talcum-info/",
            primary_synonym=TALC_PRIMARY,
            aliases=["talc"],
        )
        assert result == "talcum-powder"


class TestMultiTortUrl:
    """Per the docstring: first-segment-match wins; per-tort dedup."""

    def test_roundup_match_in_combined_url(self):
        # When scoring this URL against roundup, the segment matches.
        result = slugified_path_tort_match(
            "https://smithlaw.com/roundup-and-paraquat/",
            primary_synonym="roundup",
            aliases=["glyphosate", "monsanto"],
        )
        # 'roundup' is in 'roundup-and-paraquat' as a hyphen-bounded match.
        # Tokens: ['roundup', 'and', 'paraquat']. None are modifiers, so the
        # cleaned segment is 'roundup-and-paraquat'. Synonym 'roundup' is in
        # joined → canonicalize to primary.
        assert result == "roundup"

    def test_paraquat_match_in_combined_url(self):
        # Same URL scored against paraquat → matches via paraquat synonym.
        result = slugified_path_tort_match(
            "https://smithlaw.com/roundup-and-paraquat/",
            primary_synonym="paraquat",
            aliases=["parkinsons"],
        )
        assert result == "paraquat"


class TestBoilerplateStripping:
    def test_practice_areas_dropped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/practice-areas/talc-lawsuit/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_blog_dropped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/blog/talc/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_attorneys_dropped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/attorneys/talc/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"


class TestSettlementsAndUpdates:
    def test_settlement_modifier_stripped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/talc-settlement/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_mdl_modifier_stripped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/talc-mdl/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"

    def test_attorney_modifier_stripped(self):
        result = slugified_path_tort_match(
            "https://smithlaw.com/talcum-powder-attorney/",
            primary_synonym=TALC_PRIMARY,
            aliases=TALC_ALIASES,
        )
        assert result == "talcum-powder"
