# Connector contracts

All production connectors are real HTTP services supplied by the operator. The application has no simulated success path. Each URL must be HTTPS, contain no URL credentials, and use a hostname listed exactly in `DOCUMENT_CONNECTOR_ALLOWED_HOSTS`. Redirects are rejected, requests time out, JSON responses are capped at 2 MB, and unknown response fields fail validation.

Bearer tokens are optional at the protocol layer so workload-identity gateways can be used. If a token variable is supplied, it is sent only to the configured, allowlisted origin. Provider payloads and secrets are never logged by the supported application.

Every request is `POST`, uses `Content-Type: application/json`, and includes `X-Idempotency-Key`. Providers must give the same semantic response for a repeated key and must reject a key reused for different input.

## Storage

Base variable: `DOCUMENT_STORAGE_URL`; token: `DOCUMENT_STORAGE_TOKEN`.

- `objects` receives matter/document identifiers, filename, MIME type, byte size, SHA-256 checksum, and base64 content. It returns `{ externalId, storageKey, sourceUri, contentHash }`. The returned checksum must match before metadata is committed.
- `objects/retrieve` receives the internal storage key and expected checksum for one authorized immutable version. It returns `{ contentBase64, mimeType, contentHash }`. The application rechecks base64 canonical form, size, MIME type, and SHA-256 before returning bytes with `Cache-Control: no-store`; storage locators never reach the browser.
- `objects/dispose` receives all immutable `{ storageKey, contentHash }` objects for a document. It returns `{ disposed: true }`. Anything else leaves disposition incomplete.

The storage provider must enforce encryption, tenant isolation, regional/data-residency policy, retention semantics, malware controls, durable idempotency, and deletion evidence under the operator’s contract.

## OCR

Base variable: `OCR_PROVIDER_URL`; token: `OCR_PROVIDER_TOKEN`; path: `extract`.

Input references one immutable stored version. A success response is `{ externalId, status: "SUCCEEDED", text, confidence?, contentHash }`, where `contentHash` is SHA-256 of UTF-8 `text`. A failure is `{ externalId, status: "FAILED", failureCode?, failureMessage? }`. Extracted text remains matter-scoped and inherits privileged-document access.

## Authoritative templates

Base variable: `TEMPLATE_REGISTRY_URL`; token: `TEMPLATE_REGISTRY_TOKEN`; path: `templates/resolve`.

Input is `{ jurisdiction, documentTypes, asOf }`. Output is `{ templates: [...] }`; each strict template has `templateKey`, `jurisdiction`, `documentType`, `version`, ISO `effectiveFrom`, nullable ISO `effectiveUntil`, `sourceSystem`, `sourceUri`, `content`, and the SHA-256 `contentHash`.

Out-of-jurisdiction, out-of-type, ineffective, revoked, checksum-mismatched, or malformed templates fail closed. The registry is the authoritative source; application synchronization is not legal approval.

## Electronic signature

Base variable: `ESIGN_PROVIDER_URL`; token: `ESIGN_PROVIDER_TOKEN`; request path: `envelopes`.

The application sends the immutable source URI/checksum, document version, and signer identity only after independent approval. The provider returns `{ externalId, status: "PENDING" | "SENT" }`.

Completion callbacks use `POST /api/legal-documents/webhooks/esign`. The exact raw JSON bytes are signed with HMAC-SHA256 using `ESIGN_WEBHOOK_SECRET`; send the hexadecimal digest in `X-Signature` (an optional `sha256=` prefix is accepted). The signed strict body is:

```json
{"provider":"configured-hostname","eventId":"durable-unique-id","externalId":"envelope-id","status":"COMPLETED"}
```

`DECLINED`, `FAILED`, and `VOIDED` are also accepted. Event IDs are append-only and replay-safe; reusing an ID with different content is rejected.

## Filing

Base variable: `FILING_PROVIDER_URL`; token: `FILING_PROVIDER_TOKEN`; path: `filings`.

Only a completed signed current version is sent. Input includes document/version, jurisdiction, filing type, source URI, and checksum. Output is `{ externalId, status: "PENDING" | "FILED", receiptUri? }`. An immediate `FILED` advances the document; malformed or failed calls restore the signed state and preserve the failed attempt for an explicit retry.

Asynchronous completion uses `POST /api/legal-documents/webhooks/filing` and the same raw-body HMAC scheme with the separate `FILING_WEBHOOK_SECRET`. Its strict body contains `provider`, durable `eventId`, `externalId`, `status` (`FILED`, `REJECTED`, or `FAILED`), and an optional HTTPS `receiptUri`. A filed event advances the current version; a terminal rejection/failure returns it to `SIGNED` for an explicit operator decision.

## Privacy and failure handling

Perform provider due diligence before sending production data: data processing agreement, subprocessor inventory, breach terms, retention/deletion, training exclusion, residency, access logs, and incident contacts. Use separate least-privilege credentials per connector and environment. Rotate credentials without changing URLs, monitor `IntegrationAttempt` failures, and reconcile provider dashboards against persisted external IDs. Never enable `CONNECTOR_ALLOW_HTTP` outside disposable local tests.
