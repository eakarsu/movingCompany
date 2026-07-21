#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

umask 077
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump is required" >&2; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required" >&2; exit 1; }

pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges --file="$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" >/dev/null
echo "Verified PostgreSQL backup: $BACKUP_FILE"
