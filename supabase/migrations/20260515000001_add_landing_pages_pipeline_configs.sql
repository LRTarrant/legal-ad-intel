-- Register the Landing Pages pipelines (tort_landing_pages_daily +
-- tort_landing_pages_weekly) in public.pipeline_configs so PipelineRun
-- can bootstrap source_domain + step definitions.
--
-- Without these rows, both pipelines crash at startup with
-- `ValueError: No pipeline_config found for '...'` before any
-- pipeline_runs row is ever written. PR #373 shipped the pipelines but
-- never registered them.
--
-- Adds 'landing_pages' to the source_domain CHECK constraint (same
-- pattern as recall_watchlist in 20260422150000 and faers in
-- 20260514100000).

alter table public.pipeline_configs
  drop constraint if exists pipeline_configs_source_domain_check;

alter table public.pipeline_configs
  add constraint pipeline_configs_source_domain_check
  check (source_domain = any (array[
    'ad_intelligence',
    'ad_events_legacy',
    'litigation_mdl',
    'mva_fars',
    'boating',
    'weather_storms',
    'reference_geo',
    'serp_intelligence',
    'pi_advertising',
    'recall_watchlist',
    'faers',
    'landing_pages'
  ]));

insert into public.pipeline_configs
  (pipeline_name, source_domain, description, expected_cron, max_runtime_minutes, step_definitions)
values
  (
    'tort_landing_pages_daily',
    'landing_pages',
    'Detect new law-firm landing pages from yesterday''s serp_results_raw (no Searchapi spend)',
    '30 13 * * *',
    60,
    jsonb '[
      {"step_name":"load_context","step_order":1,"description":"Load active landing-page torts, synonyms, allow-list, and manufacturer domains"},
      {"step_name":"consume_serp_results_raw","step_order":2,"description":"Read yesterday''s serp_results_raw for active torts; group + dedupe per (tort, registered_domain, slug-match)"},
      {"step_name":"classify_domains","step_order":3,"description":"Reuse cached domain_classifications; run the classifier waterfall on unseen domains"},
      {"step_name":"upsert_landing_pages","step_order":4,"description":"Upsert tort_landing_pages on (tort_id, registered_domain, slugified_path_tort_match)"},
      {"step_name":"snapshot_html","step_order":5,"description":"Fetch + snapshot HTML for confirmed/candidate rows lacking a snapshot"},
      {"step_name":"refresh_velocity_matview","step_order":6,"description":"REFRESH MATERIALIZED VIEW CONCURRENTLY tort_landing_page_velocity via RPC"}
    ]'
  ),
  (
    'tort_landing_pages_weekly',
    'landing_pages',
    'Weekly DMA scan via Searchapi.io to detect geo-targeted landing pages per tort',
    '0 3 * * 0',
    90,
    jsonb '[
      {"step_name":"budget_check","step_order":1,"description":"Verify weekly Searchapi.io budget has headroom before dispatching DMA scan"},
      {"step_name":"fetch_serp","step_order":2,"description":"Query Searchapi.io across top DMAs for each active landing-page tort"},
      {"step_name":"classify_domains","step_order":3,"description":"Reuse cached domain_classifications; run the classifier waterfall on unseen domains"},
      {"step_name":"upsert_landing_pages","step_order":4,"description":"Upsert tort_landing_pages with DMA code on (tort_id, registered_domain, slugified_path_tort_match, dma_code)"},
      {"step_name":"snapshot_html","step_order":5,"description":"Fetch + snapshot HTML for confirmed/candidate rows lacking a snapshot"},
      {"step_name":"refresh_velocity_matview","step_order":6,"description":"REFRESH MATERIALIZED VIEW CONCURRENTLY tort_landing_page_velocity via RPC"}
    ]'
  )
on conflict (pipeline_name) do update set
  source_domain       = excluded.source_domain,
  description         = excluded.description,
  expected_cron       = excluded.expected_cron,
  max_runtime_minutes = excluded.max_runtime_minutes,
  step_definitions    = excluded.step_definitions;
