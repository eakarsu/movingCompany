#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="${RUNTIME_PROJECT_SOURCE:-$script_dir}"
cd "$project_root"

runtime_port="${PORT:-}"
if [[ ! "$runtime_port" =~ ^[0-9]+$ ]] || (( runtime_port < 1024 || runtime_port > 65535 )); then
  echo "ERROR: PORT must be an explicitly assigned numeric port between 1024 and 65535." >&2
  exit 1
fi
if lsof -tiTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: assigned port $runtime_port is already occupied." >&2
  exit 1
fi

if [[ "${NODE_ENV:-production}" != production ]]; then
  export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-${NEXTAUTH_URL:-http://127.0.0.1:$runtime_port}}"
fi

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${CORS_ALLOWED_ORIGINS:?CORS_ALLOWED_ORIGINS is required}"

test -f frontend/dist/index.html || {
  echo "frontend/dist is missing; build the immutable release artifact before startup" >&2
  exit 1
}

export NODE_ENV="${NODE_ENV:-production}"
export HOST=127.0.0.1 PORT="$runtime_port"
exec node backend/src/index.js
