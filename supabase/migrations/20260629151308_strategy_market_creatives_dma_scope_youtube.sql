-- ============================================================================
-- Strategy Engine — "Inside their ads" (deck slide 5): DMA-scope the YouTube ads.
-- ----------------------------------------------------------------------------
-- WHAT: strategy_market_creatives previously scoped its two creative sources
--   asymmetrically when a market (DMA) was selected:
--     • paid-search ads   — DMA-scoped (m.dma_code = p_dma_code)   ✓
--     • YouTube video ads — STATEWIDE roster (get_state_firm_roster(p_state)),
--                           ignoring p_dma_code                      ✗
--   So picking "Huntsville" showed paid-search ads from Huntsville but YouTube
--   ads from ANY in-state firm (e.g. Mobile-only or out-of-state firms that run
--   YouTube but don't compete in Huntsville). This made the Ad Intelligence
--   sample inconsistent with the DMA-scoped competitive field (PR #500) and the
--   per-DMA Competitive Analysis on state pages.
--
-- WHY this shape: youtube_ad_creatives has NO metro/DMA dimension (firm-level,
--   national capture), so the ADS themselves can't be DMA-filtered. What we CAN
--   do — and what "scope to the market" means here — is scope the firm ROSTER to
--   the selected DMA. We reuse get_state_firm_roster(p_state) (already strips
--   directories + Maps-only-out-of-state firms) and, when a DMA is selected,
--   keep only roster firms that are also present in that DMA across the three
--   DMA-aware sources: paid search (pi_search_observations⋈pi_metros), organic
--   SERP (serp_results_normalized.dma_code), and Maps local-pack
--   (pi_local_businesses.dma_code). p_dma_code IS NULL → unchanged statewide
--   behavior. Validated on AL/Huntsville (DMA 691): YouTube firm field narrows
--   11 → 7, dropping a TX firm (thomasjhenrylaw.com), two Mobile firms
--   (cunninghambounds.com, longandlong.com), and a Philadelphia WC firm
--   (pondlehocky.com), keeping the Huntsville competitors.
--
-- Signature is UNCHANGED (TEXT, TEXT, INT). DROP+CREATE (matches the existing
-- file's pattern) — no arity change, no overload risk. SECURITY DEFINER, anon-
-- readable, same grants. No CHECK / source_domain / out-of-band-object changes.
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
    WITH dma_firms AS (
        -- Firms present in the SELECTED DMA across the three DMA-aware sources.
        -- Guarded on p_dma_code IS NOT NULL so the CTE is empty when no market
        -- is selected (statewide path below ignores it). Normalized to match
        -- get_state_firm_roster's domain shape.
        SELECT lower(regexp_replace(regexp_replace(o.advertiser_domain, '^https?://', ''), '^www\.', '')) AS domain
        FROM public.pi_search_observations o
        JOIN public.pi_metros m ON m.id = o.metro_id
        WHERE p_dma_code IS NOT NULL
          AND m.dma_code = p_dma_code
          AND o.advertiser_domain IS NOT NULL AND o.advertiser_domain <> ''
        UNION
        SELECT lower(regexp_replace(regexp_replace(n.domain, '^https?://', ''), '^www\.', '')) AS domain
        FROM public.serp_results_normalized n
        WHERE p_dma_code IS NOT NULL
          AND n.result_type = 'organic'
          AND n.dma_code = p_dma_code
          AND n.domain IS NOT NULL AND n.domain <> ''
        UNION
        SELECT lower(b.domain) AS domain
        FROM public.pi_local_businesses b
        WHERE p_dma_code IS NOT NULL
          AND b.dma_code = p_dma_code
          AND b.domain IS NOT NULL AND b.domain <> ''
    ),
    roster AS (
        -- Statewide roster when no DMA is selected; otherwise the roster firms
        -- that also compete in the selected DMA. Reuses get_state_firm_roster's
        -- directory / out-of-state cleaning.
        SELECT r.domain
        FROM public.get_state_firm_roster(p_state) r
        WHERE p_dma_code IS NULL
           OR r.domain IN (SELECT domain FROM dma_firms)
    )

    -- YouTube: real competitors' video ads, with a permanent thumbnail; firm
    -- roster scoped to the selected DMA (statewide when p_dma_code IS NULL).
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
               AND advertiser_domain IN (SELECT domain FROM roster)
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
    'competitor creative — YouTube video ads (with i.ytimg thumbnails) + paid-'
    'search headlines. Both DMA-scoped: paid search by pi_metros.dma_code, '
    'YouTube by intersecting the state firm roster with firms present in the '
    'selected DMA (paid ∪ organic ∪ Maps). p_dma_code IS NULL = statewide. '
    'Trust-first: excludes the noisy keyword Meta crawl.';

GRANT EXECUTE ON FUNCTION public.strategy_market_creatives(TEXT, TEXT, INT)
    TO anon, authenticated, service_role;
