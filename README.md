# Legal Marketing Intelligence

Legal advertising intelligence SaaS for U.S. plaintiff firms, their agencies, and media sellers. Turns ad activity, injury/litigation, and public-data signals into campaign plans, intelligence surfaces, and dashboards.

Live site: <https://legalmarketingintelligence.com>

## Where to start

- [`CLAUDE.md`](./CLAUDE.md) — primary reference for the repo. Tech stack, repo layout, full feature map (per-surface API + pipeline + workflow + tables + env vars), GitHub Actions inventory, common commands, and known gotchas. Read this first.
- [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) — product overview, audiences (plaintiff firms, agencies, media sellers), and pricing direction.
- [`CURRENT_PRIORITIES.md`](./CURRENT_PRIORITIES.md) — what's actively in play this week.
- [`docs/state-onboarding.md`](./docs/state-onboarding.md) — runbook for adding a new state to the State Intelligence surface.
- [`docs/schema.md`](./docs/schema.md) — high-level schema overview; `web/lib/database.types.ts` is the source of truth for column-level types.
- [`docs/data-sources.md`](./docs/data-sources.md) — feature ↔ external API ↔ pipeline ↔ workflow ↔ tables map.

## Repo at a glance

- `web/` — Next.js 16 + React 19 frontend and API routes (Supabase-backed). See `web/AGENTS.md` for the Next 16 / React 19 caveats.
- `pipeline/` — packaged Python 3.12 ETL system; new pipelines go here.
- `scripts/` — legacy one-shot loaders.
- `supabase/migrations/` — version-controlled SQL migrations (source of truth for schema).
- `.github/workflows/` — scheduled and triggered GitHub Actions (see CLAUDE.md §8).
