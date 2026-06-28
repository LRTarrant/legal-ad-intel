#!/usr/bin/env bash
# PreToolUse guard: block edits/writes to .env files that hold real secrets.
#
# web/.env.local and friends carry live secrets (service-role key, QA creds,
# OpenAI/ElevenLabs/Resend keys). This blocks accidental edits/overwrites of them.
# Committed templates (.env.example / .env.sample / .env.template) are allowed —
# they're meant to be edited and contain no secrets.
#
# Behavior: exits 2 (blocks, message → Claude) on a secret .env file; exits 0
# otherwise. Fails open on any internal error — a hook bug must never wedge editing.

set -uo pipefail

input=$(cat)

file_path=$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print((d.get("tool_input") or {}).get("file_path", ""))
except Exception:
    pass
' 2>/dev/null || true)

[ -z "$file_path" ] && exit 0
base=$(basename "$file_path")

case "$base" in
  # Allow committed, secret-free templates.
  .env.example|.env.sample|.env.template|.env.*.example|.env.*.sample) exit 0 ;;
  # Block real env files (.env, .env.local, .env.production, .env.*.local, etc.).
  .env|.env.*)
    echo "BLOCKED: $base holds live secrets (service-role key, API keys, QA creds) and must not be edited by the agent. If a value genuinely needs to change, do it yourself in the file, or edit .env.example for documentation. (project secret-file guard)" >&2
    exit 2
    ;;
  *) exit 0 ;;
esac
