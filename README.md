# Legal Ad Intelligence

Legal ad intelligence SaaS for plaintiff firms and agencies tracking digital and traditional ad activity, markets, torts, MDLs, dockets, and enrichment data.

## Current stack

- `web/`: Next.js frontend
- `supabase/`: Supabase config and version-controlled SQL migrations
- `scripts/`: reserved for Python ETLs and ingestion helpers
- `docs/`: project documentation and planning notes

## Current architecture

The schema is centered on `ad_events` as the core fact table.

Supporting dimensions and enrichment layers currently include:

- `firms`
- `markets`
- `mass_torts`
- `mdls`
- `mdl_stats_monthly`
- `dockets`
- `docket_events`
- `fatalities`
- `storms`

Phase 1 schema migration has already been applied successfully to the linked Supabase project. This repo keeps migrations intact and version-controlled under `supabase/migrations/`.

## Recommended repo structure

```text
legal-ad-intel/
├── docs/
│   ├── data-sources.md
│   ├── roadmap.md
│   └── schema.md
├── scripts/
│   └── ...
├── supabase/
│   ├── config.toml
│   └── migrations/
├── web/
│   ├── app/
│   ├── lib/
│   ├── public/
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   └── tsconfig.json
└── README.md
```

## Working locally

### Frontend

```bash
cd web
npm install
npm run dev
```

Required env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Database

- Supabase CLI is already linked to the live project.
- Keep using `supabase/migrations/` as the source of truth for schema evolution.
- Do not rename or remove existing tables.
- Frontend database types currently live in `web/lib/database.types.ts`.
- To regenerate them from the linked project after `supabase login`:

```bash
supabase gen types typescript --linked --schema public > web/lib/database.types.ts
```

## Documentation

- [Schema](./docs/schema.md)
- [Roadmap](./docs/roadmap.md)
- [Data sources](./docs/data-sources.md)
