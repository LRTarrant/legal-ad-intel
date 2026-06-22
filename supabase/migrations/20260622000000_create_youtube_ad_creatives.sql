-- ============================================================================
-- Competitive Analysis Phase 4a: youtube_ad_creatives
-- PI-firm YouTube/video ad creatives from the Google Ads Transparency Center,
-- ingested by pipelines/youtube_ads_daily.py. Firm-level, national (no DMA).
--
-- Dedicated table, matching the per-channel pattern (pi_search_observations,
-- serp_results_normalized). NOT ad_observations_raw: its (source,source_id)
-- unique index is partial (WHERE source_id IS NOT NULL) and cannot be used as
-- an on_conflict target for upserts. creative_id is the natural key and gets a
-- real (non-partial) UNIQUE constraint so the daily run can merge-duplicates.
-- ============================================================================

CREATE TABLE public.youtube_ad_creatives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id text NOT NULL,
    advertiser_domain text NOT NULL,
    advertiser_name text,
    advertiser_ar_id text,
    advertiser_id uuid REFERENCES public.advertiser_entities(id),
    target_domain text,
    ad_format text NOT NULL DEFAULT 'video',
    first_shown date,
    last_shown date,
    total_days_shown integer,
    details_link text,
    region text NOT NULL DEFAULT 'US',
    raw_json jsonb,
    first_ingested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT youtube_ad_creatives_creative_id_key UNIQUE (creative_id)
);

CREATE INDEX idx_youtube_ad_creatives_domain
    ON public.youtube_ad_creatives(advertiser_domain);
CREATE INDEX idx_youtube_ad_creatives_last_shown
    ON public.youtube_ad_creatives(last_shown DESC);

ALTER TABLE public.youtube_ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY youtube_ad_creatives_service_role ON public.youtube_ad_creatives
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY youtube_ad_creatives_anon_read ON public.youtube_ad_creatives
    FOR SELECT USING (true);

CREATE TRIGGER trg_youtube_ad_creatives_updated_at
    BEFORE UPDATE ON public.youtube_ad_creatives
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
