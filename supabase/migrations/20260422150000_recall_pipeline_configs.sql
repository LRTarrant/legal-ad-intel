-- Register Recall Watchlist pipelines in public.pipeline_configs so the
-- PipelineRun helper can bootstrap source_domain + step definitions.
-- Extends the source_domain CHECK constraint to add 'recall_watchlist'.

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
    'recall_watchlist'
  ]));

insert into public.pipeline_configs (pipeline_name, source_domain, step_definitions) values
  (
    'openfda_device_recalls',
    'recall_watchlist',
    jsonb '[
      {"step_name":"fetch_raw","step_order":1,"description":"Fetch Class I/II device recalls from openFDA API"},
      {"step_name":"normalize","step_order":2,"description":"Normalize manufacturers + device families, dedupe per event"},
      {"step_name":"publish","step_order":3,"description":"Upsert to public.recalls"}
    ]'
  ),
  (
    'courtlistener_recall_cases',
    'recall_watchlist',
    jsonb '[
      {"step_name":"fetch_raw","step_order":1,"description":"Party-search CourtListener RECAP for each recall manufacturer"},
      {"step_name":"normalize","step_order":2,"description":"Extract plaintiff firms and flag specialty-firm matches"},
      {"step_name":"publish","step_order":3,"description":"Upsert to public.recall_cases linked to parent recalls"}
    ]'
  ),
  (
    'recall_thermometer',
    'recall_watchlist',
    jsonb '[
      {"step_name":"score","step_order":1,"description":"Aggregate recall_cases per recall and compute 1-5 stage"},
      {"step_name":"publish","step_order":2,"description":"Patch public.recalls + append recall_stage_history on change"}
    ]'
  )
on conflict (pipeline_name) do update set
  source_domain    = excluded.source_domain,
  step_definitions = excluded.step_definitions;
