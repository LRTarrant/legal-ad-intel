-- ============================================================================
-- Day 4 PR B: add alt_slugs to manufacturer_tort_map
-- ----------------------------------------------------------------------------
-- `serp_results_normalized.tort_slug` uses snake_case ('hernia_mesh',
-- 'firefighter_foam', 'talcum_powder') while public.mass_torts.slug uses
-- kebab-case ('hernia-mesh', 'afff-firefighting-foam', 'talcum-powder').
-- alt_slugs lets us bridge both conventions without touching existing data.
--
-- The canonical slug stays in tort_slug. alt_slugs holds additional variants
-- (commonly snake_case equivalents) that the deep-dive page will try when
-- filtering serp_results_normalized.
-- ============================================================================

alter table public.manufacturer_tort_map
  add column if not exists alt_slugs text[] not null default '{}';

create index if not exists manufacturer_tort_map_alt_slugs_idx
  on public.manufacturer_tort_map using gin (alt_slugs);

-- Seed known SERP slug variants for the Day 4 PR A seed rows.
update public.manufacturer_tort_map
set alt_slugs = array['hernia_mesh']
where tort_slug = 'hernia-mesh'
  and (alt_slugs is null or alt_slugs = '{}');

update public.manufacturer_tort_map
set alt_slugs = array['talcum_powder']
where tort_slug = 'talcum-powder'
  and (alt_slugs is null or alt_slugs = '{}');

update public.manufacturer_tort_map
set alt_slugs = array['firefighter_foam']
where tort_slug = 'afff-firefighting-foam'
  and (alt_slugs is null or alt_slugs = '{}');

update public.manufacturer_tort_map
set alt_slugs = array['3m_earplugs']
where tort_slug = '3m-earplugs'
  and (alt_slugs is null or alt_slugs = '{}');

-- CPAP already matches (both use 'cpap'); leave alt_slugs empty.
