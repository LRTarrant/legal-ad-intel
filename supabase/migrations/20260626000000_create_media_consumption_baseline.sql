-- Media Consumption Baseline — curated, attribution-checked national consumption
-- rates by demographic × channel. Powers the Strategy Engine audience-fit signal
-- (web/lib/strategy-engine/assemble-inputs.ts) and the standalone Media
-- Consumption page. Seeded from docs/media_consumption_baseline_seed.csv.
--
-- Source rules (see docs/media-consumption-baseline.md "Licensing"):
--   * Pew Research Center  — republishable WITH attribution + Pew disclaimer.
--   * BLS American Time Use Survey — public domain.
--   * Nielsen (cited as fact) — NOT republishable; display the headline number as
--     a cited stat with a link, NEVER as a reproduced Nielsen table.
--
-- `scope` is LOAD-BEARING (see the spec's "News vs general scope"):
--   * general = direct reach/adoption; trust as-is for channel fit.
--   * news    = news-getting on the channel; a relative-ranking proxy only.
-- The engine prefers `general` rows and uses `news` rows only as a proxy.
--
-- Designed so Scarborough/MRI DMA rows slot in later with NO schema change —
-- just geography_level='dma' rows.

create table if not exists public.media_consumption_baseline (
  id uuid primary key default gen_random_uuid(),
  geography_level text not null check (geography_level in ('national','dma','msa','state')),
  geo_code text not null,
  demographic_type text not null check (demographic_type in ('all','race','age','income','education')),
  demographic_group text not null,
  channel text not null,
  metric text not null,
  scope text not null check (scope in ('news','general')),
  value numeric not null,
  unit text not null,
  source text not null,
  source_url text,
  source_year int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_consumption_baseline_natural_key
    unique (geography_level, geo_code, demographic_type, demographic_group, channel, metric, scope)
);

create index if not exists idx_mcb_lookup
  on public.media_consumption_baseline (geography_level, channel, scope, demographic_group);

-- RLS: non-sensitive reference data — readable by any authenticated session
-- (the app is middleware-auth-gated), writable only by the service role.
alter table public.media_consumption_baseline enable row level security;

drop policy if exists media_consumption_baseline_read on public.media_consumption_baseline;
create policy media_consumption_baseline_read
  on public.media_consumption_baseline for select using (true);

drop policy if exists media_consumption_baseline_service_write on public.media_consumption_baseline;
create policy media_consumption_baseline_service_write
  on public.media_consumption_baseline for all using (auth.role() = 'service_role');

-- Seed: 55 rows from docs/media_consumption_baseline_seed.csv (46 Pew / 9 Nielsen).
-- Idempotent on the natural key so re-applies are no-ops. Values are verbatim
-- from the licensing-checked seed — do not alter them.
insert into public.media_consumption_baseline
  (geography_level, geo_code, demographic_type, demographic_group, channel, metric, scope, value, unit, source, source_url, source_year, notes)
values
  ('national', 'US', 'all', 'all_adults', 'digital', 'news_consume', 'news', 86, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped (news reach proxy); 56% often'),
  ('national', 'US', 'all', 'all_adults', 'tv_linear', 'news_consume', 'news', 64, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped proxy; 32% often'),
  ('national', 'US', 'all', 'all_adults', 'radio', 'news_consume', 'news', 44, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; 11% often. Radio NEWS only — understates general radio reach (see Nielsen rows)'),
  ('national', 'US', 'all', 'all_adults', 'print', 'news_consume', 'news', 25, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; 7% often'),
  ('national', 'US', 'all', 'all_adults', 'social', 'news_consume', 'news', 53, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; 21% often'),
  ('national', 'US', 'all', 'all_adults', 'search', 'news_consume', 'news', 63, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; 19% often'),
  ('national', 'US', 'all', 'all_adults', 'podcast', 'news_consume', 'news', 32, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; 10% often. News-podcast overstates general podcast reach (podcast news-seekers skew)'),
  ('national', 'US', 'all', 'all_adults', 'tv_linear', 'news_prefer', 'news', 34, 'pct_prefer', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS preference'),
  ('national', 'US', 'all', 'all_adults', 'radio', 'news_prefer', 'news', 5, 'pct_prefer', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS preference'),
  ('national', 'US', 'all', 'all_adults', 'print', 'news_prefer', 'news', 5, 'pct_prefer', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS preference'),
  ('national', 'US', 'race', 'black', 'tv_linear', 'news_consume', 'news', 76, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped; vs 62% White/Hisp, 52% Asian; strongest TV-news over-index'),
  ('national', 'US', 'race', 'white', 'tv_linear', 'news_consume', 'news', 62, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped'),
  ('national', 'US', 'race', 'hispanic', 'tv_linear', 'news_consume', 'news', 62, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped'),
  ('national', 'US', 'race', 'asian', 'tv_linear', 'news_consume', 'news', 52, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped'),
  ('national', 'US', 'race', 'black', 'tv_linear', 'news_prefer', 'news', 38, 'pct_prefer', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS pref; highest TV-news preference of any racial group'),
  ('national', 'US', 'race', 'black', 'youtube', 'news_regular', 'news', 41, 'pct_regularly', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped; each higher than White share'),
  ('national', 'US', 'race', 'black', 'facebook', 'news_regular', 'news', 36, 'pct_regularly', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped'),
  ('national', 'US', 'race', 'black', 'instagram', 'news_regular', 'news', 27, 'pct_regularly', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped'),
  ('national', 'US', 'race', 'black', 'tiktok', 'news_regular', 'news', 22, 'pct_regularly', 'Pew Research Center', 'https://www.pewresearch.org/short-reads/2024/02/13/8-facts-about-black-americans-and-the-news/', 2024, 'NEWS-scoped'),
  ('national', 'US', 'all', 'all_adults', 'youtube', 'platform_use', 'general', 84, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption (not news)'),
  ('national', 'US', 'all', 'all_adults', 'facebook', 'platform_use', 'general', 71, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'all', 'all_adults', 'instagram', 'platform_use', 'general', 50, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'all', 'all_adults', 'tiktok', 'platform_use', 'general', 37, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'all', 'all_adults', 'whatsapp', 'platform_use', 'general', 32, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'all', 'all_adults', 'snapchat', 'platform_use', 'general', 25, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'all', 'all_adults', 'reddit', 'platform_use', 'general', 26, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'all', 'all_adults', 'x_twitter', 'platform_use', 'general', 21, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/fact-sheet/social-media/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'asian', 'youtube', 'platform_use', 'general', 92, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL; YouTube highest among Asian + Hispanic'),
  ('national', 'US', 'race', 'hispanic', 'youtube', 'platform_use', 'general', 88, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'hispanic', 'instagram', 'platform_use', 'general', 62, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL; vs 45% White'),
  ('national', 'US', 'race', 'asian', 'instagram', 'platform_use', 'general', 58, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'black', 'instagram', 'platform_use', 'general', 54, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'white', 'instagram', 'platform_use', 'general', 45, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'hispanic', 'tiktok', 'platform_use', 'general', 57, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL; Hispanic + Black over-index TikTok'),
  ('national', 'US', 'race', 'black', 'tiktok', 'platform_use', 'general', 53, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'asian', 'tiktok', 'platform_use', 'general', 31, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'white', 'tiktok', 'platform_use', 'general', 28, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'hispanic', 'whatsapp', 'platform_use', 'general', 56, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL; ~2.5x White rate'),
  ('national', 'US', 'race', 'asian', 'whatsapp', 'platform_use', 'general', 54, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'race', 'white', 'whatsapp', 'platform_use', 'general', 23, 'pct_ever_use', 'Pew Research Center', 'https://www.pewresearch.org/internet/2025/11/20/americans-social-media-use-2025/', 2025, 'GENERAL adoption'),
  ('national', 'US', 'age', '18_29', 'social', 'news_consume', 'news', 76, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; 48-pt gap vs 65+ (28%); social skews young'),
  ('national', 'US', 'age', '65_plus', 'social', 'news_consume', 'news', 28, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped'),
  ('national', 'US', 'age', '18_29', 'podcast', 'listen', 'general', 67, 'pct_listen', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/podcasts-and-news-fact-sheet/', 2025, 'GENERAL podcast listening (any), not news; vs 33% of 65+'),
  ('national', 'US', 'age', '65_plus', 'podcast', 'listen', 'general', 33, 'pct_listen', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/podcasts-and-news-fact-sheet/', 2025, 'GENERAL podcast listening'),
  ('national', 'US', 'age', '50_plus', 'tv_linear', 'news_consume_skew', 'news', 1, 'direction_over_index', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; 50+ over-index TV/print for news; directional flag not a pct'),
  ('national', 'US', 'age', '18_29', 'digital', 'news_consume', 'news', 93, 'pct_at_least_sometimes', 'Pew Research Center', 'https://www.pewresearch.org/journalism/fact-sheet/news-platform-fact-sheet/', 2025, 'NEWS-scoped; young adults nearly all-digital'),
  ('national', 'US', 'race', 'black', 'radio', 'reach_monthly', 'general', 92, 'pct_reach', 'Nielsen (cited as fact)', 'https://radioink.com/2025/08/13/nielsen-radios-reach-with-black-audiences-hits-92/', 2025, 'GENERAL radio reach (not news). CITE-AS-FACT only, do not republish Nielsen tables'),
  ('national', 'US', 'race', 'black', 'radio', 'ad_audio_share', 'general', 73, 'pct_of_ad_supported_audio', 'Nielsen (cited as fact)', 'https://www.nielsen.com/insights/2025/radio-gateway-to-black-audience-engagement/', 2025, 'GENERAL; 73% of Black daily ad-supported audio is radio; CITE-AS-FACT'),
  ('national', 'US', 'race', 'black', 'radio_urban', 'format_share', 'general', 50.2, 'pct_of_black_radio_listening', 'Nielsen (cited as fact)', 'https://www.nielsen.com/insights/2025/radio-gateway-to-black-audience-engagement/', 2025, 'GENERAL; Urban AC + Urban Contemporary = 50.2% of Black radio listening; CITE-AS-FACT'),
  ('national', 'US', 'race', 'hispanic', 'radio', 'reach_weekly', 'general', 98, 'pct_reach', 'Nielsen (cited as fact)', 'https://www.billboard.com/pro/nielsen-audio-today-radio-report-hispanics-black-audiences/', 2024, 'GENERAL Hispanic weekly radio reach; CITE-AS-FACT'),
  ('national', 'US', 'race', 'black', 'all_media', 'time_spent_weekly', 'general', 81, 'hours_per_week', 'Nielsen (cited as fact)', 'https://www.nielsen.com/insights/2024/the-global-black-audience-2024-diverse-intelligence-series-report/', 2024, 'GENERAL; 31.8% above gen pop; context stat; CITE-AS-FACT'),
  ('national', 'US', 'all', 'all_adults', 'ctv', 'streaming_share_of_tv', 'general', 44.8, 'pct_of_total_tv_time', 'Nielsen (cited as fact)', 'https://www.nielsen.com/insights/2025/connected-tv-transforming-advertising-trends/', 2025, 'GENERAL; Nielsen Gauge May 2025 — streaming > broadcast+cable combined. CITE-AS-FACT, do not republish Nielsen tables'),
  ('national', 'US', 'race', 'hispanic', 'ctv', 'streaming_share_of_tv', 'general', 55.8, 'pct_of_tv_time', 'Nielsen (cited as fact)', 'https://www.nielsen.com/news-center/2025/hispanic-consumers-overindex-on-streaming-consumption-versus-rest-of-u-s-new-nielsen-report-finds/', 2025, 'GENERAL; Hispanic streaming 55.8% of TV time vs 46% rest-of-US; over-indexes CTV. CITE-AS-FACT'),
  ('national', 'US', 'race', 'black', 'ctv', 'fast_overindex', 'general', 1, 'direction_over_index', 'Nielsen (cited as fact)', 'https://www.nielsen.com/insights/2025/connected-tv-transforming-advertising-trends/', 2025, 'GENERAL; Black audiences ~1/3 of FAST (free ad-supported streaming) viewing time, well above pop share; directional over-index flag. CITE-AS-FACT'),
  ('national', 'US', 'age', '25_54', 'ctv', 'penetration', 'general', 80, 'pct_penetration', 'Nielsen (cited as fact)', 'https://research.mountain.com/insights/generational-breakdown-who-is-watching-connected-tv/', 2025, 'GENERAL; CTV penetration 80%+ for 25-54, <50% for 65+; CTV skews younger than linear TV. CITE-AS-FACT')
on conflict on constraint media_consumption_baseline_natural_key do nothing;
