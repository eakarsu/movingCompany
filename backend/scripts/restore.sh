#!/usr/bin/env sh
set -eu

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

if [ "${RESTORE_CONFIRMED:-}" != "restore-$BACKUP_FILE" ]; then
  echo "Set RESTORE_CONFIRMED=restore-$BACKUP_FILE to confirm destructive restore" >&2
  exit 1
fi

command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required" >&2; exit 1; }
test -r "$BACKUP_FILE" || { echo "Backup file is not readable: $BACKUP_FILE" >&2; exit 1; }

pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-privileges --exit-on-error "$BACKUP_FILE"
echo "Restore completed; run the documented readiness and audit-chain checks"
