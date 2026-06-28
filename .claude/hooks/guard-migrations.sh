#!/usr/bin/env bash
# PreToolUse guard for supabase/migrations/*.sql
#
# Prevents the two documented `supabase db push` killers (CLAUDE.md §11):
#   1. Modifying a migration that has already shipped to prod. Migrations auto-apply
#      on push to main, and the directory is append-only — rewriting a shipped file
#      desyncs schema_migrations and can block the whole migration queue.
#   2. Creating a new migration whose timestamp version collides with an existing one.
#      schema_migrations.version is a unique key; two files sharing the exact timestamp
#      prefix crash db push and block every later migration (the #396/#397/#398 incident).
#
# Behavior: exits 2 (blocks the tool call, message → Claude) on a violation; exits 0
# otherwise. Any internal error fails open (exit 0) — a hook bug must never wedge editing.

set -uo pipefail

input=$(cat)

parsed=$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("tool_name", ""))
    print((d.get("tool_input") or {}).get("file_path", ""))
except Exception:
    pass
' 2>/dev/null || true)

tool_name=$(printf '%s\n' "$parsed" | sed -n 1p)
file_path=$(printf '%s\n' "$parsed" | sed -n 2p)

# Only guard supabase migration SQL files; everything else passes through untouched.
case "$file_path" in
  *supabase/migrations/*.sql) ;;
  *) exit 0 ;;
esac

# Repo root = two levels up from this script (.claude/hooks/ -> repo root).
repo_root=$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd) || exit 0
rel=${file_path#"$repo_root"/}
base=$(basename "$file_path")

# 1) Already on origin/main => already applied to prod => block any modification.
if git -C "$repo_root" cat-file -e "origin/main:$rel" 2>/dev/null; then
  echo "BLOCKED: $base already exists on origin/main, so it has shipped and been applied to prod (migrations auto-apply on push to main). supabase/migrations/ is append-only — editing a shipped migration desyncs schema_migrations and can break \`supabase db push\` for the whole queue. Write a NEW migration with a later timestamp to make the change. (CLAUDE.md §11)" >&2
  exit 2
fi

# 2) New/uncommitted file => block if its timestamp version collides with an existing file.
ts=$(printf '%s' "$base" | grep -oE '^[0-9]+' || true)
if [ -n "$ts" ]; then
  collision=$(ls "$repo_root/supabase/migrations" 2>/dev/null | grep -E "^${ts}_" | grep -vxF "$base" || true)
  if [ -n "$collision" ]; then
    echo "BLOCKED: migration timestamp ${ts} collides with existing file(s): ${collision}. schema_migrations.version is a unique key — two files sharing the exact timestamp prefix crash \`supabase db push\` and block every later migration in the queue (the #396/#397/#398 incident). Bump your timestamp by at least one second and retry. (CLAUDE.md §11)" >&2
    exit 2
  fi
fi

exit 0
