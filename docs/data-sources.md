# Data sources

This document tracks the main source categories the platform is designed to support. It is intentionally high-level for now so the ingest architecture can stay flexible while the project is still being organized.

## Advertising sources

Potential source families for `ad_events`:

- Meta ads
- Google ads
- TV ad monitoring
- CTV ad monitoring
- Radio ad monitoring
- Vendor exports such as MediaRadar or iSpot

Typical fields to preserve:

- source identifiers
- advertiser and campaign naming
- event dates and air times
- spend and impression estimates
- platform and channel labels
- market, state, or DMA clues

## Litigation sources

Potential source families for MDL and docket intelligence:

- CourtListener
- JPML / federal court publications
- district court dockets
- manually curated MDL reference data

Likely targets:

- `mdls`
- `mdl_stats_monthly`
- `dockets`
- `docket_events`

## Enrichment sources

Potential source families for market overlays:

- NOAA storm data
- FARS or state fatality data
- geographic market reference files

Likely targets:

- `storms`
- `fatalities`
- `markets`

## Ingestion guidance

- Keep raw source identifiers where possible for traceability.
- Prefer append-oriented ingest plus dedupe on `(source, source_event_id)` or equivalent natural keys.
- Normalize into dimension tables only after preserving source-native fields needed for audits and reprocessing.
