const express = require('express');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const { requireSecret } = require('../config');
const { requestHash, sha256, verifyHmac } = require('../legal/crypto');
const { LegalWorkflowError } = require('../legal/errors');
const schemas = require('../legal/schemas');

const signatureEvent = z.object({
  provider: z.string().trim().min(1).max(120),
  eventId: z.string().trim().min(1).max(300),
  externalId: z.string().trim().min(1).max(300),
  status: z.enum(['COMPLETED', 'DECLINED', 'FAILED', 'VOIDED']),
}).strict();

const filingEvent = z.object({
  provider: z.string().trim().min(1).max(120),
  eventId: z.string().trim().min(1).max(300),
  externalId: z.string().trim().min(1).max(300),
  status: z.enum(['FILED', 'REJECTED', 'FAILED']),
  receiptUri: z.string().url().max(2000).optional(),
}).strict();

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new LegalWorkflowError('VALIDATION_ERROR', 'Request validation failed', 422, result.error.flatten());
  }
  return result.data;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

function sanitizeTemplate(template) {
  if (!template) return template;
  const { content, sourceUri, ...safe } = template;
  return { ...safe, sourceUriHash: sourceUri ? sha256(sourceUri) : null };
}

function sanitizeMetadata(value) {
  if (Array.isArray(value)) return value.map(sanitizeMetadata);
  if (!value || typeof value !== 'object') return value;
  const safe = {};
  for (const [key, item] of Object.entries(value)) {
    if (['sourceUri', 'storageKey', 'receiptUri'].includes(key) && typeof item === 'string') {
      safe[`${key}Hash`] = sha256(item);
    } else {
      safe[key] = sanitizeMetadata(item);
    }
  }
  return safe;
}

function sanitizeDocument(document) {
  if (!document) return document;
  return {
    ...document,
    versions: document.versions && document.versions.map(({ storageKey, sourceUri, provenance, ...version }) => {
      const { sourceUri: provenanceSourceUri, storageExternalId, ...safeProvenance } = provenance && typeof provenance === 'object' && !Array.isArray(provenance) ? provenance : {};
      return {
        ...version,
        provenance: {
          ...safeProvenance,
          sourceUriHash: provenanceSourceUri ? sha256(provenanceSourceUri) : undefined,
          storageExternalIdHash: storageExternalId ? sha256(storageExternalId) : undefined,
        },
        storageKeyHash: sha256(storageKey),
        sourceUriHash: sourceUri ? sha256(sourceUri) : null,
      };
    }),
    template: sanitizeTemplate(document.template),
  };
}

function sanitizeMatter(matter) {
  return {
    ...matter,
    documents: matter.documents.map(sanitizeDocument),
    auditEvents: matter.auditEvents && matter.auditEvents.map((event) => ({ ...event, payload: sanitizeMetadata(event.payload) })),
  };
}

