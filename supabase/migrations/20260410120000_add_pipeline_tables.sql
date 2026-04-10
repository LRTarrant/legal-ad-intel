-- ============================================================
-- Pipeline automation tables
-- Applied to production 2026-04-10 via Supabase MCP
-- ============================================================

-- pipeline_configs: defines each pipeline and its expected behavior
CREATE TABLE public.pipeline_configs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name       text UNIQUE NOT NULL,
    source_domain       text NOT NULL
                        CHECK (source_domain IN (
                            'ad_intelligence', 'ad_events_legacy', 'litigation_mdl',
                            'mva_fars', 'boating', 'weather_storms', 'reference_geo'
                        )),
    description         text,
    expected_cron       text,
    max_runtime_minutes integer NOT NULL DEFAULT 60
                        CHECK (max_runtime_minutes > 0 AND max_runtime_minutes <= 1440),
    retry_limit         smallint NOT NULL DEFAULT 3
                        CHECK (retry_limit >= 0 AND retry_limit <= 10),
    alert_on_failure    boolean NOT NULL DEFAULT true,
    alert_channel       text NOT NULL DEFAULT 'email'
                        CHECK (alert_channel IN ('email', 'slack', 'both')),
    owner               text,
    enabled             boolean NOT NULL DEFAULT true,
    step_definitions    jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pipeline_configs IS 'Registry of all pipelines with scheduling, alerting, and step definitions';
COMMENT ON COLUMN public.pipeline_configs.step_definitions IS 'JSON array of {step_name, step_order, description} objects defining the steps in this pipeline';

-- pipeline_runs: one row per pipeline execution
CREATE TABLE public.pipeline_runs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name   text NOT NULL REFERENCES public.pipeline_configs(pipeline_name),
    source_domain   text NOT NULL,
    trigger_type    text NOT NULL DEFAULT 'scheduled'
                    CHECK (trigger_type IN ('scheduled', 'manual', 'webhook', 'retry')),
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'success', 'partial_success', 'failed', 'cancelled')),
    started_at      timestamptz,
    finished_at     timestamptz,
    duration_ms     integer GENERATED ALWAYS AS (
                        CASE WHEN finished_at IS NOT NULL AND started_at IS NOT NULL
                             THEN EXTRACT(EPOCH FROM (finished_at - started_at))::integer * 1000
                             ELSE NULL
                        END
                    ) STORED,
    rows_ingested   integer NOT NULL DEFAULT 0 CHECK (rows_ingested >= 0),
    rows_normalized integer NOT NULL DEFAULT 0 CHECK (rows_normalized >= 0),
    rows_scored     integer NOT NULL DEFAULT 0 CHECK (rows_scored >= 0),
    rows_rejected   integer NOT NULL DEFAULT 0 CHECK (rows_rejected >= 0),
    error_summary   text,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    retry_of        uuid REFERENCES public.pipeline_runs(id),
    attempt_number  smallint NOT NULL DEFAULT 1 CHECK (attempt_number >= 1),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT finished_after_started CHECK (
        finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at
    ),
    CONSTRAINT failed_has_error CHECK (
        status != 'failed' OR error_summary IS NOT NULL
    )
);

CREATE INDEX idx_pipeline_runs_domain_status ON public.pipeline_runs(source_domain, status);
CREATE INDEX idx_pipeline_runs_started_at ON public.pipeline_runs(started_at DESC);
CREATE INDEX idx_pipeline_runs_pipeline_name ON public.pipeline_runs(pipeline_name, started_at DESC);
CREATE INDEX idx_pipeline_runs_status_running ON public.pipeline_runs(status) WHERE status = 'running';

-- pipeline_run_steps: granular step tracking within a run
CREATE TABLE public.pipeline_run_steps (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          uuid NOT NULL REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
    step_name       text NOT NULL,
    step_order      smallint NOT NULL CHECK (step_order >= 1),
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'success', 'skipped', 'failed')),
    started_at      timestamptz,
    finished_at     timestamptz,
    duration_ms     integer GENERATED ALWAYS AS (
                        CASE WHEN finished_at IS NOT NULL AND started_at IS NOT NULL
                             THEN EXTRACT(EPOCH FROM (finished_at - started_at))::integer * 1000
                             ELSE NULL
                        END
                    ) STORED,
    rows_in         integer NOT NULL DEFAULT 0 CHECK (rows_in >= 0),
    rows_out        integer NOT NULL DEFAULT 0 CHECK (rows_out >= 0),
    rows_rejected   integer NOT NULL DEFAULT 0 CHECK (rows_rejected >= 0),
    error_message   text,
    error_details   jsonb,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT step_finished_after_started CHECK (
        finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at
    ),
    CONSTRAINT step_failed_has_error CHECK (
        status != 'failed' OR error_message IS NOT NULL
    ),
    CONSTRAINT unique_step_per_run UNIQUE (run_id, step_order)
);

