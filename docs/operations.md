# Operations runbook

## Release invariants

- Production uses Node.js 22–24 and PostgreSQL 14 or newer.
- Configuration comes from the environment/secret manager. `JWT_SECRET`, `ESIGN_WEBHOOK_SECRET`, and `FILING_WEBHOOK_SECRET` must each be unique, random, non-placeholder values of at least 32 characters.
- Database migration is a separate, observed release step. Startup never mutates schema or data.
- Route traffic only when `/api/health/ready` is 200 and names migration `202607200001_governed_legal_documents`.
- Connector host allowlists contain hostnames, not URLs or wildcard domains. HTTP is test-only.

## Fresh database

```sh
DATABASE_URL=postgresql://USER@HOST:5432/DB npm --prefix backend run db:migrate:deploy
DATABASE_URL=postgresql://USER@HOST:5432/DB npm --prefix backend run db:migrate:status
```

The baseline creates the inherited moving-company tables and governed document tables together. PostgreSQL triggers make audit events, document versions, reviews, and webhook receipts append-only.

## Existing database adoption

Older deployments used `prisma db push` and have no trustworthy migration ledger. Do not run the baseline against them blindly and never use `--force-reset`.

1. Stop writes, capture row counts/schema ownership, take a verified backup, and restore it into an isolated rehearsal database.
2. Compare the rehearsal schema to `backend/prisma/schema.prisma` using `prisma migrate diff --from-url ... --to-schema-datamodel ... --script`. Store the output outside the repository and have a database owner review every statement.
3. Create a deployment-specific additive migration for missing columns/tables/indexes and the append-only triggers. Never accept generated drops or lossy type changes without a separately approved data migration.
4. Apply the reviewed delta to rehearsal, run the complete test journey against a separate `_test` database, validate representative production data, and verify backups again.
5. Apply the same delta in the change window. Only after the production schema exactly matches the baseline, record adoption with `npx --prefix backend prisma migrate resolve --applied 202607200001_governed_legal_documents`.
6. Run migration status, readiness, a read-only audit-chain verification, and provider smoke checks before restoring traffic.

## Initial administrator

The one-time command refuses to run after any user exists and never prints a password:

```sh
DATABASE_URL=postgresql://USER@HOST:5432/DB \
PROVISION_INITIAL_ADMIN=true \
ADMIN_EMAIL=operator@example.com \
ADMIN_PASSWORD='supplied-through-a-secret-channel' \
ADMIN_FIRST_NAME=Initial \
ADMIN_LAST_NAME=Operator \
npm --prefix backend run db:provision
```

Subsequent users and role changes use authenticated administrator APIs. Public registration, password-reset tokens, email-verification tokens, and demo credentials are not exposed by the supported boundary.

## Backup and restore drill

Create a restricted custom-format backup and validate its catalog:

```sh
DATABASE_URL=postgresql://USER@HOST:5432/DB \
BACKUP_FILE=/secure/moving-company-$(date +%Y%m%dT%H%M%S).dump \
backend/scripts/backup.sh
```

Restore only into an isolated target first. The confirmation value deliberately includes the exact backup path:

```sh
RESTORE_DATABASE_URL=postgresql://USER@ISOLATED_HOST:5432/RESTORE_DB \
BACKUP_FILE=/secure/backup.dump \
RESTORE_CONFIRMED=restore-/secure/backup.dump \
backend/scripts/restore.sh
```

After restoration, run migrations, readiness, row-count reconciliation, checksum/audit verification, privileged-access checks, and a sampled provider reconciliation. Encrypt backups, restrict their IAM policy, log access, and test recovery-time/recovery-point objectives on a schedule.

## Session and credential incidents

Revoke every session for a user with a confirmed command:

```sh
DATABASE_URL=postgresql://USER@HOST:5432/DB USER_EMAIL=user@example.com REVOKE_CONFIRMED=true npm --prefix backend run auth:revoke
```

Rotating `JWT_SECRET` invalidates every JWT. Rotate provider tokens independently and verify least privilege. If any credential was ever committed, rotation is the first response; deleting it from the current file is insufficient. Inventory forks, CI logs, images, and deployments. A full-history purge requires repository-owner authorization, coordinated branch protection changes, force-pushing every affected ref, and instructions for all clones. Do not automate or perform that destructive rewrite during a normal application release.

## Provider failures and reconciliation

Integration attempts persist request/response hashes, provider IDs, attempt count, and sanitized failure information. A retry must use the same idempotency key and semantic request. If input changes, use a new key. Never edit failed rows to appear successful.

- Storage checksum mismatch: quarantine the provider response; do not create a document/version.
- OCR checksum mismatch: do not trust or display the extraction as completed.
- Signature request failure: document returns to `APPROVED`; the failed envelope remains visible and retryable.
- Terminal signature event: `COMPLETED` advances to `SIGNED`; decline/failure/void returns to `APPROVED` for an explicit decision.
- Filing failure: document returns to `SIGNED`; reconcile before retrying.
- Disposition failure: document returns to its prior state; storage objects and audit evidence remain.

## Retention and legal hold

Retention dates come from an approved organizational schedule. Apply a legal hold before preservation-sensitive work; release it only from an authoritative instruction. Disposition requires expired retention, no hold, a current optimistic lock, and storage confirmation. The database retains hashes, provenance, disposition reason, actor, and audit events after content deletion.

## Rollback

Application rollback is safe only while the old code tolerates the additive schema. Database migrations are forward-only by default. For a bad release, stop traffic, preserve evidence, roll back the image, and create a reviewed corrective migration. Restore a backup only when incident command explicitly accepts the data-loss window and provider-side reconciliation plan.
