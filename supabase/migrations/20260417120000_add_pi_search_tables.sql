-- ============================================================
-- PI Search Advertising Intelligence tables + RPC functions
-- Applied to production 2026-04-17 via Supabase MCP
-- ============================================================

-- 1. Core tables
-- ------------------------------------------------------------

-- pi_metros: tracked metro areas for geo-targeted searches
CREATE TABLE public.pi_metros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_abbr TEXT NOT NULL,
    metro_name TEXT NOT NULL,
    metro_label TEXT NOT NULL,
    population INTEGER,
    searchapi_location TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(state_abbr, metro_name)
);

-- pi_keyword_clusters: PI case type keyword groups
CREATE TABLE public.pi_keyword_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_type TEXT NOT NULL UNIQUE,
    case_label TEXT NOT NULL,
    keywords JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- pi_search_observations: raw ad observations per search
CREATE TABLE public.pi_search_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metro_id UUID NOT NULL REFERENCES public.pi_metros(id),
    case_type TEXT NOT NULL,
    keyword_used TEXT NOT NULL,
    advertiser_domain TEXT NOT NULL,
    advertiser_name TEXT,
    ad_position INTEGER,
    ad_title TEXT,
    ad_description TEXT,
    ad_link TEXT,
    observed_at TIMESTAMPTZ DEFAULT now(),
    observed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source TEXT DEFAULT 'searchapi_google',
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index uses observed_date column (expression indexes require IMMUTABLE)
CREATE UNIQUE INDEX idx_pi_search_obs_unique
    ON public.pi_search_observations(metro_id, case_type, keyword_used, advertiser_domain, observed_date);

CREATE INDEX idx_pi_search_obs_metro ON public.pi_search_observations(metro_id);
CREATE INDEX idx_pi_search_obs_case ON public.pi_search_observations(case_type);

-- pi_competitor_profiles: aggregated competitor intelligence
CREATE TABLE public.pi_competitor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_abbr TEXT NOT NULL,
    advertiser_domain TEXT NOT NULL,
    advertiser_name TEXT,
    website TEXT,
    metros_active TEXT[],
    case_types_active TEXT[],
    total_observations INTEGER DEFAULT 0,
    avg_ad_position NUMERIC(4,1),
    first_seen DATE,
    last_seen DATE,
    presence_score NUMERIC(5,1),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(state_abbr, advertiser_domain)
);

CREATE INDEX idx_pi_competitor_state ON public.pi_competitor_profiles(state_abbr);

-- 2. Row Level Security
-- ------------------------------------------------------------

ALTER TABLE public.pi_metros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_search_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_competitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read" ON public.pi_metros FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON public.pi_keyword_clusters FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON public.pi_search_observations FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON public.pi_competitor_profiles FOR SELECT USING (true);

-- Service role full access for pipeline writes
CREATE POLICY "Service role full access" ON public.pi_metros
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.pi_keyword_clusters
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.pi_search_observations
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.pi_competitor_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- 3. Seed data
-- ------------------------------------------------------------

INSERT INTO public.pi_metros (state_abbr, metro_name, metro_label, searchapi_location) VALUES
('AL', 'Birmingham', 'Birmingham, AL', 'Birmingham, Alabama, United States'),
('AL', 'Montgomery', 'Montgomery, AL', 'Montgomery, Alabama, United States'),
('AL', 'Huntsville', 'Huntsville, AL', 'Huntsville, Alabama, United States'),
('AL', 'Mobile', 'Mobile, AL', 'Mobile, Alabama, United States'),
('FL', 'Miami', 'Miami, FL', 'Miami, Florida, United States'),
('FL', 'Tampa', 'Tampa, FL', 'Tampa, Florida, United States'),
('FL', 'Jacksonville', 'Jacksonville, FL', 'Jacksonville, Florida, United States'),
('FL', 'Orlando', 'Orlando, FL', 'Orlando, Florida, United States'),
('CA', 'Los Angeles', 'Los Angeles, CA', 'Los Angeles, California, United States'),
('CA', 'San Francisco', 'San Francisco, CA', 'San Francisco, California, United States'),
('CA', 'San Diego', 'San Diego, CA', 'San Diego, California, United States'),
('CA', 'Sacramento', 'Sacramento, CA', 'Sacramento, California, United States');

INSERT INTO public.pi_keyword_clusters (case_type, case_label, keywords) VALUES
('general_pi', 'General Personal Injury', '["personal injury lawyer {metro}", "personal injury attorney {metro}", "injury lawyer near me {metro}"]'),
('motor_vehicle', 'Motor Vehicle Accidents', '["car accident lawyer {metro}", "auto accident attorney {metro}", "car wreck lawyer {metro}"]'),
('truck', 'Truck Accidents', '["truck accident lawyer {metro}", "18 wheeler accident attorney {metro}", "semi truck crash lawyer {metro}"]'),
('motorcycle', 'Motorcycle Accidents', '["motorcycle accident lawyer {metro}", "motorcycle crash attorney {metro}"]'),
('construction', 'Construction Accidents', '["construction accident lawyer {metro}", "construction injury attorney {metro}", "workplace injury lawyer {metro}"]'),
('slip_and_fall', 'Slip & Fall / Premises', '["slip and fall lawyer {metro}", "premises liability attorney {metro}"]');

-- 4. Extend pipeline_configs CHECK constraint for new source_domain
-- ------------------------------------------------------------

ALTER TABLE public.pipeline_configs
    DROP CONSTRAINT IF EXISTS pipeline_configs_source_domain_check;

