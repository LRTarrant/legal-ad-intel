-- ============================================================================
-- Competitive Analysis Phase 5a: meta_ad_creatives
-- PI-firm Meta (Facebook/Instagram) ads from the Meta Ad Library, ingested by
-- pipelines/meta_ads_daily.py. Case-type-keyed, national (no DMA). Dedicated
-- table (per-channel pattern, like serp/youtube); NOT ad_observations_raw
-- (its legacy meta data is NY-skewed + the unique index is partial).
-- ============================================================================

CREATE TABLE public.meta_ad_creatives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_archive_id text NOT NULL,
    page_id text,
    page_name text,
    case_type text NOT NULL,
    keyword text,
    start_date date,
    end_date date,
    is_active boolean,
    publisher_platforms text[],
    collation_count integer,
    country text NOT NULL DEFAULT 'US',
    snapshot jsonb,
    raw_json jsonb,
    first_ingested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT meta_ad_creatives_ad_archive_id_key UNIQUE (ad_archive_id)
);

CREATE INDEX idx_meta_ad_creatives_case_type ON public.meta_ad_creatives(case_type);
CREATE INDEX idx_meta_ad_creatives_page_id ON public.meta_ad_creatives(page_id);

ALTER TABLE public.meta_ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY meta_ad_creatives_service_role ON public.meta_ad_creatives
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY meta_ad_creatives_anon_read ON public.meta_ad_creatives
    FOR SELECT USING (true);

CREATE TRIGGER trg_meta_ad_creatives_updated_at
    BEFORE UPDATE ON public.meta_ad_creatives
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
