-- Add mean travel time to work (county level) to census_demographics.
-- Source: ACS 5-year Data Profile variable DP03_0025E ("Mean travel time to
-- work (minutes)"), keyed to the row's acs_vintage. Populated by
-- scripts/load_census_commute.py (one-shot, re-run when a new ACS vintage drops).
-- Additive + nullable: existing rows stay valid until the loader backfills them.

alter table public.census_demographics
  add column if not exists mean_commute_minutes numeric;

comment on column public.census_demographics.mean_commute_minutes is
  'Mean travel time to work in minutes for workers 16+ who do not work at home. Source: ACS 5-year Data Profile DP03_0025E, matched to acs_vintage. Loaded by scripts/load_census_commute.py.';
