const assert = require('node:assert/strict');
const crypto = require('crypto');
const http = require('http');
const { after, before, test } = require('node:test');
const bcrypt = require('bcryptjs');
const request = require('supertest');

process.env.JWT_SECRET = 'tests-only-jwt-secret-64-characters-long-000000000000000000';
process.env.ESIGN_WEBHOOK_SECRET = 'tests-only-webhook-secret-64-characters-00000000000000000';
process.env.FILING_WEBHOOK_SECRET = 'tests-only-filing-webhook-secret-64-characters-00000000000';
process.env.CONNECTOR_ALLOW_HTTP = 'true';
process.env.DOCUMENT_CONNECTOR_ALLOWED_HOSTS = '127.0.0.1';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:4173';
process.env.TRUST_PROXY_HOPS = '0';

const prisma = require('../src/lib/prisma');
const { createApp } = require('../src/app');
const { createConnectors } = require('../src/legal/connectors');
const { sha256 } = require('../src/legal/crypto');
const { createLegalService } = require('../src/legal/service');

let connectorServer;
let connectorBaseUrl;
const signatureAttempts = new Map();
const storedObjects = new Map();

function json(res, status, body) {
  const value = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(value) });
  res.end(value);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 12 * 1024 * 1024) {
        reject(new Error('request too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

before(async () => {
  connectorServer = http.createServer(async (req, res) => {
    try {
      const body = await readJson(req);
      const key = String(req.headers['x-idempotency-key'] || 'missing');
      if (req.url === '/objects') {
        const content = Buffer.from(body.contentBase64, 'base64');
        const storageKey = `matters/${body.matterId}/${body.documentId}/${sha256(key).slice(0, 12)}`;
        storedObjects.set(storageKey, { contentBase64: body.contentBase64, mimeType: body.mimeType, contentHash: sha256(content) });
        return json(res, 200, {
          externalId: `stored-${sha256(key).slice(0, 12)}`,
          storageKey,
          sourceUri: `https://storage.invalid/${body.documentId}/${sha256(key).slice(0, 12)}`,
          contentHash: sha256(content),
        });
      }
      if (req.url === '/objects/retrieve') {
        const stored = storedObjects.get(body.storageKey);
        return stored ? json(res, 200, stored) : json(res, 404, { code: 'OBJECT_NOT_FOUND' });
      }
      if (req.url === '/objects/dispose') {
        for (const object of body.objects) storedObjects.delete(object.storageKey);
        return json(res, 200, { disposed: true });
      }
      if (req.url === '/extract') {
        const text = 'Verified inventory condition and claim evidence.';
        return json(res, 200, {
          externalId: `ocr-${sha256(key).slice(0, 12)}`,
          status: 'SUCCEEDED',
          text,
          confidence: 0.98,
          contentHash: sha256(text),
        });
      }
      if (req.url === '/templates/resolve') {
        const content = 'Claim {{matterNumber}} for {{customerName}} in {{jurisdiction}} dated {{currentDate}}.';
        return json(res, 200, {
          templates: [{
            templateKey: 'moving-claim-release',
            jurisdiction: body.jurisdiction,
            documentType: 'RELEASE',
            version: '2026.07',
            effectiveFrom: '2020-01-01T00:00:00.000Z',
            effectiveUntil: null,
            sourceSystem: 'test-authoritative-registry',
            sourceUri: 'https://templates.invalid/moving-claim-release/2026.07',
            content,
            contentHash: sha256(content),
          }],
        });
      }
      if (req.url === '/envelopes') {
        const attempts = (signatureAttempts.get(key) || 0) + 1;
        signatureAttempts.set(key, attempts);
        if (key.includes('retry') && attempts === 1) return json(res, 503, { code: 'TEMPORARY_OUTAGE' });
        return json(res, 200, { externalId: `envelope-${sha256(key).slice(0, 12)}`, status: 'SENT' });
      }
      if (req.url === '/filings') {
        return json(res, 200, {
          externalId: `filing-${sha256(key).slice(0, 12)}`,
          status: 'PENDING',
        });
      }
      return json(res, 404, { code: 'NOT_FOUND' });
    } catch {
      return json(res, 400, { code: 'INVALID_REQUEST' });
    }
  });
  await new Promise((resolve) => connectorServer.listen(0, '127.0.0.1', resolve));
  const address = connectorServer.address();
  connectorBaseUrl = `http://127.0.0.1:${address.port}/`;
  process.env.DOCUMENT_STORAGE_URL = connectorBaseUrl;
  process.env.OCR_PROVIDER_URL = connectorBaseUrl;
  process.env.ESIGN_PROVIDER_URL = connectorBaseUrl;
  process.env.FILING_PROVIDER_URL = connectorBaseUrl;
  process.env.TEMPLATE_REGISTRY_URL = connectorBaseUrl;
});

after(async () => {
  await prisma.$disconnect();
  if (connectorServer) await new Promise((resolve) => connectorServer.close(resolve));
});

test('governed moving-claim document journey and production boundary', async () => {
  const password = 'Valid-Test1!Password';
  const passwordHash = await bcrypt.hash(password, 4);
  const [manager, reviewer, viewer, administrator] = await Promise.all([
    prisma.user.create({ data: { email: 'manager@example.test', password: passwordHash, firstName: 'Matter', lastName: 'Owner', role: 'MANAGER', emailVerified: true } }),
    prisma.user.create({ data: { email: 'reviewer@example.test', password: passwordHash, firstName: 'Legal', lastName: 'Reviewer', role: 'STAFF', emailVerified: true } }),
    prisma.user.create({ data: { email: 'viewer@example.test', password: passwordHash, firstName: 'Limited', lastName: 'Viewer', role: 'STAFF', emailVerified: true } }),
    prisma.user.create({ data: { email: 'administrator@example.test', password: passwordHash, firstName: 'System', lastName: 'Administrator', role: 'ADMIN', emailVerified: true } }),
  ]);
  const connectors = createConnectors();
  const service = createLegalService({ prisma, connectors });

  const matter = await service.createMatter(manager, {
    title: 'Interstate damage claim release',
    jurisdiction: 'NY',
    retentionUntil: new Date('2020-01-01T00:00:00.000Z'),
    idempotencyKey: 'matter-main-0001',
  });
  const matterReplay = await service.createMatter(manager, {
    title: 'Interstate damage claim release',
    jurisdiction: 'NY',
    retentionUntil: new Date('2020-01-01T00:00:00.000Z'),
    idempotencyKey: 'matter-main-0001',
  });
  assert.equal(matterReplay.id, matter.id);

  await assert.rejects(
    service.grantAccess(manager, matter.id, { userId: reviewer.id, role: 'OWNER', canViewPrivileged: true, expectedVersion: 1 }),
    (error) => error.code === 'OWNER_ROLE_RESERVED',
  );
  await service.grantAccess(manager, matter.id, { userId: reviewer.id, role: 'LEGAL_REVIEWER', canViewPrivileged: true, expectedVersion: 1 });
  await service.grantAccess(manager, matter.id, { userId: viewer.id, role: 'VIEWER', canViewPrivileged: false, expectedVersion: 2 });

  const evidenceContent = Buffer.from('Photographic inventory evidence version one.');
  const evidence = await service.uploadDocument(manager, matter.id, {
    title: 'Privileged damage evidence',
    documentType: 'EVIDENCE',
    privileged: true,
    mimeType: 'text/plain',
    fileName: 'evidence.txt',
    contentBase64: evidenceContent.toString('base64'),
    idempotencyKey: 'evidence-upload-0001',
  });
  assert.equal(evidence.currentVersion, 1);
  const limitedMatter = await service.getMatter(viewer, matter.id);
  assert.equal(limitedMatter.documents.length, 0);
  assert.equal(limitedMatter.privilegedDocumentsRedacted, 1);

  const extraction = await service.extractDocument(manager, evidence.id, 'evidence-ocr-0001');
  assert.equal(extraction.status, 'SUCCEEDED');
  assert.equal(extraction.contentHash, sha256(extraction.extractedText));

  const revisedEvidence = await service.reviseDocument(manager, evidence.id, {
    expectedVersion: 1,
    title: 'Privileged damage evidence — corrected',
    mimeType: 'text/plain',
    fileName: 'evidence-v2.txt',
    contentBase64: Buffer.from('Photographic inventory evidence version two.').toString('base64'),
    idempotencyKey: 'evidence-revision-0002',
  });
  assert.equal(revisedEvidence.currentVersion, 2);
  assert.equal(revisedEvidence.versions[1].parentVersionId, revisedEvidence.versions[0].id);
  const retrievedEvidence = await service.getDocumentContent(manager, evidence.id);
  assert.equal(retrievedEvidence.content.toString('utf8'), 'Photographic inventory evidence version two.');
  await assert.rejects(service.getDocumentContent(viewer, evidence.id), (error) => error.code === 'PRIVILEGED_ACCESS_REQUIRED');
  await assert.rejects(
    service.reviseDocument(manager, evidence.id, {
      expectedVersion: 1,
      mimeType: 'text/plain',
      fileName: 'conflicting-v3.txt',
      contentBase64: Buffer.from('stale edit').toString('base64'),
      idempotencyKey: 'evidence-stale-0003',
    }),
    (error) => error.code === 'VERSION_CONFLICT',
  );

  const templates = await service.syncTemplates(manager, matter.id, {
    documentTypes: ['RELEASE'],
    asOf: new Date('2026-07-20T00:00:00.000Z'),
    idempotencyKey: 'template-sync-0001',
  });
  assert.equal(templates.length, 1);
  const generated = await service.generateDocument(manager, matter.id, {
    templateId: templates[0].id,
    title: 'Claim settlement release',
    variables: { customerName: 'Test Customer' },
    privileged: true,
    idempotencyKey: 'release-generate-0001',
  });
  assert.equal(generated.status, 'REVIEW_PENDING');
  await assert.rejects(
    service.reviewDocument(manager, generated.id, { expectedVersion: 1, decision: 'APPROVED', comments: 'Owner attempted legal approval.' }),
    (error) => error.code === 'LEGAL_REVIEWER_REQUIRED',
  );
  let reviewed = await service.reviewDocument(reviewer, generated.id, {
    expectedVersion: 1,
    decision: 'APPROVED',
    comments: 'Jurisdiction and effective template version verified.',
  });
  assert.equal(reviewed.status, 'APPROVED');

  const generatedRevision = await service.reviseDocument(manager, generated.id, {
    expectedVersion: 2,
    mimeType: 'text/plain',
    fileName: 'release-negotiated-v2.txt',
    contentBase64: Buffer.from('Negotiated release revision requiring renewed review.').toString('base64'),
    idempotencyKey: 'release-revision-0002',
  });
  assert.equal(generatedRevision.status, 'REVIEW_PENDING');
  reviewed = await service.reviewDocument(reviewer, generated.id, {
    expectedVersion: 3,
    decision: 'APPROVED',
    comments: 'Revised language and authoritative template basis verified.',
  });
  assert.equal(reviewed.currentVersion, 2);

  await assert.rejects(
    service.requestSignature(manager, generated.id, {
      expectedVersion: 4,
      signerEmail: 'customer@example.test',
      signerName: 'Test Customer',
      idempotencyKey: 'signature-retry-0001',
    }),
    (error) => error.code === 'CONNECTOR_REQUEST_FAILED',
  );
  let currentDocument = await prisma.legalDocument.findUnique({ where: { id: generated.id } });
  assert.equal(currentDocument.status, 'APPROVED');
  const failedEnvelope = await prisma.signatureEnvelope.findUnique({ where: { idempotencyKey: 'signature-retry-0001' } });
  assert.equal(failedEnvelope.status, 'FAILED');

  const signature = await service.requestSignature(manager, generated.id, {
    expectedVersion: currentDocument.lockVersion,
    signerEmail: 'customer@example.test',
    signerName: 'Test Customer',
    idempotencyKey: 'signature-retry-0001',
  });
  assert.equal(signature.envelope.status, 'SENT');

  const app = createApp({ prisma, legalService: service });
  const event = {
    provider: connectors.providerName('ESIGN'),
    eventId: 'event-completed-0001',
    externalId: signature.envelope.externalId,
    status: 'COMPLETED',
  };
  const rawEvent = JSON.stringify(event);
  const eventSignature = crypto.createHmac('sha256', process.env.ESIGN_WEBHOOK_SECRET).update(rawEvent).digest('hex');
  await request(app)
    .post('/api/legal-documents/webhooks/esign')
    .set('content-type', 'application/json')
    .set('x-signature', eventSignature)
    .send(rawEvent)
    .expect(202);
  await request(app)
    .post('/api/legal-documents/webhooks/esign')
    .set('content-type', 'application/json')
    .set('x-signature', eventSignature)
    .send(rawEvent)
    .expect(200);

  currentDocument = await prisma.legalDocument.findUnique({ where: { id: generated.id } });
  assert.equal(currentDocument.status, 'SIGNED');
  const filing = await service.requestFiling(manager, generated.id, {
    expectedVersion: currentDocument.lockVersion,
    filingType: 'CLAIM_RELEASE',
    idempotencyKey: 'filing-main-0001',
  });
  assert.equal(filing.document.status, 'FILING_PENDING');
  const filingEvent = {
    provider: connectors.providerName('FILING'),
    eventId: 'filing-event-completed-0001',
    externalId: filing.filing.externalId,
    status: 'FILED',
    receiptUri: 'https://filing.invalid/receipts/filing-main-0001',
  };
  const rawFilingEvent = JSON.stringify(filingEvent);
  const filingEventSignature = crypto.createHmac('sha256', process.env.FILING_WEBHOOK_SECRET).update(rawFilingEvent).digest('hex');
  await request(app)
    .post('/api/legal-documents/webhooks/filing')
    .set('content-type', 'application/json')
    .set('x-signature', filingEventSignature)
    .send(rawFilingEvent)
    .expect(202);
  await request(app)
    .post('/api/legal-documents/webhooks/filing')
    .set('content-type', 'application/json')
    .set('x-signature', filingEventSignature)
    .send(rawFilingEvent)
    .expect(200);
  currentDocument = await prisma.legalDocument.findUnique({ where: { id: generated.id } });
  assert.equal(currentDocument.status, 'FILED');

  let currentMatter = await prisma.legalMatter.findUnique({ where: { id: matter.id } });
  currentMatter = await service.setLegalHold(manager, matter.id, true, { expectedVersion: currentMatter.version, reason: 'Pending litigation preservation request.' });
  currentDocument = await prisma.legalDocument.findUnique({ where: { id: generated.id } });
  await assert.rejects(
    service.disposeDocument(manager, generated.id, { expectedVersion: currentDocument.lockVersion, reason: 'Retention completed and disposition approved.', idempotencyKey: 'dispose-main-0001' }),
    (error) => error.code === 'LEGAL_HOLD_ACTIVE',
  );
  currentMatter = await service.setLegalHold(manager, matter.id, false, { expectedVersion: currentMatter.version, reason: 'Preservation request formally released.' });
  const disposed = await service.disposeDocument(manager, generated.id, {
    expectedVersion: currentDocument.lockVersion,
    reason: 'Retention completed and disposition approved.',
    idempotencyKey: 'dispose-main-0001',
  });
  assert.equal(disposed.status, 'DISPOSED');

  const limitedExport = await service.exportMatter(viewer, matter.id);
  assert.equal(limitedExport.manifest.documents.length, 0);
  assert.equal(limitedExport.manifest.redaction.privilegedDocumentsOmitted, 2);
  await service.revokeAccess(manager, matter.id, viewer.id, { expectedVersion: currentMatter.version, reason: 'Viewer assignment ended and access was revoked.' });
  await assert.rejects(service.getMatter(viewer, matter.id), (error) => error.code === 'MATTER_NOT_FOUND');

  const audit = await service.verifyAuditChain(matter.id);
  assert.equal(audit.valid, true);
  assert.ok(audit.count >= 20);
  await assert.rejects(prisma.$executeRawUnsafe('UPDATE "LegalAuditEvent" SET "action" = \'TAMPERED\' WHERE "matterId" = $1', matter.id));
  await assert.rejects(prisma.$executeRawUnsafe('UPDATE "LegalDocumentVersion" SET "contentHash" = repeat(\'0\', 64) WHERE "documentId" = $1', generated.id));
  await assert.rejects(prisma.$executeRawUnsafe('UPDATE "LegalTemplate" SET "content" = \'tampered\' WHERE "id" = $1', templates[0].id));

  await request(app).get('/api/health/live').expect(200);
  await request(app).get('/api/health/ready').expect(200);
  await request(app).post('/api/auth/register').send({}).expect(404);
  await request(app).get('/api/legal-documents/matters').expect(401);
  const login = await request(app).post('/api/auth/login').send({ email: manager.email, password }).expect(200);
  const token = login.body.token;
  const matterResponse = await request(app).get(`/api/legal-documents/matters/${matter.id}`).set('authorization', `Bearer ${token}`).expect(200);
  assert.doesNotMatch(JSON.stringify(matterResponse.body), /"storageKey":|"sourceUri":/);
  const contentResponse = await request(app).get(`/api/legal-documents/documents/${evidence.id}/content`).set('authorization', `Bearer ${token}`).expect(200);
  assert.equal(contentResponse.text, 'Photographic inventory evidence version two.');
  assert.equal(contentResponse.headers['x-content-sha256'], sha256(contentResponse.text));
  await request(app).get('/api/auth/users').set('authorization', `Bearer ${token}`).expect(403);
  await request(app).get('/api/auth/users/directory').set('authorization', `Bearer ${token}`).expect(200);
  const adminLogin = await request(app).post('/api/auth/login').send({ email: administrator.email, password }).expect(200);
  await request(app).post('/api/auth/users').set('authorization', `Bearer ${adminLogin.body.token}`).send({
    email: 'provisioned@example.test',
    password: 'Another-Valid2!Password',
    firstName: 'Provisioned',
    lastName: 'Operator',
    role: 'STAFF',
  }).expect(201);
  await request(app).get('/api/ai/anything').set('authorization', `Bearer ${token}`).expect(404);
  await request(app).post('/api/auth/logout').set('authorization', `Bearer ${token}`).expect(200);
  await request(app).get('/api/auth/me').set('authorization', `Bearer ${token}`).expect(401);
});

test('connector responses are strict and fail closed', async () => {
  const connectors = createConnectors({
    environment: {
      DOCUMENT_STORAGE_URL: 'https://storage.example.test/',
      DOCUMENT_CONNECTOR_ALLOWED_HOSTS: 'storage.example.test',
    },
    fetchImplementation: async () => ({
      ok: true,
      text: async () => JSON.stringify({
        externalId: 'object-1',
        storageKey: 'key-1',
        sourceUri: 'https://storage.example.test/key-1',
        contentHash: '0'.repeat(64),
        unexpected: 'field',
      }),
    }),
  });
  await assert.rejects(
    connectors.store({ contentBase64: 'YQ==' }, 'strict-contract-0001'),
    (error) => error.code === 'CONNECTOR_RESPONSE_INVALID' && error.status === 502,
  );
});
