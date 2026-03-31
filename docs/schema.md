# Database Schema (Phase 1)

This document describes the Phase 1 Supabase/Postgres schema for Legal Marketing Intelligence.

Migration file: `supabase/migrations/20260329235425_phase1_legal_ad_intel_schema.sql`

## Tables Overview

| Table | Description |
|-------|-------------|
| `firms` | Law firms and advertisers |
| `markets` | Geographic markets (DMA regions) |
| `mass_torts` | Mass tort litigation cases |
| `mdls` | Multidistrict Litigation (MDL) records |
| `mdl_stats_monthly` | Monthly MDL statistics |
| `ad_events` | Ad placements — core fact table |
| `fatalities` | Motor vehicle fatality records |
| `storms` | Storm/weather event data |
| `dockets` | Court docket records |
| `docket_events` | Individual events within a docket |

## Entity Relationship Diagram (Conceptual)

```
firms ──────────┐
markets ────────┤
mass_torts ─────┼──▶ ad_events (core fact table)
mdls ───────────┘
  │
  └──▶ mdl_stats_monthly

mass_torts ──▶ mdls

mdls ────────┐
mass_torts ──┼──▶ dockets ──▶ docket_events
             │
markets ─────┼──▶ fatalities
             └──▶ storms
```

## Table Details

### firms

Law firms, agencies, and advertisers tracked in the system.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| name | text | Required |
| slug | text | Unique, URL-friendly |
| firm_type | text | `plaintiff_firm`, `agency`, `advertiser`, `unknown` |
| website | text | |
| headquarters_city | text | |
| headquarters_state | text | |
| notes | text | |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Default `now()` |

### markets

Geographic markets, typically DMA (Designated Market Area) regions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| market_code | text | Unique — DMA code or internal key |
| market_name | text | Required |
| state_code | text | |
| region | text | |
| country_code | text | Default `US` |
| timezone_name | text | |
| latitude | numeric(9,6) | |
| longitude | numeric(9,6) | |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Default `now()` |

### mass_torts

Mass tort litigation tracking (e.g., Camp Lejeune, Roundup, PFAS).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| name | text | Required |
| slug | text | Unique |
| category | text | `pharma`, `product_liability`, `environmental`, `wildfire`, etc. |
| status | text | `active`, `emerging`, `winding_down`, `closed` |
| disease_or_injury | text | |
| product_or_exposure | text | |
| start_date | date | |
| end_date | date | |
| notes | text | |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Default `now()` |

### mdls

Multidistrict Litigation records, linked to mass torts.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| mass_tort_id | uuid (FK) | References `mass_torts.id` |
| mdl_number | integer | Unique — official MDL number |
| title | text | Required |
| court | text | |
| district | text | |
| judge_name | text | |
| status | text | `active`, `closed`, `remanded`, etc. |
| filed_date | date | |
| closed_date | date | |
| source_url | text | |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Default `now()` |

### mdl_stats_monthly

Monthly statistics snapshot for each MDL (pending actions, trends).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| mdl_id | uuid (FK) | References `mdls.id` (cascade delete) |
| stats_month | date | First day of month — unique per MDL |
| pending_actions | integer | |
| pending_actions_change | integer | |
| source_url | text | |
| source_published_at | timestamptz | |
| ingested_at | timestamptz | Default `now()` |
| created_at | timestamptz | Default `now()` |

### ad_events (core fact table)

The main fact table — every ad placement/observation across all sources.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| firm_id | uuid (FK) | References `firms.id` |
| market_id | uuid (FK) | References `markets.id` |
| mass_tort_id | uuid (FK) | References `mass_torts.id` |
| mdl_id | uuid (FK) | References `mdls.id` |
| source | text | Required — `meta`, `google`, `tv`, `ctv`, `radio`, `other` |
| source_event_id | text | Upstream record ID |
| event_date | date | Required |
| aired_at | timestamptz | |
| ingested_at | timestamptz | Default `now()` |
| channel | text | `tv`, `ctv`, `radio`, `digital`, `search`, `social` |
| platform | text | `meta`, `google`, `ispot`, `mediaradar`, etc. |
| advertiser_name_raw | text | |
| campaign_name | text | |
| creative_id | text | |
| creative_name | text | |
| spend_estimate | numeric(14,2) | |
| impressions_estimate | bigint | |
| airings_count | integer | |
| estimated_reach | integer | |
| state_code | text | |
| dma_code | text | |
| metadata | jsonb | Default `{}` |
| created_at | timestamptz | Default `now()` |

