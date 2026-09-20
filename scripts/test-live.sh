#!/usr/bin/env bash
# Runs the full suite with the live Postgres and REST tests attached.
# Author CKC. Version 0.1.0.
#
# Without these variables the live tests skip, and a skipped test proves
# nothing. Start a stack first with `pnpm run db:start`.
set -euo pipefail

if ! status=$(pnpm exec supabase status -o env 2>/dev/null); then
  echo "No local Supabase stack. Run: pnpm run db:start" >&2
  exit 1
fi

eval "$(printf '%s\n' "$status" | sed 's/^/export /')"

export DATABASE_URL="$DB_URL"
export SUPABASE_URL="$API_URL"
export SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
# The stack is on loopback; a proxy in the environment must not intercept it.
export NO_PROXY="127.0.0.1,localhost"
export no_proxy="$NO_PROXY"

exec pnpm exec vitest run "$@"
