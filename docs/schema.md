# Schema overview

## Design principle

The schema is organized around `ad_events` as the core fact table. Everything else supports attribution, filtering, enrichment, or downstream analysis.

## Fact table

### `ad_events`

Primary record of observed advertising activity across channels and platforms.

Key relationships:

- `firm_id -> firms.id`
- `market_id -> markets.id`
- `mass_tort_id -> mass_torts.id`
- `mdl_id -> mdls.id`

Representative measures:

- `spend_estimate`
- `impressions_estimate`
- `airings_count`
- `estimated_reach`

Representative dimensions carried directly on the fact:

- `source`
- `event_date`
- `channel`
- `platform`
- `state_code`
- `dma_code`
- `metadata`

## Dimension tables

### `firms`

Canonical organizations tied to plaintiff firms, agencies, advertisers, or unknown entities.

### `markets`

Canonical market records keyed by `market_code`, with geography and timezone metadata.

### `mass_torts`

Canonical tort topics used to group related ad activity and litigation signals.

### `mdls`

Federal MDL entities linked back to `mass_torts` when applicable.

## Enrichment and activity tables

### `mdl_stats_monthly`

Monthly snapshots of MDL pending actions and changes over time.

### `dockets`

Case-level docket records linked to MDLs and mass torts.

### `docket_events`

Time-ordered events within each docket.

### `fatalities`

Incident-level fatality data that can be mapped to markets and used as enrichment.

### `storms`

Weather or disaster events that can be tied to markets and used for signal correlation.

## Current table inventory

- `firms`
- `markets`
- `mass_torts`
- `ad_events`
- `fatalities`
- `storms`
- `mdls`
- `mdl_stats_monthly`
- `dockets`
- `docket_events`

## Notes for future migrations

- Preserve `ad_events` as the central fact model unless there is a compelling product reason to split facts by source.
- Add new enrichment tables around the fact model rather than baking source-specific fields into unrelated dimensions.
- Keep schema changes in `supabase/migrations/` and avoid direct manual drift in the live project.
