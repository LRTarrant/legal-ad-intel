-- ============================================================================
-- Strategy Engine — "Inside their ads" (deck slide 5): real competitor creative.
-- ----------------------------------------------------------------------------
-- Returns a small, trustworthy sample of REAL ad creative from the market's
-- actual competitors, reusing the existing in-app creative capture:
--   • YouTube video ads — roster-scoped (advertiser_domain ∈ the state's firm
--     roster, so only real in-state PI firms), with a durable i.ytimg.com
--     thumbnail (the same capture the "View ads" modal uses).
--   • Paid-search text ads — market-scoped via pi_metros, the real ad headline.
--
-- Deliberately NOT sourced from the keyword-broad Meta crawl: that surface
-- carries non-PI noise (short-drama apps, lead-gen) that would undermine the
-- trust the deck is built on. Roster-scoped YouTube + market-scoped paid search
-- are both grounded in the firms we already rank in the competitive field.
-- ============================================================================

DROP FUNCTION IF EXISTS public.strategy_market_creatives(TEXT, TEXT, INT);

CREATE FUNCTION public.strategy_market_creatives(
    p_state TEXT,
    p_dma_code TEXT DEFAULT NULL,
    p_limit_per INT DEFAULT 3
)
RETURNS TABLE (
    channel TEXT,
    format_label TEXT,
    advertiser TEXT,
    advertiser_domain TEXT,
    headline TEXT,
    body TEXT,
    image_url TEXT,
    link TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    -- YouTube: real in-state firms' video ads, with a permanent thumbnail.
    ( SELECT
        'youtube'::text AS channel,
        'Video ad'::text AS format_label,
        y.advertiser_name AS advertiser,
        y.advertiser_domain,
        NULL::text AS headline,
        NULL::text AS body,
        'https://i.ytimg.com/vi/' || y.video_id || '/hqdefault.jpg' AS image_url,
        CASE WHEN y.advertiser_ar_id IS NOT NULL
             THEN 'https://adstransparency.google.com/advertiser/' || y.advertiser_ar_id
             ELSE NULL END AS link
      FROM ( SELECT DISTINCT ON (advertiser_domain)
                    advertiser_name, advertiser_domain, advertiser_ar_id, video_id, total_days_shown
             FROM public.youtube_ad_creatives
             WHERE video_id IS NOT NULL
               AND advertiser_domain IN (SELECT domain FROM public.get_state_firm_roster(p_state))
             ORDER BY advertiser_domain, total_days_shown DESC NULLS LAST ) y
      LIMIT p_limit_per )

    UNION ALL

    -- Paid search: the market's competitors, the real ad headline.
    ( SELECT
        'paid_search'::text AS channel,
        'Search ad'::text AS format_label,
        p.advertiser_name AS advertiser,
        p.advertiser_domain,
        p.ad_title AS headline,
        NULLIF(p.ad_description, '') AS body,
        NULL::text AS image_url,
        p.ad_link AS link
      FROM ( SELECT DISTINCT ON (o.advertiser_domain)
                    o.advertiser_name, o.advertiser_domain, o.ad_title, o.ad_description, o.ad_link, o.observed_date
             FROM public.pi_search_observations o
             JOIN public.pi_metros m ON m.id = o.metro_id
             WHERE m.state_abbr = p_state
               AND (p_dma_code IS NULL OR m.dma_code = p_dma_code)
               AND o.ad_title IS NOT NULL
               AND o.advertiser_domain NOT IN (
                   'google.com','youtube.com','facebook.com','instagram.com',
                   'maps.google.com','g.co','bing.com'
               )
             ORDER BY o.advertiser_domain, o.observed_date DESC ) p
      LIMIT p_limit_per );
$$;

COMMENT ON FUNCTION public.strategy_market_creatives(TEXT, TEXT, INT) IS
    'Strategy Engine "Inside their ads" (deck slide 5): a small sample of real '
    'competitor creative — roster-scoped YouTube video ads (with i.ytimg '
    'thumbnails) + market-scoped paid-search headlines. Trust-first: excludes '
    'the noisy keyword Meta crawl.';

GRANT EXECUTE ON FUNCTION public.strategy_market_creatives(TEXT, TEXT, INT)
    TO anon, authenticated, service_role;