Unique constraint: `(source, source_event_id)`

### fatalities

Motor vehicle fatality records (FARS and other sources).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| market_id | uuid (FK) | References `markets.id` |
| incident_date | date | Required |
| year | integer | Required |
| state_code | text | |
| county_name | text | |
| city_name | text | |
| latitude | numeric(9,6) | |
| longitude | numeric(9,6) | |
| fatality_count | integer | Default `1` |
| source | text | Required — `fars`, `state source`, etc. |
| source_record_id | text | |
| attributes | jsonb | Default `{}` |
| ingested_at | timestamptz | Default `now()` |
| created_at | timestamptz | Default `now()` |

Unique constraint: `(source, source_record_id)`

### storms

Storm and weather event data (primarily from NOAA).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| market_id | uuid (FK) | References `markets.id` |
| event_type | text | Required — `tornado`, `hail`, `hurricane`, `flood`, etc. |
| episode_id | text | |
| event_id | text | |
| begin_date | timestamptz | |
| end_date | timestamptz | |
| event_date | date | Generated — derived from `begin_date` |
| state_code | text | |
| county_name | text | |
| cz_name | text | |
| magnitude | numeric(10,2) | |
| injuries_direct | integer | |
| injuries_indirect | integer | |
| deaths_direct | integer | |
| deaths_indirect | integer | |
| damage_property_usd | numeric(14,2) | |
| damage_crops_usd | numeric(14,2) | |
| source | text | Default `noaa` |
| source_url | text | |
| attributes | jsonb | Default `{}` |
| ingested_at | timestamptz | Default `now()` |
| created_at | timestamptz | Default `now()` |

Unique constraint: `(source, event_id)`

### dockets

Court docket records, linked to MDLs and mass torts.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| mdl_id | uuid (FK) | References `mdls.id` |
| mass_tort_id | uuid (FK) | References `mass_torts.id` |
| source | text | Default `courtlistener` |
| source_docket_id | text | |
| court | text | |
| jurisdiction | text | |
| case_name | text | Required |
| docket_number | text | |
| judge_name | text | |
| filed_date | date | |
| terminated_date | date | |
| status | text | `open`, `closed`, `stayed`, `remanded`, etc. |
| plaintiffs_count | integer | |
| defendants_count | integer | |
| source_url | text | |
| metadata | jsonb | Default `{}` |
| ingested_at | timestamptz | Default `now()` |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Default `now()` |

Unique constraint: `(source, source_docket_id)`

### docket_events

Individual events within a docket (filings, motions, orders, etc.).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| docket_id | uuid (FK) | References `dockets.id` (cascade delete) |
| source | text | Default `courtlistener` |
| source_event_id | text | |
| event_date | timestamptz | Required |
| event_type | text | `complaint`, `transfer_order`, `minute_entry`, `motion`, `order`, etc. |
| event_title | text | |
| event_description | text | |
| document_number | text | |
| source_url | text | |
| metadata | jsonb | Default `{}` |
| ingested_at | timestamptz | Default `now()` |
| created_at | timestamptz | Default `now()` |

Unique constraint: `(source, source_event_id)`

## Extensions

- **pgcrypto** — used for `gen_random_uuid()` UUID generation

## Indexing Strategy

All tables have indexes on:
- Foreign key columns (for join performance)
- Date columns (descending, for time-series queries)
- Status/type columns (for filtering)
- Composite indexes on common query patterns (e.g., `firm_id + event_date`)
- GIN index on `ad_events.metadata` for JSONB queries