ALTER TABLE public.pipeline_configs
    ADD CONSTRAINT pipeline_configs_source_domain_check
    CHECK (source_domain IN (
        'ad_intelligence', 'ad_events_legacy', 'litigation_mdl',
        'mva_fars', 'boating', 'weather_storms', 'reference_geo',
        'serp_intelligence', 'pi_advertising'
    ));

-- 5. Pipeline config row
-- ------------------------------------------------------------

INSERT INTO public.pipeline_configs (pipeline_name, source_domain, description, expected_cron, max_runtime_minutes, retry_limit, alert_on_failure, alert_channel, owner, enabled, step_definitions)
VALUES (
    'pi_search_daily',
    'pi_advertising',
    'Daily PI search ad intelligence — geo-targeted Google ad observations by metro and case type',
    '0 12 * * *',
    30,
    3,
    true,
    'email',
    'lancetarrant@gmail.com',
    true,
    '[{"step_name": "fetch_raw", "step_order": 1, "description": "Geo-targeted Google searches for PI keywords, extract ads"}, {"step_name": "build_profiles", "step_order": 2, "description": "Aggregate observations into competitor profiles by state"}, {"step_name": "publish", "step_order": 3, "description": "Verify counts and mark complete"}]'::jsonb
)
ON CONFLICT (pipeline_name) DO NOTHING;

-- 6. RPC Functions
-- ------------------------------------------------------------

-- get_pi_advertising_summary: overview stats for a state
CREATE OR REPLACE FUNCTION public.get_pi_advertising_summary(p_state TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_competitors', (
            SELECT COUNT(DISTINCT advertiser_domain)
            FROM pi_competitor_profiles
            WHERE state_abbr = p_state
        ),
        'total_observations', (
            SELECT COALESCE(SUM(total_observations), 0)
            FROM pi_competitor_profiles
            WHERE state_abbr = p_state
        ),
        'top_competitor', (
            SELECT json_build_object('name', advertiser_name, 'domain', advertiser_domain, 'presence_score', presence_score)
            FROM pi_competitor_profiles
            WHERE state_abbr = p_state
            ORDER BY presence_score DESC NULLS LAST
            LIMIT 1
        ),
        'most_contested_case_type', (
            SELECT o.case_type
            FROM pi_search_observations o
            JOIN pi_metros m ON m.id = o.metro_id
            WHERE m.state_abbr = p_state
            GROUP BY o.case_type
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),
        'least_contested_case_type', (
            SELECT o.case_type
            FROM pi_search_observations o
            JOIN pi_metros m ON m.id = o.metro_id
            WHERE m.state_abbr = p_state
            GROUP BY o.case_type
            ORDER BY COUNT(*) ASC
            LIMIT 1
        ),
        'metro_count', (
            SELECT COUNT(*)
            FROM pi_metros
            WHERE state_abbr = p_state
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- get_pi_competitors: top competitors for a state
CREATE OR REPLACE FUNCTION public.get_pi_competitors(p_state TEXT)
RETURNS SETOF pi_competitor_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM pi_competitor_profiles
    WHERE state_abbr = p_state
    ORDER BY presence_score DESC NULLS LAST
    LIMIT 20;
$$;

-- get_pi_metro_saturation: per-metro saturation for a state
CREATE OR REPLACE FUNCTION public.get_pi_metro_saturation(p_state TEXT)
RETURNS TABLE (
    metro_name TEXT,
    metro_label TEXT,
    competitor_count BIGINT,
    total_observations BIGINT,
    top_competitor TEXT,
    saturation_level TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        m.metro_name,
        m.metro_label,
        COUNT(DISTINCT o.advertiser_domain) AS competitor_count,
        COUNT(*) AS total_observations,
        (
            SELECT o2.advertiser_domain
            FROM pi_search_observations o2
            WHERE o2.metro_id = m.id
            GROUP BY o2.advertiser_domain
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) AS top_competitor,
        CASE
            WHEN COUNT(DISTINCT o.advertiser_domain) >= 8 THEN 'High'
            WHEN COUNT(DISTINCT o.advertiser_domain) >= 4 THEN 'Medium'
            ELSE 'Low'
        END AS saturation_level
    FROM pi_metros m
    LEFT JOIN pi_search_observations o ON o.metro_id = m.id
    WHERE m.state_abbr = p_state
    GROUP BY m.id, m.metro_name, m.metro_label
    ORDER BY total_observations DESC;
$$;

-- get_pi_case_type_competition: per-case-type competition for a state
CREATE OR REPLACE FUNCTION public.get_pi_case_type_competition(p_state TEXT)
RETURNS TABLE (
    case_type TEXT,
    case_label TEXT,
    competitor_count BIGINT,
    avg_position NUMERIC,
    total_observations BIGINT,
    saturation_level TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        o.case_type,
        kc.case_label,
        COUNT(DISTINCT o.advertiser_domain) AS competitor_count,
        ROUND(AVG(o.ad_position), 1) AS avg_position,
        COUNT(*) AS total_observations,
        CASE
            WHEN COUNT(DISTINCT o.advertiser_domain) >= 8 THEN 'High'
            WHEN COUNT(DISTINCT o.advertiser_domain) >= 4 THEN 'Medium'
            ELSE 'Low'
        END AS saturation_level
    FROM pi_search_observations o
    JOIN pi_metros m ON m.id = o.metro_id
    LEFT JOIN pi_keyword_clusters kc ON kc.case_type = o.case_type
    WHERE m.state_abbr = p_state
    GROUP BY o.case_type, kc.case_label
    ORDER BY total_observations DESC;
$$;
