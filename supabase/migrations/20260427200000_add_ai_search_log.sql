-- AI Search Log: tracks every Campaign Builder AI search query
-- for analytics, cost monitoring, and quality improvement.
create table if not exists public.ai_search_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  question    text not null,
  intent      text,
  entities    jsonb,
  answer      text,
  actions     jsonb,
  latency_ms  integer,
  model       text,
  created_at  timestamptz not null default now()
);

-- Index for per-user rate limiting lookups
create index if not exists idx_ai_search_log_user_created
  on public.ai_search_log (user_id, created_at desc);

-- RLS: users can only read their own logs
alter table public.ai_search_log enable row level security;

create policy "Users can view own search logs"
  on public.ai_search_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own search logs"
  on public.ai_search_log for insert
  with check (auth.uid() = user_id);
