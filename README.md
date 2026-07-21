# Moving Company claim document control

This repository now supports one bounded production workflow: govern moving-claim documents from matter opening through evidence capture, authoritative template generation, independent legal review, electronic signature, jurisdiction filing, retention, export, and disposition.

The supported HTTP boundary is intentionally small:

- `/api/auth` for provisioned-user login, session revocation, profile/password changes, and administrator user maintenance;
- `/api/legal-documents` for matter-scoped document operations and signed e-signature callbacks;
- `/api/health/live` and `/api/health/ready` for orchestration.

The prior generated operational, AI, mock, and gap-demo routes and pages remain outside the executable product boundary. No LLM is used in the supported workflow. Generated documents use deterministic template substitution and cannot progress without a separate designated legal reviewer.

## Acceptance criteria implemented

- Matter grants fail closed and distinguish owner, legal reviewer, contributor, and viewer access. Privileged documents are omitted—not merely masked—from unauthorized reads and exports.
- Every stored document has a checksum, external storage provenance, immutable parent-linked versions, optimistic locks, and hash-chained audit events protected by PostgreSQL append-only triggers.
- OCR, storage, authoritative-template, e-signature, filing, and disposition calls use strict HTTPS/host-allowlisted connector contracts, persisted idempotency attempts, timeouts, response limits, checksum validation, and visible failure states. There is no mock fallback in production.
- Template jurisdiction and effective dates are validated at synchronization, generation, and review. A document creator cannot review the same version, and only a designated `LEGAL_REVIEWER` grant may decide it.
- Signed and filed documents cannot be overwritten. Legal hold blocks disposition; retention must expire; storage must confirm deletion; metadata and audit evidence remain as a tombstone.
- End-to-end tests cover redaction, version conflicts, provider retry, access revocation, export, signed webhook replay, filing, hold/release, disposition, session revocation, migration replay, and database immutability.

This system supports legal-document operations; it does not provide legal advice. The organization remains responsible for template authority, reviewer qualifications, jurisdiction rules, retention policy, and provider contracts.

## Development verification

Prerequisites are Node.js 22–24 and PostgreSQL 14 or newer. Create a disposable database whose name ends in `_test`, then run:

```sh
npm --prefix backend ci
npm --prefix frontend ci
DATABASE_URL=postgresql://USER@localhost:5432/moving_company_test npm --prefix backend run prisma:generate
TEST_DATABASE_URL=postgresql://USER@localhost:5432/moving_company_test RESET_TEST_DATABASE=true npm --prefix backend test
npm --prefix frontend run build
```

The test runner refuses to reset a database unless both the `_test` name and explicit confirmation are present. It never seeds demo users or data.

## Production release

1. Configure secrets and connector endpoints from [.env.example](.env.example) through a secret manager; never commit the populated file.
2. Back up and perform a restore drill.
3. Apply reviewed migrations with `npm --prefix backend run db:migrate:deploy` as a separate release step.
4. Provision the first administrator once using the guarded command in [operations.md](docs/operations.md).
5. Build the frontend, then launch the immutable artifact with `./start.sh`, or build the `runtime` Docker target.
6. Require `/api/health/ready` to report migration `202607200001_governed_legal_documents` before routing traffic.

`start.sh` never installs packages, writes configuration, kills processes, migrates, resets, seeds, or prints credentials. See [operations.md](docs/operations.md) for adoption, backup/restore, incident, and rollback procedures and [connectors.md](docs/connectors.md) for external contracts.

## Repository map

- `backend/src/legal/`: governed service, validation, hashing, and connectors
- `backend/src/routes/legalDocuments.js`: authenticated workflow and signed webhook boundary
- `backend/prisma/migrations/`: reproducible baseline plus append-only database guards
- `backend/tests/`: PostgreSQL and provider-contract acceptance tests
- `frontend/src/pages/LegalDocuments.jsx`: the only authenticated product console
- `.github/workflows/ci.yml`: migration, journey, build, dependency, container, and full-history secret gates
