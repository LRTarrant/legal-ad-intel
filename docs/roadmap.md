# Roadmap

## Phase 1

Completed:

- Supabase project linked
- Phase 1 schema migration applied
- Core tables created in the live database
- Next.js frontend scaffolded in `web/`

## Phase 2

Near-term stabilization:

- Finish frontend shell and dashboard scaffolding
- Standardize `web/` package structure
- Add environment examples and developer onboarding notes
- Start organizing Python ETLs under `scripts/`

## Phase 3

Data ingestion:

- Define source-by-source ETL entrypoints
- Normalize firm, market, tort, and MDL entity resolution rules
- Add ingestion logging and retry visibility
- Add lightweight data quality checks for duplicate events and broken foreign key mapping

## Phase 4

Product analytics:

- Build trend views on ad spend, impressions, and airings
- Add market-level and tort-level filtering
- Layer in docket and MDL monitoring views
- Expose enrichment overlays for storms and fatalities

## Phase 5

Operational hardening:

- Add CI checks for the frontend and migration safety
- Add typed query helpers for frontend data access
- Document ETL runbooks and source ownership
- Add role-based access and environment promotion workflow