CREATE INDEX idx_steps_run_id ON public.pipeline_run_steps(run_id, step_order);
CREATE INDEX idx_steps_status_failed ON public.pipeline_run_steps(status) WHERE status IN ('running', 'failed');

-- auto-update updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pipeline_configs_updated_at
    BEFORE UPDATE ON public.pipeline_configs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pipeline_runs_updated_at
    BEFORE UPDATE ON public.pipeline_runs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_pipeline_run_steps_updated_at
    BEFORE UPDATE ON public.pipeline_run_steps
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: enable but grant full access to service_role
ALTER TABLE public.pipeline_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_configs_service_role ON public.pipeline_configs
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY pipeline_runs_service_role ON public.pipeline_runs
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY pipeline_run_steps_service_role ON public.pipeline_run_steps
    FOR ALL USING (auth.role() = 'service_role');

-- Seed pipeline configs
INSERT INTO public.pipeline_configs (pipeline_name, source_domain, description, expected_cron, max_runtime_minutes, retry_limit, owner, enabled, step_definitions)
VALUES
  ('ad_intel_daily', 'ad_intelligence', 'Daily ad observation fetch, normalize, score, and publish', '0 10 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_raw","step_order":1,"description":"Fetch ad observations from source APIs into ad_observations_raw"},{"step_name":"validate_raw","step_order":2,"description":"Validate FK integrity and row-count sanity on raw data"},{"step_name":"normalize","step_order":3,"description":"Aggregate raw observations into weekly ad_observations_normalized"},{"step_name":"score","step_order":4,"description":"Recompute ad_saturation_scores from normalized data"},{"step_name":"publish","step_order":5,"description":"Refresh ad_saturation_summary view and mark run complete"}]'::jsonb),
  ('jpml_monthly', 'litigation_mdl', 'Monthly JPML PDF ingest and MDL stats refresh', '0 13 1 * *', 30, 2, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_pdf","step_order":1,"description":"Download and parse JPML PDF into jpml_snapshots"},{"step_name":"update_mdl_stats","step_order":2,"description":"Compute mdl_stats_monthly from snapshots"},{"step_name":"publish","step_order":3,"description":"Update mdl status fields and mark complete"}]'::jsonb),
  ('fars_incremental', 'mva_fars', 'Monthly check for new FARS data from NHTSA', '0 7 15 * *', 90, 2, 'lancetarrant@gmail.com', true,
   '[{"step_name":"check_new_data","step_order":1,"description":"Check NHTSA for new FARS year data"},{"step_name":"download_and_load","step_order":2,"description":"Download ZIP, extract CSVs, upsert to fars_fatalities"},{"step_name":"publish","step_order":3,"description":"Verify row counts and mark complete"}]'::jsonb),
  ('storms_quarterly', 'weather_storms', 'Quarterly NOAA Storm Events bulk CSV ingest', '0 8 1 1,4,7,10 *', 120, 2, 'lancetarrant@gmail.com', true,
   '[{"step_name":"download_csvs","step_order":1,"description":"Download NOAA Storm Events CSV files"},{"step_name":"load_and_dedupe","step_order":2,"description":"Parse, clean, deduplicate, and upsert to storm_events"},{"step_name":"publish","step_order":3,"description":"Verify counts and mark complete"}]'::jsonb),
  ('docket_daily', 'litigation_mdl', 'Daily CourtListener poll for watched MDL docket events', '0 11 * * *', 30, 3, 'lancetarrant@gmail.com', false,
   '[{"step_name":"poll_courtlistener","step_order":1,"description":"Poll CourtListener API for new docket entries"},{"step_name":"normalize_events","step_order":2,"description":"Validate and insert new docket_events"},{"step_name":"publish","step_order":3,"description":"Update docket status and mark complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
