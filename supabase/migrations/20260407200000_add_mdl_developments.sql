create table mdl_developments (
  id uuid primary key default gen_random_uuid(),
  mdl_number int not null,
  title text not null,
  summary text,
  source_name text,
  source_url text,
  event_date date not null,
  event_type text not null,
  created_at timestamptz default now()
);
create index idx_mdl_developments_mdl on mdl_developments(mdl_number);
create index idx_mdl_developments_date on mdl_developments(event_date desc);

-- RLS: enable and allow anon SELECT (consistent with other tables)
alter table mdl_developments enable row level security;
create policy "anon_select" on mdl_developments for select to anon using (true);