function createLegalDocumentsRouter(service) {
  const router = express.Router();

  router.post('/webhooks/esign', asyncRoute(async (req, res) => {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const secret = requireSecret('ESIGN_WEBHOOK_SECRET');
    if (!verifyHmac(rawBody, req.get('x-signature'), secret)) {
      throw new LegalWorkflowError('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid', 401);
    }
    const event = parse(signatureEvent, req.body);
    const result = await service.applySignatureEvent({ ...event, payloadHash: requestHash(req.body) });
    res.status(result.replayed ? 200 : 202).json(result);
  }));

  router.post('/webhooks/filing', asyncRoute(async (req, res) => {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const secret = requireSecret('FILING_WEBHOOK_SECRET');
    if (!verifyHmac(rawBody, req.get('x-signature'), secret)) {
      throw new LegalWorkflowError('WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid', 401);
    }
    const event = parse(filingEvent, req.body);
    const result = await service.applyFilingEvent({ ...event, payloadHash: requestHash(req.body) });
    res.status(result.replayed ? 200 : 202).json(result);
  }));

  router.use(authenticate);

  router.get('/matters', asyncRoute(async (req, res) => {
    res.json({ matters: await service.listMatters(req.user) });
  }));

  router.post('/matters', asyncRoute(async (req, res) => {
    const matter = await service.createMatter(req.user, parse(schemas.createMatter, req.body));
    res.status(201).json({ matter });
  }));

  router.get('/matters/:matterId', asyncRoute(async (req, res) => {
    res.json({ matter: sanitizeMatter(await service.getMatter(req.user, req.params.matterId)) });
  }));

  router.post('/matters/:matterId/access', asyncRoute(async (req, res) => {
    const grant = await service.grantAccess(req.user, req.params.matterId, parse(schemas.grantAccess, req.body));
    res.status(201).json({ grant });
  }));

  router.delete('/matters/:matterId/access/:userId', asyncRoute(async (req, res) => {
    const grant = await service.revokeAccess(req.user, req.params.matterId, req.params.userId, parse(schemas.revokeAccess, req.body));
    res.json({ grant });
  }));

  router.post('/matters/:matterId/documents/upload', asyncRoute(async (req, res) => {
    const document = await service.uploadDocument(req.user, req.params.matterId, parse(schemas.uploadDocument, req.body));
    res.status(201).json({ document: sanitizeDocument(document) });
  }));

  router.post('/documents/:documentId/ocr', asyncRoute(async (req, res) => {
    const input = parse(z.object({ idempotencyKey: schemas.idempotencyKey }).strict(), req.body);
    const extraction = await service.extractDocument(req.user, req.params.documentId, input.idempotencyKey);
    res.status(201).json({ extraction });
  }));

  router.get('/documents/:documentId/content', asyncRoute(async (req, res) => {
    const result = await service.getDocumentContent(req.user, req.params.documentId);
    const extensions = { 'application/pdf': 'pdf', 'text/plain': 'txt', 'image/jpeg': 'jpg', 'image/png': 'png' };
    res.set({
      'cache-control': 'no-store',
      'content-disposition': `attachment; filename="document-${result.documentId}-v${result.version}.${extensions[result.mimeType] || 'bin'}"`,
      'content-type': result.mimeType,
      'x-content-sha256': result.contentHash,
    });
    res.send(result.content);
  }));

  router.post('/documents/:documentId/versions', asyncRoute(async (req, res) => {
    const document = await service.reviseDocument(req.user, req.params.documentId, parse(schemas.reviseDocument, req.body));
    res.status(201).json({ document: sanitizeDocument(document) });
  }));

  router.get('/matters/:matterId/templates', asyncRoute(async (req, res) => {
    res.json({ templates: (await service.listTemplates(req.user, req.params.matterId)).map(sanitizeTemplate) });
  }));

  router.post('/matters/:matterId/templates/sync', asyncRoute(async (req, res) => {
    const templates = await service.syncTemplates(req.user, req.params.matterId, parse(schemas.syncTemplates, req.body));
    res.json({ templates: templates.map(sanitizeTemplate) });
  }));

  router.post('/matters/:matterId/documents/generate', asyncRoute(async (req, res) => {
    const document = await service.generateDocument(req.user, req.params.matterId, parse(schemas.generateDocument, req.body));
    res.status(201).json({ document: sanitizeDocument(document) });
  }));

  router.post('/documents/:documentId/review', asyncRoute(async (req, res) => {
    const document = await service.reviewDocument(req.user, req.params.documentId, parse(schemas.reviewDocument, req.body));
    res.json({ document: sanitizeDocument(document) });
  }));

  router.post('/documents/:documentId/signature', asyncRoute(async (req, res) => {
    const result = await service.requestSignature(req.user, req.params.documentId, parse(schemas.requestSignature, req.body));
    res.status(result.replayed ? 200 : 202).json({ ...result, document: sanitizeDocument(result.document) });
  }));

  router.post('/documents/:documentId/filing', asyncRoute(async (req, res) => {
    const result = await service.requestFiling(req.user, req.params.documentId, parse(schemas.requestFiling, req.body));
    res.status(result.replayed ? 200 : 202).json({ ...result, document: sanitizeDocument(result.document) });
  }));

  router.post('/matters/:matterId/legal-hold', asyncRoute(async (req, res) => {
    const matter = await service.setLegalHold(req.user, req.params.matterId, true, parse(schemas.legalHold, req.body));
    res.json({ matter });
  }));

  router.post('/matters/:matterId/legal-hold/release', asyncRoute(async (req, res) => {
    const matter = await service.setLegalHold(req.user, req.params.matterId, false, parse(schemas.legalHold, req.body));
    res.json({ matter });
  }));

  router.post('/documents/:documentId/disposition', asyncRoute(async (req, res) => {
    const document = await service.disposeDocument(req.user, req.params.documentId, parse(schemas.disposition, req.body));
    res.json({ document: sanitizeDocument(document) });
  }));

  router.get('/matters/:matterId/export', asyncRoute(async (req, res) => {
    const result = await service.exportMatter(req.user, req.params.matterId);
    res.set('content-disposition', `attachment; filename="matter-${req.params.matterId}.json"`);
    res.json(result);
  }));

  router.get('/matters/:matterId/audit/verify', asyncRoute(async (req, res) => {
    await service.getMatter(req.user, req.params.matterId);
    res.json(await service.verifyAuditChain(req.params.matterId));
  }));

  return router;
}

module.exports = { createLegalDocumentsRouter };
