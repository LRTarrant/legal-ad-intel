---
name: new-migration
description: Author a Supabase migration safely for the legal-ad-intel repo. Use when creating any new SQL migration under supabase/migrations/, changing schema, RLS, RPCs, CHECK constraints, or pipeline_configs.source_domain. Encodes this repo's documented db-push hazards so the migration applies cleanly on push to main.
---

# New migration

Author a migration that applies cleanly when `supabase-migrations.yml` runs `supabase db push` on push to main. Migrations here have a long history of breaking the whole queue from small, repeatable mistakes — this skill walks the safe path. Work the steps in order.

## Ground rules (do not skip)

- **The directory is append-only.** Never edit a migration already on `origin/main` — it's already applied to prod. To change shipped schema, write a NEW migration. (A PreToolUse hook enforces this; if it blocks you, write a new file instead of fighting it.)
- **Never apply via the Supabase MCP** (`apply_migration` / `execute_sql`). It desyncs remote migration history and blocks `supabase db push` for every later migration. The only apply path is push-to-main (or, for a one-off, the Supabase SQL editor — but then the file must still land in the repo).
- **`database.types.ts` regenerates post-merge**, not in your PR. New RPCs/columns aren't type-gated until then; call new RPCs through the untyped `getSupabase().rpc()` cast (existing pattern) so `pr-typecheck` stays green.

## Step 1 — Pick a collision-free timestamp

`schema_migrations.version` is a unique key. Two files sharing the exact timestamp prefix crash `db push` and block the queue (the #396/#397/#398 incident).

```bash
TS=$(date -u +%Y%m%d%H%M%S)          # or hand-pick a UTC timestamp
ls supabase/migrations | grep -E "^${TS}" && echo "COLLISION — bump TS" || echo "ok: ${TS}"
```

If anything comes back, bump the timestamp by ≥1 second. Name the file `supabase/migrations/<TS>_<short_snake_summary>.sql`.

## Step 2 — Order state-changing statements safely

Ordering is the #1 source of failed migrations here.

- **Drop a CHECK constraint BEFORE any UPDATE that would violate it, then re-add it after.** Updating rows to a new value first fails against the old constraint (the `member`→`user` role-rename pattern: drop check → UPDATE → re-add widened check).
- **Renames/enum widenings**: drop dependent CHECKs first, do the data change, re-add the widened CHECK.
- Read the file top-to-bottom and confirm every DROP/UPDATE/ALTER is in safe order before finishing.

## Step 3 — If you touch `pipeline_configs.source_domain`

The `pipeline_configs_source_domain_check` CHECK has drifted ahead of the migration files — the latest file's IN-list is NOT authoritative. A narrower reconstructed list fails `db push` with "check constraint … is violated by some row."

Read the LIVE definition first, then DROP/ADD with the full current list **plus** your new value:

```sql
-- Read first (run in SQL editor / psql, paste the result into your migration intent):
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname = 'pipeline_configs_source_domain_check';
```

## Step 4 — If you change an RPC signature

Adding a defaulted parameter to an existing function creates an **ambiguous overload** with the old signature. Use `DROP FUNCTION ... ; CREATE FUNCTION ...` (not `CREATE OR REPLACE`) when arity/params change.

For `SECURITY DEFINER` RPCs with an internal auth guard (e.g. `is_super_admin()`): they must be called with the **caller's RLS session**, never the service-role key (service role has null `auth.uid()` → guard fails → empty result). Note this in the migration header so callers wire it correctly.

## Step 5 — Out-of-band objects

If your change alters an enum/CHECK/column that a hand-applied trigger or function references (e.g. `handle_new_user`), that object is invisible to migrations and will silently drift. Grep prod for references (`pg_proc.prosrc`, `pg_trigger`) and update them in the same migration so they don't break new writes.

## Step 6 — Header + verify

- Top the file with a comment block: what changes, why, and any apply-order or caller caveats from the steps above.
- You **cannot** safely apply pre-merge (that desyncs history). To gain confidence without applying, run a read-only `SELECT` of a new RPC's body logic, or review against the `migration-reviewer` agent.
- After merge, watch the `supabase-migrations.yml` run. A common transient is the `setup-cli` GitHub rate-limit (`supabase: command not found`) — fix with `gh run rerun --failed <id>`, it's not your migration.

## Step 7 — Hand off to review

Before opening the PR, run the **`migration-reviewer`** agent on the new file to catch ordering, collision, source_domain, overload, and out-of-band issues.
