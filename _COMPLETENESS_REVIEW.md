# Completeness Review: movingCompany

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 112 project files (102 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for legal/document workflow. Generated gap/demo patterns are present: it contains 102 source files and visible routes/pages in `frontend/`, `backend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Add matter-scoped permissions, document provenance, version history, privileged-access controls, and immutable audit events.
2. Integrate OCR, e-signature, filing/storage, retention/legal-hold, and authoritative template sources.
3. Require human legal review and jurisdiction/effective-date validation for generated clauses, forms, or recommendations.
4. Test redaction, conflicting versions, signer failure, access revocation, export, and retention workflows end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.
- Regression risk is high because no recognizable project-owned automated tests cover the main path.

## Evidence inspected

- `backend/src/index.js:98`
- `backend/src/routes/customViews.js:8`
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`
- `backend/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one legal/document workflow workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-20)

The recommended bounded workflow is now implemented in the current worktree. The executable product boundary exposes only provisioned-user authentication, health checks, and matter-scoped moving-claim document control; the prior AI, mock, generic operation, and gap-demo routes/pages are not mounted or routed.

### Implemented

- Added owner/legal-reviewer/contributor/viewer matter grants, privileged-document omission, optimistic locks, separately designated review, revocable JWT sessions, administrator-only user provisioning, and removal of public registration/reset/demo-credential behavior.
- Added durable PostgreSQL models and a reproducible baseline migration for matters, authoritative templates, documents, parent-linked versions, OCR results, reviews, signature envelopes, filing records, integration attempts, signed webhook receipts, retention/legal hold, and SHA-256 hash-chained audits. Database triggers prevent update/delete of audit events, versions, reviews, and webhook receipts and prevent mutation of authoritative template-version content.
- Added strict, host-allowlisted storage/retrieval/disposition, OCR, template-registry, e-signature, and filing connector contracts. Calls have timeouts, response caps, checksums, persisted idempotency/failure evidence, no production fallback, and separately HMAC-signed replay-safe signature and filing webhooks. Storage locators stay server-side; authorized retrieval revalidates the immutable checksum and uses `Cache-Control: no-store`.
- Added deterministic template merge with jurisdiction/effective-date checks at sync, generation, and review. Generated/revised template documents return to `REVIEW_PENDING`; their creator cannot review that version; only a `LEGAL_REVIEWER` grant can decide it. Signed/filed versions cannot be overwritten.
- Added legal hold, expired-retention enforcement, confirmed external disposition with retained tombstone/audit evidence, privilege-aware export manifests, and audit-chain verification.
- Replaced destructive startup with an immutable launcher that never installs, kills processes, writes environment files, migrates, resets, seeds, or prints credentials. Added guarded initial-admin/session-revocation commands, baseline adoption guidance, backup/restore scripts, incident/rollback guidance, a non-root read-only container target, separate migration target, Compose health/dependency controls, and CI gates.
- Replaced the browser route surface with one authenticated claim-document console covering matter creation/access, upload and versioning, checked retrieval, OCR, template sync/generation, legal review, signature, filing, hold/release, export/audit verification, and disposition.

### Verification evidence

- `prisma validate`, client generation, fresh `prisma migrate reset`, `prisma migrate status`, and database-to-schema diff all succeeded; the diff reported no difference.
- The PostgreSQL acceptance suite passed 2/2 top-level tests. Its governed journey exercises idempotent matter opening, owner-role reservation, privilege redaction, checked content retrieval, OCR integrity, parent-linked revision and stale-write rejection, authoritative generation, review separation, signature failure/retry and callback replay, asynchronous filing callback replay, hold/release, disposition, export redaction, access revocation, session revocation, retired-route rejection, strict connector responses, and database immutability.
- The Vite 8 production build completed successfully (75 modules; 232.42 kB JavaScript and 30.32 kB CSS before gzip). Production and development dependency audits reported 0 vulnerabilities for both backend and frontend.
- A production-mode local launch served the built frontend, returned HTTP 200 readiness for migration `202607200001_governed_legal_documents`, emitted restrictive security headers/CSP, and returned 404 for the retired AI route.
- Compose interpolation/configuration validated. A custom-format PostgreSQL backup was catalog-verified and restored into an isolated database with 1 matter, 2 documents, 4 versions, and 27 audit events; migration status remained current and a post-restore audit mutation was rejected by the append-only trigger.
- Gitleaks 8.30.1 reported no finding in the current 1.21 MB tree. The full 7-commit history scan records one redacted `generic-api-key` finding in historical `start.sh` commit `594e7380c94407126b9a4575ca835b9ee52c7a71`; its exact fingerprint is baselined so CI rejects every new finding without hiding the required rotation/history remediation.

### Remaining launch blockers

- Rotate/revoke the historically exposed credential immediately. Repository owners must authorize and coordinate any destructive full-history rewrite, force-push, fork/cache cleanup, and clone replacement; the full-history CI gate remains enforceable for every unbaselined finding while that incident is resolved.
- Configure contracted production storage, OCR, template, e-signature, and filing providers and complete vendor-sandbox/production acceptance, privacy/data-processing, residency, retention/deletion, reviewer-qualification, and jurisdiction-policy sign-off. Automated tests use real PostgreSQL and strict local HTTP contract providers, not vendor credentials.
- Rehearse the documented additive adoption procedure before applying the baseline to any database previously managed by `prisma db push`; never run the baseline blindly or use a forced reset.
- The local Docker daemon was unavailable, so an image build could not be executed here. Compose configuration passed, and the checked-in CI container job remains the required image-build evidence before release.

### Runtime acceptance (2026-07-20)

The root launcher now requires a free numeric assigned port, binds the owned backend to loopback, maps only the validator's non-production CORS origin, and resolves the original project root when executed from an isolated runtime fixture. The existing one-time bcrypt-12 provisioning command is exposed as `create-admin` and accepts the same explicit acknowledgement while retaining its refusal to overwrite any existing user. The initial 55673/6152/6153 run correctly started and provisioned but the generic verifier exhausted the app's login rate limit by trying payload shapes across all candidate users; the verifier ordering was corrected. A wholly fresh 55674/6154/6155 run then passed credentials login, database-revalidated bearer session, and authenticated `/api/auth/me` (`API_VERIFIED`, `startup_login_session_api`). Follow-up verification on PostgreSQL port 55675 applied the migration and passed both governance/connector tests; the 75-module Vite production build, launcher/script syntax, manifest parsing, and `git diff --check` also passed.
