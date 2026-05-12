# Schema overview

The Supabase Postgres database is the system of record for every surface in LMI. The schema lives in `supabase/migrations/` (189 migrations and counting) and that directory is the source of truth — never apply schema changes directly to the live project. Column-level types for the frontend are generated into `web/lib/database.types.ts` via `supabase gen types typescript --linked --schema public`; treat that file as the authoritative column reference.

This doc is a high-level domain map. The table list below is the union of `CREATE TABLE` statements across `supabase/migrations/` and the public tables/views currently in `database.types.ts`. A handful of tables exist in production via the migration repair workflow (see CLAUDE.md §11 and `repair-migration-history.yml`) and may not appear in either source; do not delete a row from the live DB on the assumption that an absent migration means an absent table.

## Tables by domain

### Recall Watchlist
Pre-MDL early-warning board for medical-device recalls. Core tables: `recalls`, `recall_manufacturers`, `recall_device_families`, `recall_cases`, `recall_specialty_firms`, `recall_stage_history`. The manufacturer → tort linkage lives in `manufacturer_tort_map`; the human-curated allow list is `recall_manufacturer_allow_list`.

### MDL Tracker and litigation
Federal MDL state plus docket and JPML snapshots: `mdls`, `mdl_stats_monthly`, `mdl_developments`, `mdl_attorneys`, `jpml_snapshots`, `jpml_type_summaries`, `dockets`, `docket_events`, `cl_docket_map` (CourtListener ID mapping), `judicial_profiles`.

### Ad intelligence
Advertising fact and aggregate layer. Core fact: `ad_events`. Normalized and raw observation tables: `ad_observations_raw`, `ad_observations_normalized`, `ad_saturation_scores`, plus the `ad_saturation_summary` view. Resolved advertisers in `advertiser_entities`. Search-side intelligence: `serp_results_raw`, `serp_results_normalized`, `serp_visibility_scores`, `google_trends_observations`, `google_trends_related_queries`, `pi_search_observations`, `pi_keyword_clusters`, `pi_competitor_profiles`. Pricing and market-fit signals: `tort_cost_benchmarks`, `tort_lifecycle_cpa_ranges`, `tort_recommended_markets`.

### State Intelligence
Per-state PI surface inputs. Crash and fatality data: `fars_fatalities`, `fatalities`, plus `state_crash_statistics` (with `is_preliminary`). Weather and incident overlays: `storms`, `storm_events`, `storm_events_summary`. Other risk surfaces: `boating_accidents`, `cancer_incidence`. Geography and demographics: `census_demographics`, `msa_demographics` (view), `county_msa_crosswalk`, `pi_metros`, `geo_targets`, `dma_markets`, `markets`. State rollout metadata: `state_data_sources`, `state_rollout`.

### Mass torts and PI surfaces
Per-tort tables for the surfaces listed in CLAUDE.md §6.5 — e.g. the AI suicide stack (`ai_suicide_adverse_events`, `ai_suicide_qualifying_criteria_tiers`, `ai_suicide_settlement_projections`, `ai_suicide_timeline`, `ai_suicide_volume_signals_by_state`) and the Olympus scope stack (`olympus_adverse_events`, `olympus_device_failure_timeline`, `olympus_ercp_volume_by_state`, `olympus_qualifying_criteria_tiers`, `olympus_settlement_projections`). General tort dimensions: `mass_torts`, `torts`, `pi_viability_scores`, `tort_traction`.

### Campaign Builder
`campaigns` plus runtime-generated assets in the `campaign_assets` Storage bucket. Supporting tables: `pronunciation_dictionary` (ElevenLabs TTS), `generation_costs` (OpenAI/Vertex/ElevenLabs cost tracking), `tort_images`, `tort_recommended_markets`.

### Broadcast Intel
`broadcast_stations` (radio/TV station inventory) plus the related media-outlet rows surfaced by `web/app/api/broadcast/*`.

### Admin, auth, and tenancy
`firms`, `firm_managers`, `subscriptions`, `activity_log`, `alert_configs`, `alert_events`, `alert_known_advertisers`, `ai_search_log`. `profiles`, `invites`, and `tenant_branding` are referenced by the app and managed alongside Supabase Auth.

### Pipeline observability
`pipeline_configs`, `pipeline_runs`, `pipeline_run_steps` — written by `pipeline/lib/pipeline.py:PipelineRun` for every scheduled ingest. Inspect these tables when diagnosing a failed workflow run.

## Regenerating this doc

Refresh this file when schema changes meaningfully (new domain, new feature surface, major rename):

1. Pull the latest schema view via `supabase db pull`, or enumerate `information_schema.tables` directly.
2. Run `supabase gen types typescript --linked --schema public > web/lib/database.types.ts` and commit the result.
3. Update the domain groupings above. Keep the doc short — `database.types.ts` carries the columns.
