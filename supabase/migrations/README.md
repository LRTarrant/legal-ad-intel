# Supabase Migrations

SQL migration files in this directory define the production database schema.
Each file is timestamped and applied in order.

## How migrations are applied

### On merge to `main` (automatic)

A GitHub Action (`.github/workflows/supabase-migrations.yml`) runs whenever
migration files change on `main`. It uses `supabase db push` to apply any
pending migrations to the production Supabase project.

You don't need to do anything — just merge your PR and the action handles it.

### For local development

```bash
# Start a local Supabase stack (if not already running)
supabase start

# Apply migrations to your local database
supabase db push
```

### If the auto-apply fails

1. Check the GitHub Actions logs: go to the repo's **Actions** tab and find the
   "Apply Supabase Migrations" workflow run.
2. The most common causes:
   - **Missing secrets** — `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`
     must be set in repo Settings > Secrets and variables > Actions.
   - **Migration drift** — the production DB has changes that don't match the
     local migration files. You may need to resolve conflicts manually.
3. If needed, apply manually via the Supabase SQL Editor in the dashboard or
   by running `supabase db push --linked` from a local machine with the CLI
   configured.

## Creating a new migration

```bash
# Generate a new timestamped migration file
supabase migration new my_migration_name

# Edit the generated file in supabase/migrations/
# Then commit and open a PR
```
