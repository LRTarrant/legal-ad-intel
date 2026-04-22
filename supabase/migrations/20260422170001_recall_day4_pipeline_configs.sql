-- Register Day 4 PR A pipelines in public.pipeline_configs.

insert into public.pipeline_configs (pipeline_name, source_domain, step_definitions) values
  (
    'load_manufacturer_tort_map',
    'recall_watchlist',
    jsonb '[
      {"step_name":"fetch_raw","step_order":1,"description":"Load CSV seed from pipeline/seeds/manufacturer_tort_map.csv"},
      {"step_name":"normalize","step_order":2,"description":"Validate foreign keys against recall_manufacturers + mass_torts"},
      {"step_name":"publish","step_order":3,"description":"Upsert to public.manufacturer_tort_map"}
    ]'
  ),
  (
    'courtlistener_recall_case_parties',
    'recall_watchlist',
    jsonb '[
      {"step_name":"fetch_raw","step_order":1,"description":"Select recall_cases rows missing plaintiff_firm_name"},
      {"step_name":"normalize","step_order":2,"description":"Fetch CourtListener /parties/ + /attorneys/, extract plaintiff firm, match specialty list"},
      {"step_name":"publish","step_order":3,"description":"Patch recall_cases with plaintiff_firm_name + is_specialty_firm"}
    ]'
  )
on conflict (pipeline_name) do update set
  source_domain    = excluded.source_domain,
  step_definitions = excluded.step_definitions;
