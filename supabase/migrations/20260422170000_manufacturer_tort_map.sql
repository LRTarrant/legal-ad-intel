-- ============================================================================
-- Manufacturer ↔ Mass Tort mapping (Day 4 PR A)
-- ----------------------------------------------------------------------------
-- Joins recall_manufacturers (device recall world) to mass_torts (ad/SERP
-- world). Many-to-many: a mfr can map to multiple torts (3M → earplugs +
-- AFFF), a tort can have multiple mfrs (hernia mesh → Bard, Medtronic, etc).
--
-- confidence tiers:
--   high   → primary tort for this mfr; drives primary Firm Activity badges
--   medium → tort exposure exists but not the primary litigation vehicle
--   low    → tangential or parent-subsidiary relationship; shown in "Related torts"
--
-- source:
--   manual_seed   → seeded from pipeline/seeds/manufacturer_tort_map.csv
--   auto_match    → reserved for future fuzzy matcher
--   user_override → reserved for future UI edits
-- ============================================================================

create table if not exists public.manufacturer_tort_map (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.recall_manufacturers(id) on delete cascade,
  tort_id uuid not null references public.mass_torts(id) on delete cascade,
  tort_slug text not null,
  confidence text not null check (confidence in ('high','medium','low')),
  source text not null default 'manual_seed'
    check (source in ('manual_seed','auto_match','user_override')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, tort_id)
);

create index if not exists manufacturer_tort_map_mfr_idx
  on public.manufacturer_tort_map (manufacturer_id);
create index if not exists manufacturer_tort_map_tort_slug_idx
  on public.manufacturer_tort_map (tort_slug);
create index if not exists manufacturer_tort_map_tort_id_idx
  on public.manufacturer_tort_map (tort_id);

-- Keep updated_at fresh
create or replace function public.manufacturer_tort_map_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists manufacturer_tort_map_touch on public.manufacturer_tort_map;
create trigger manufacturer_tort_map_touch
  before update on public.manufacturer_tort_map
  for each row execute function public.manufacturer_tort_map_touch_updated_at();

-- RLS: service-role writes, authenticated users read
alter table public.manufacturer_tort_map enable row level security;

drop policy if exists "manufacturer_tort_map read" on public.manufacturer_tort_map;
create policy "manufacturer_tort_map read"
  on public.manufacturer_tort_map
  for select
  to authenticated
  using (true);

-- Service role bypasses RLS automatically; no write policy needed for now.

comment on table public.manufacturer_tort_map is
  'Many-to-many map between recall_manufacturers and mass_torts. Seeded from CSV; see pipeline/seeds/manufacturer_tort_map.csv.';
