const crypto = require('crypto');
const { LegalWorkflowError } = require('./errors');
const { canonicalJson, requestHash, sha256 } = require('./crypto');
const { createConnectors } = require('./connectors');

const MUTATION_ROLES = new Set(['ADMIN', 'MANAGER']);
const DOCUMENT_WRITERS = new Set(['OWNER', 'CONTRIBUTOR']);
const MATTER_MANAGERS = new Set(['OWNER']);
const LEGAL_REVIEWERS = new Set(['LEGAL_REVIEWER']);
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'text/plain', 'image/jpeg', 'image/png']);
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function legalError(code, message, status = 400, details) {
  return new LegalWorkflowError(code, message, status, details);
}

function isUniqueError(error) {
  return error && error.code === 'P2002';
}

function addYears(date, years) {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function normalizeJurisdiction(value) {
  return String(value).trim().toUpperCase();
}

function decodeDocument(contentBase64) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(contentBase64) || contentBase64.length % 4 === 1) {
    throw legalError('DOCUMENT_CONTENT_INVALID', 'Document content must be valid base64', 422);
  }
  const content = Buffer.from(contentBase64, 'base64');
  if (content.length === 0 || content.length > MAX_DOCUMENT_BYTES) {
    throw legalError('DOCUMENT_SIZE_INVALID', 'Document size must be between 1 byte and 10 MB', 413);
  }
  const normalizedInput = contentBase64.replace(/=+$/, '');
  if (content.toString('base64').replace(/=+$/, '') !== normalizedInput) {
    throw legalError('DOCUMENT_CONTENT_INVALID', 'Document content must be canonical base64', 422);
  }
  return content;
}

function safeFileName(value) {
  const name = String(value).trim();
  if (name.includes('/') || name.includes('\\') || /[\x00-\x1f\x7f]/.test(name)) {
    throw legalError('FILE_NAME_INVALID', 'File name must not contain paths or control characters', 422);
  }
  return name;
}

function publicDocument(document, canViewPrivileged) {
  if (document.privileged && !canViewPrivileged) return null;
  return document;
}

function serializeEvent(event) {
  return { ...event, id: event.id.toString() };
}

function exportProvenance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const { sourceUri, storageExternalId, ...safe } = value;
  return {
    ...safe,
    sourceUriHash: sourceUri ? sha256(sourceUri) : undefined,
    storageExternalIdHash: storageExternalId ? sha256(storageExternalId) : undefined,
  };
}

function createLegalService({ prisma, connectors = createConnectors() }) {
  if (!prisma) throw new Error('Prisma client is required');

  async function appendAudit(tx, { matterId, actorId, action, entityType, entityId, payload }) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${matterId}))::text AS locked`;
    const previous = await tx.legalAuditEvent.findFirst({
      where: { matterId },
      orderBy: { id: 'desc' },
      select: { eventHash: true },
    });
    const createdAt = new Date();
    const material = {
      matterId,
      actorId,
      action,
      entityType,
      entityId,
      payload,
      previousHash: previous ? previous.eventHash : null,
      createdAt: createdAt.toISOString(),
    };
    return tx.legalAuditEvent.create({
      data: {
        matterId,
        actorId,
        action,
        entityType,
        entityId,
        payload,
        previousHash: material.previousHash,
        eventHash: sha256(canonicalJson(material)),
        createdAt,
      },
    });
  }

  async function accessFor(client, matterId, actor, { roles, privileged = false } = {}) {
    const matter = await client.legalMatter.findUnique({
      where: { id: matterId },
      include: {
        accessGrants: {
          where: { userId: actor.id, revokedAt: null },
          take: 1,
        },
      },
    });
    if (!matter) throw legalError('MATTER_NOT_FOUND', 'Matter not found', 404);
    const grant = matter.accessGrants[0];
    const role = matter.ownerId === actor.id ? 'OWNER' : grant && grant.role;
    if (!role) throw legalError('MATTER_NOT_FOUND', 'Matter not found', 404);
    if (roles && !roles.has(role)) {
      throw legalError('MATTER_ACCESS_DENIED', 'This matter role cannot perform the requested action', 403);
    }
    const canViewPrivileged = role === 'OWNER' || role === 'LEGAL_REVIEWER' || Boolean(grant && grant.canViewPrivileged);
    if (privileged && !canViewPrivileged) {
      throw legalError('PRIVILEGED_ACCESS_REQUIRED', 'Privileged document access is required', 403);
    }
    return { matter, grant, role, canViewPrivileged };
  }

  async function documentAccess(client, documentId, actor, options = {}) {
    const document = await client.legalDocument.findUnique({
      where: { id: documentId },
      include: {
        versions: { orderBy: { version: 'asc' } },
        extractions: { orderBy: { createdAt: 'asc' } },
        reviews: { orderBy: { reviewedAt: 'asc' } },
        signatureEnvelopes: { orderBy: { requestedAt: 'asc' } },
        filings: { orderBy: { requestedAt: 'asc' } },
        template: true,
      },
    });
    if (!document) throw legalError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    const access = await accessFor(client, document.matterId, actor, {
      roles: options.roles,
      privileged: document.privileged,
    });
    return { document, access };
  }

  async function createMatter(actor, input) {
    if (!MUTATION_ROLES.has(actor.role)) {
      throw legalError('ROLE_NOT_ALLOWED', 'Only administrators and managers may open matters', 403);
    }
    const normalized = {
      title: input.title.trim(),
      jurisdiction: normalizeJurisdiction(input.jurisdiction),
      jobId: input.jobId || null,
      claimId: input.claimId || null,
      retentionUntil: input.retentionUntil || addYears(new Date(), 7),
    };
    const creationHash = requestHash({ ...normalized, retentionUntil: normalized.retentionUntil.toISOString(), actorId: actor.id });
    const replay = await prisma.legalMatter.findUnique({ where: { creationKey: input.idempotencyKey } });
    if (replay) {
      if (replay.creationHash !== creationHash || replay.ownerId !== actor.id) {
        throw legalError('IDEMPOTENCY_CONFLICT', 'Matter idempotency key was already used for different input', 409);
      }
      return replay;
    }
    if (normalized.claimId) {
      const claim = await prisma.claim.findUnique({ where: { id: normalized.claimId } });
      if (!claim) throw legalError('CLAIM_NOT_FOUND', 'Linked claim not found', 422);
      if (normalized.jobId && claim.jobId !== normalized.jobId) {
        throw legalError('MATTER_LINK_CONFLICT', 'Claim and job do not belong together', 422);
      }
      normalized.jobId = normalized.jobId || claim.jobId;
    } else if (normalized.jobId && !(await prisma.job.findUnique({ where: { id: normalized.jobId }, select: { id: true } }))) {
      throw legalError('JOB_NOT_FOUND', 'Linked job not found', 422);
    }
    const id = crypto.randomUUID();
    const matterNumber = `MAT-${new Date().getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`;
    try {
      return await prisma.$transaction(async (tx) => {
        const matter = await tx.legalMatter.create({
          data: {
            id,
            matterNumber,
            creationKey: input.idempotencyKey,
            creationHash,
            title: normalized.title,
            jurisdiction: normalized.jurisdiction,
            ownerId: actor.id,
            jobId: normalized.jobId,
            claimId: normalized.claimId,
            retentionUntil: normalized.retentionUntil,
          },
        });
        await tx.matterAccessGrant.create({
          data: {
            matterId: id,
            userId: actor.id,
            role: 'OWNER',
            canViewPrivileged: true,
            grantedById: actor.id,
          },
        });
        await appendAudit(tx, {
          matterId: id,
          actorId: actor.id,
          action: 'MATTER_OPENED',
          entityType: 'MATTER',
          entityId: id,
          payload: {
            matterNumber,
            title: normalized.title,
            jurisdiction: normalized.jurisdiction,
            jobId: normalized.jobId,
            claimId: normalized.claimId,
            retentionUntil: normalized.retentionUntil.toISOString(),
          },
        });
        return matter;
      });
    } catch (error) {
      if (!isUniqueError(error)) throw error;
      const existing = await prisma.legalMatter.findUnique({ where: { creationKey: input.idempotencyKey } });
      if (!existing || existing.creationHash !== creationHash || existing.ownerId !== actor.id) {
        throw legalError('IDEMPOTENCY_CONFLICT', 'Matter idempotency key was already used for different input', 409);
      }
      return existing;
    }
  }

  async function listMatters(actor) {
    return prisma.legalMatter.findMany({
      where: {
        OR: [
          { ownerId: actor.id },
          { accessGrants: { some: { userId: actor.id, revokedAt: null } } },
        ],
      },
      include: {
        _count: { select: { documents: true } },
        accessGrants: { where: { userId: actor.id, revokedAt: null }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async function getMatter(actor, matterId) {
    const access = await accessFor(prisma, matterId, actor);
    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      include: {
        documents: {
          include: { versions: { orderBy: { version: 'asc' } }, reviews: true, extractions: true },
          orderBy: { createdAt: 'asc' },
        },
        accessGrants: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } } } },
        auditEvents: { orderBy: { id: 'asc' } },
      },
    });
    return {
      ...matter,
      documents: matter.documents.map((document) => publicDocument(document, access.canViewPrivileged)).filter(Boolean),
      accessGrants: MATTER_MANAGERS.has(access.role) ? matter.accessGrants : undefined,
      auditEvents: access.canViewPrivileged ? matter.auditEvents.map(serializeEvent) : undefined,
      privilegedDocumentsRedacted: matter.documents.filter((document) => document.privileged && !access.canViewPrivileged).length,
      currentAccess: { role: access.role, canViewPrivileged: access.canViewPrivileged },
    };
  }

  async function grantAccess(actor, matterId, input) {
    const access = await accessFor(prisma, matterId, actor, { roles: MATTER_MANAGERS });
    const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, isActive: true } });
    if (!target || !target.isActive) throw legalError('USER_NOT_AVAILABLE', 'Target user is missing or inactive', 422);
    if (input.userId === access.matter.ownerId && input.role !== 'OWNER') {
      throw legalError('OWNER_ROLE_IMMUTABLE', 'Matter owner role cannot be downgraded', 409);
    }
    if (input.role === 'OWNER' && input.userId !== access.matter.ownerId) {
      throw legalError('OWNER_ROLE_RESERVED', 'Only the recorded matter owner may hold the OWNER role', 409);
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.legalMatter.updateMany({
        where: { id: matterId, version: input.expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Matter version is stale', 409);
      const grant = await tx.matterAccessGrant.upsert({
        where: { matterId_userId: { matterId, userId: input.userId } },
        update: {
          role: input.role,
          canViewPrivileged: input.canViewPrivileged,
          grantedById: actor.id,
          grantedAt: new Date(),
          revokedAt: null,
          revokedById: null,
          revokeReason: null,
          version: { increment: 1 },
        },
        create: {
          matterId,
          userId: input.userId,
          role: input.role,
          canViewPrivileged: input.canViewPrivileged,
          grantedById: actor.id,
        },
      });
      await appendAudit(tx, {
        matterId,
        actorId: actor.id,
        action: 'MATTER_ACCESS_GRANTED',
        entityType: 'ACCESS_GRANT',
        entityId: grant.id,
        payload: { userId: input.userId, role: input.role, canViewPrivileged: input.canViewPrivileged },
      });
      return grant;
    });
  }

  async function revokeAccess(actor, matterId, userId, input) {
    const access = await accessFor(prisma, matterId, actor, { roles: MATTER_MANAGERS });
    if (userId === access.matter.ownerId) throw legalError('OWNER_ACCESS_REQUIRED', 'Matter owner access cannot be revoked', 409);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.legalMatter.updateMany({
        where: { id: matterId, version: input.expectedVersion },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Matter version is stale', 409);
      const grant = await tx.matterAccessGrant.findUnique({ where: { matterId_userId: { matterId, userId } } });
      if (!grant || grant.revokedAt) throw legalError('ACCESS_GRANT_NOT_FOUND', 'Active access grant not found', 404);
      const revoked = await tx.matterAccessGrant.update({
        where: { id: grant.id },
        data: {
          revokedAt: new Date(),
          revokedById: actor.id,
          revokeReason: input.reason,
          version: { increment: 1 },
        },
      });
      await appendAudit(tx, {
        matterId,
        actorId: actor.id,
        action: 'MATTER_ACCESS_REVOKED',
        entityType: 'ACCESS_GRANT',
        entityId: grant.id,
        payload: { userId, reason: input.reason },
      });
      return revoked;
    });
  }

  async function integrationAttempt({ matterId, entityId, operation, key, request, invoke, metadata = (value) => value, repeatOnReplay = false }) {
    const hash = requestHash(request);
    let attempt = await prisma.integrationAttempt.findUnique({ where: { idempotencyKey: key } });
    let created = false;
    if (!attempt) {
      try {
        attempt = await prisma.integrationAttempt.create({
          data: { matterId, entityId, operation, idempotencyKey: key, requestHash: hash },
        });
        created = true;
      } catch (error) {
        if (!isUniqueError(error)) throw error;
        attempt = await prisma.integrationAttempt.findUnique({ where: { idempotencyKey: key } });
      }
    }
    if (!attempt || attempt.matterId !== matterId || attempt.operation !== operation || attempt.requestHash !== hash) {
      throw legalError('IDEMPOTENCY_CONFLICT', 'Integration idempotency key was already used for different input', 409);
    }
    if (attempt.status === 'SUCCEEDED' && !repeatOnReplay) {
      return { replayed: true, result: attempt.responseMetadata, attempt };
    }
    if (!created && attempt.status === 'PENDING' && attempt.attemptCount > 0) {
      throw legalError('INTEGRATION_IN_PROGRESS', 'An integration request with this key is already in progress', 409);
    }
    await prisma.integrationAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'PENDING',
        attemptCount: { increment: 1 },
        failureCode: null,
        failureMessage: null,
      },
    });
    try {
      const result = await invoke();
      const responseMetadata = metadata(result);
      attempt = await prisma.integrationAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUCCEEDED',
          responseHash: requestHash(result),
          responseMetadata,
          externalId: result.externalId || null,
        },
      });
      return { replayed: false, result, attempt };
    } catch (error) {
      const code = error.code || 'CONNECTOR_FAILURE';
      const message = error.message ? String(error.message).slice(0, 1000) : 'Connector request failed';
      await prisma.integrationAttempt.update({
        where: { id: attempt.id },
        data: { status: 'FAILED', failureCode: code, failureMessage: message },
      });
      throw error;
    }
  }

  async function uploadDocument(actor, matterId, input) {
    await accessFor(prisma, matterId, actor, { roles: DOCUMENT_WRITERS, privileged: input.privileged });
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw legalError('MIME_TYPE_NOT_ALLOWED', 'Only PDF, plain text, JPEG, and PNG documents are accepted', 422);
    }
    const fileName = safeFileName(input.fileName);
    const content = decodeDocument(input.contentBase64);
    const contentHash = sha256(content);
    const existingAttempt = await prisma.integrationAttempt.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    const documentId = existingAttempt && existingAttempt.entityId ? existingAttempt.entityId : crypto.randomUUID();
    const request = {
      matterId,
      documentId,
      fileName,
      mimeType: input.mimeType,
      byteSize: content.length,
      contentHash,
    };
    const stored = await integrationAttempt({
      matterId,
      entityId: documentId,
      operation: 'STORE',
      key: input.idempotencyKey,
      request,
      invoke: () => connectors.store({ ...request, contentBase64: input.contentBase64 }, input.idempotencyKey),
      metadata: (result) => result,
    });
    if (!stored.result || stored.result.contentHash !== contentHash) {
      throw legalError('STORAGE_INTEGRITY_FAILURE', 'Storage provider checksum did not match the uploaded document', 502);
    }
    const existing = await prisma.legalDocument.findUnique({ where: { id: documentId }, include: { versions: true } });
    if (existing) return existing;
    return prisma.$transaction(async (tx) => {
      const matter = await tx.legalMatter.findUnique({ where: { id: matterId } });
      const document = await tx.legalDocument.create({
        data: {
          id: documentId,
          matterId,
          title: input.title,
          documentType: input.documentType,
          privileged: input.privileged,
          currentVersion: 1,
          retentionUntil: matter.retentionUntil,
          createdById: actor.id,
          versions: {
            create: {
              version: 1,
              source: 'UPLOAD',
              storageProvider: connectors.providerName('STORAGE'),
              storageKey: stored.result.storageKey,
              sourceUri: stored.result.sourceUri,
              mimeType: input.mimeType,
              byteSize: content.length,
              contentHash,
              provenance: {
                originalFileName: fileName,
                receivedFrom: actor.id,
                storageExternalId: stored.result.externalId,
                idempotencyKey: input.idempotencyKey,
              },
              createdById: actor.id,
            },
          },
        },
        include: { versions: true },
      });
      await appendAudit(tx, {
        matterId,
        actorId: actor.id,
        action: 'DOCUMENT_UPLOADED',
        entityType: 'DOCUMENT',
        entityId: document.id,
        payload: { documentType: input.documentType, privileged: input.privileged, version: 1, contentHash, mimeType: input.mimeType, byteSize: content.length },
      });
      return document;
    });
  }

  async function reviseDocument(actor, documentId, input) {
    const { document } = await documentAccess(prisma, documentId, actor, { roles: DOCUMENT_WRITERS });
    if (document.lockVersion !== input.expectedVersion) {
      throw legalError('VERSION_CONFLICT', 'Document version is stale', 409);
    }
    if (!['DRAFT', 'REVIEW_PENDING', 'REJECTED', 'APPROVED'].includes(document.status)) {
      throw legalError('DOCUMENT_REVISION_BLOCKED', 'Documents in signature, filing, or disposition states cannot be revised', 409);
    }
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw legalError('MIME_TYPE_NOT_ALLOWED', 'Only PDF, plain text, JPEG, and PNG documents are accepted', 422);
    }
    const fileName = safeFileName(input.fileName);
    const content = decodeDocument(input.contentBase64);
    const contentHash = sha256(content);
    const replay = document.versions.find((version) => {
      const provenance = version.provenance && typeof version.provenance === 'object' ? version.provenance : {};
      return provenance.idempotencyKey === input.idempotencyKey;
    });
    if (replay) {
      const provenance = replay.provenance && typeof replay.provenance === 'object' ? replay.provenance : {};
      if (replay.contentHash !== contentHash || replay.mimeType !== input.mimeType || provenance.originalFileName !== fileName) {
        throw legalError('IDEMPOTENCY_CONFLICT', 'Revision idempotency key was already used for different input', 409);
      }
      return document;
    }
    const nextVersion = document.currentVersion + 1;
    const current = document.versions.find((version) => version.version === document.currentVersion);
    const request = {
      matterId: document.matterId,
      documentId,
      parentVersionId: current.id,
      version: nextVersion,
      fileName,
      mimeType: input.mimeType,
      byteSize: content.length,
      contentHash,
    };
    const stored = await integrationAttempt({
      matterId: document.matterId,
      entityId: documentId,
      operation: 'STORE',
      key: input.idempotencyKey,
      request,
      invoke: () => connectors.store({ ...request, contentBase64: input.contentBase64 }, input.idempotencyKey),
      metadata: (result) => result,
    });
    if (!stored.result || stored.result.contentHash !== contentHash) {
      throw legalError('STORAGE_INTEGRITY_FAILURE', 'Storage provider checksum did not match the revised document', 502);
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.legalDocument.updateMany({
        where: {
          id: documentId,
          currentVersion: document.currentVersion,
          lockVersion: input.expectedVersion,
          status: document.status,
        },
        data: {
          title: input.title || document.title,
          currentVersion: nextVersion,
          status: document.templateId ? 'REVIEW_PENDING' : 'DRAFT',
          lockVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Document version is stale', 409);
      const version = await tx.legalDocumentVersion.create({
        data: {
          documentId,
          version: nextVersion,
          source: 'UPLOAD',
          parentVersionId: current.id,
          storageProvider: connectors.providerName('STORAGE'),
          storageKey: stored.result.storageKey,
          sourceUri: stored.result.sourceUri,
          mimeType: input.mimeType,
          byteSize: content.length,
          contentHash,
          provenance: {
            originalFileName: fileName,
            receivedFrom: actor.id,
            storageExternalId: stored.result.externalId,
            idempotencyKey: input.idempotencyKey,
            ...(document.template ? {
              templateId: document.template.id,
              templateVersion: document.template.version,
              templateHash: document.template.contentHash,
            } : {}),
          },
          createdById: actor.id,
        },
      });
      await appendAudit(tx, {
        matterId: document.matterId,
        actorId: actor.id,
        action: 'DOCUMENT_VERSION_ADDED',
        entityType: 'DOCUMENT_VERSION',
        entityId: version.id,
        payload: {
          documentId,
          version: nextVersion,
          parentVersionId: current.id,
          contentHash,
          mimeType: input.mimeType,
          byteSize: content.length,
          reviewReset: Boolean(document.templateId),
        },
      });
      return tx.legalDocument.findUnique({
        where: { id: documentId },
        include: { versions: { orderBy: { version: 'asc' } }, reviews: true, template: true },
      });
    });
  }

  async function extractDocument(actor, documentId, idempotencyKeyValue) {
    const { document } = await documentAccess(prisma, documentId, actor, { roles: DOCUMENT_WRITERS });
    if (document.status === 'DISPOSED') throw legalError('DOCUMENT_DISPOSED', 'Disposed documents cannot be processed', 409);
    const version = document.versions.find((item) => item.version === document.currentVersion);
    const request = {
      matterId: document.matterId,
      documentId,
      versionId: version.id,
      sourceUri: version.sourceUri,
      contentHash: version.contentHash,
      mimeType: version.mimeType,
    };
    const operation = await integrationAttempt({
      matterId: document.matterId,
      entityId: documentId,
      operation: 'OCR',
      key: idempotencyKeyValue,
      request,
      invoke: () => connectors.extract(request, idempotencyKeyValue),
      repeatOnReplay: true,
      metadata: (result) => ({ externalId: result.externalId, status: result.status, contentHash: result.contentHash || null }),
    });
    const result = operation.result;
    if (result.status === 'SUCCEEDED' && (!result.text || sha256(result.text) !== result.contentHash)) {
      throw legalError('OCR_INTEGRITY_FAILURE', 'OCR provider content checksum did not match', 502);
    }
    const extraction = await prisma.documentExtraction.upsert({
      where: { provider_externalId: { provider: connectors.providerName('OCR'), externalId: result.externalId } },
      update: {},
      create: {
        documentId,
        versionId: version.id,
        provider: connectors.providerName('OCR'),
        externalId: result.externalId,
        status: result.status,
        extractedText: result.text || null,
        confidence: result.confidence,
        contentHash: result.contentHash,
        failureCode: result.failureCode,
        failureMessage: result.failureMessage,
        completedAt: new Date(),
      },
    });
    await prisma.$transaction((tx) => appendAudit(tx, {
      matterId: document.matterId,
      actorId: actor.id,
      action: result.status === 'SUCCEEDED' ? 'DOCUMENT_OCR_COMPLETED' : 'DOCUMENT_OCR_FAILED',
      entityType: 'DOCUMENT_EXTRACTION',
      entityId: extraction.id,
      payload: { documentId, documentVersion: document.currentVersion, provider: extraction.provider, confidence: extraction.confidence, failureCode: extraction.failureCode },
    }));
    return extraction;
  }

  async function getDocumentContent(actor, documentId) {
    const { document } = await documentAccess(prisma, documentId, actor);
    if (document.status === 'DISPOSED') throw legalError('DOCUMENT_DISPOSED', 'Disposed document content is no longer available', 410);
    const version = document.versions.find((item) => item.version === document.currentVersion);
    const key = `retrieve-${crypto.randomUUID()}`;
    const result = await connectors.retrieve({
      matterId: document.matterId,
      documentId,
      versionId: version.id,
      storageKey: version.storageKey,
      contentHash: version.contentHash,
    }, key);
    const content = decodeDocument(result.contentBase64);
    if (result.contentHash !== version.contentHash || sha256(content) !== version.contentHash || result.mimeType !== version.mimeType) {
      throw legalError('STORAGE_INTEGRITY_FAILURE', 'Retrieved document did not match its immutable version metadata', 502);
    }
    await prisma.$transaction((tx) => appendAudit(tx, {
      matterId: document.matterId,
      actorId: actor.id,
      action: 'DOCUMENT_CONTENT_ACCESSED',
      entityType: 'DOCUMENT_VERSION',
      entityId: version.id,
      payload: { documentId, documentVersion: version.version, contentHash: version.contentHash, byteSize: version.byteSize, mimeType: version.mimeType },
    }));
    return { content, contentHash: version.contentHash, documentId, mimeType: version.mimeType, version: version.version };
  }

  async function syncTemplates(actor, matterId, input) {
    const { matter } = await accessFor(prisma, matterId, actor, { roles: MATTER_MANAGERS });
    const asOf = input.asOf || new Date();
    const request = { jurisdiction: matter.jurisdiction, documentTypes: input.documentTypes, asOf: asOf.toISOString() };
    const operation = await integrationAttempt({
      matterId,
      entityId: matterId,
      operation: 'TEMPLATE_SYNC',
      key: input.idempotencyKey,
      request,
      invoke: () => connectors.resolveTemplates(request, input.idempotencyKey),
      repeatOnReplay: true,
      metadata: (result) => ({ count: result.templates.length }),
    });
    const saved = [];
    for (const source of operation.result.templates) {
      if (source.jurisdiction !== matter.jurisdiction || !input.documentTypes.includes(source.documentType)) {
        throw legalError('TEMPLATE_SCOPE_MISMATCH', 'Template registry returned an out-of-scope template', 502);
      }
      if (sha256(source.content) !== source.contentHash) {
        throw legalError('TEMPLATE_INTEGRITY_FAILURE', 'Template registry checksum did not match', 502);
      }
      const effectiveFrom = new Date(source.effectiveFrom);
      const effectiveUntil = source.effectiveUntil ? new Date(source.effectiveUntil) : null;
      if (effectiveFrom > asOf || (effectiveUntil && effectiveUntil < asOf)) {
        throw legalError('TEMPLATE_NOT_EFFECTIVE', 'Template registry returned a template outside its effective period', 502);
      }
      const template = await prisma.$transaction(async (tx) => {
        const unique = { templateKey: source.templateKey, jurisdiction: source.jurisdiction, version: source.version };
        const existing = await tx.legalTemplate.findUnique({ where: { templateKey_jurisdiction_version: unique } });
        if (existing) {
          const immutableMatch = existing.documentType === source.documentType
            && existing.effectiveFrom.toISOString() === effectiveFrom.toISOString()
            && (existing.effectiveUntil ? existing.effectiveUntil.toISOString() : null) === (effectiveUntil ? effectiveUntil.toISOString() : null)
            && existing.sourceSystem === source.sourceSystem
            && existing.sourceUri === source.sourceUri
            && existing.content === source.content
            && existing.contentHash === source.contentHash;
          if (!immutableMatch) {
            throw legalError('TEMPLATE_VERSION_CONFLICT', 'Template registry changed immutable content without publishing a new version', 502);
          }
        }
        const currentTime = new Date();
        const currentlyEffective = effectiveFrom <= currentTime && (!effectiveUntil || effectiveUntil >= currentTime);
        const newerActive = currentlyEffective && await tx.legalTemplate.findFirst({
          where: {
            templateKey: source.templateKey,
            jurisdiction: source.jurisdiction,
            status: 'ACTIVE',
            effectiveFrom: { gt: effectiveFrom, lte: currentTime },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: currentTime } }],
          },
          select: { id: true },
        });
        const status = currentlyEffective && !newerActive ? 'ACTIVE' : 'SUPERSEDED';
        if (status === 'ACTIVE') {
          await tx.legalTemplate.updateMany({
            where: { templateKey: source.templateKey, jurisdiction: source.jurisdiction, status: 'ACTIVE', version: { not: source.version }, effectiveFrom: { lte: effectiveFrom } },
            data: { status: 'SUPERSEDED' },
          });
        }
        const row = existing
          ? await tx.legalTemplate.update({ where: { id: existing.id }, data: { status, syncedAt: new Date() } })
          : await tx.legalTemplate.create({ data: { ...source, effectiveFrom, effectiveUntil, status } });
        await appendAudit(tx, {
          matterId,
          actorId: actor.id,
          action: 'AUTHORITATIVE_TEMPLATE_SYNCED',
          entityType: 'TEMPLATE',
          entityId: row.id,
          payload: { templateKey: row.templateKey, version: row.version, jurisdiction: row.jurisdiction, effectiveFrom: row.effectiveFrom.toISOString(), effectiveUntil: row.effectiveUntil && row.effectiveUntil.toISOString(), sourceSystem: row.sourceSystem, sourceUri: row.sourceUri, contentHash: row.contentHash },
        });
        return row;
      });
      saved.push(template);
    }
    return saved;
  }

  async function listTemplates(actor, matterId) {
    const { matter } = await accessFor(prisma, matterId, actor);
    const now = new Date();
    return prisma.legalTemplate.findMany({
      where: {
        jurisdiction: matter.jurisdiction,
        status: 'ACTIVE',
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
      select: { id: true, templateKey: true, jurisdiction: true, documentType: true, version: true, effectiveFrom: true, effectiveUntil: true, sourceSystem: true, sourceUri: true, contentHash: true, syncedAt: true },
      orderBy: [{ documentType: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  function mergeTemplate(template, matter, variables) {
    const values = {
      matterNumber: matter.matterNumber,
      matterTitle: matter.title,
      jurisdiction: matter.jurisdiction,
      currentDate: new Date().toISOString().slice(0, 10),
      ...variables,
    };
    const missing = new Set();
    const content = template.content.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]{0,79})\s*\}\}/g, (_, key) => {
      if (!(key in values) || values[key] === '') {
        missing.add(key);
        return '';
      }
      return String(values[key]);
    });
    if (missing.size) throw legalError('TEMPLATE_VARIABLES_MISSING', 'Required template variables are missing', 422, { fields: [...missing].sort() });
    if (/\{\{[^}]+\}\}/.test(content)) throw legalError('TEMPLATE_PLACEHOLDER_INVALID', 'Template contains an unsupported placeholder', 422);
    return content;
  }

  async function generateDocument(actor, matterId, input) {
    const { matter } = await accessFor(prisma, matterId, actor, { roles: DOCUMENT_WRITERS, privileged: input.privileged });
    const template = await prisma.legalTemplate.findUnique({ where: { id: input.templateId } });
    const now = new Date();
    if (!template || template.status !== 'ACTIVE' || template.jurisdiction !== matter.jurisdiction || template.effectiveFrom > now || (template.effectiveUntil && template.effectiveUntil < now)) {
      throw legalError('AUTHORITATIVE_TEMPLATE_REQUIRED', 'An active, effective template for this jurisdiction is required', 422);
    }
    const content = mergeTemplate(template, matter, input.variables);
    const contentBuffer = Buffer.from(content, 'utf8');
    const contentHash = sha256(contentBuffer);
    const existingAttempt = await prisma.integrationAttempt.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    const documentId = existingAttempt && existingAttempt.entityId ? existingAttempt.entityId : crypto.randomUUID();
    const request = { matterId, documentId, templateId: template.id, templateVersion: template.version, contentHash, mimeType: 'text/plain', byteSize: contentBuffer.length };
    const stored = await integrationAttempt({
      matterId,
      entityId: documentId,
      operation: 'STORE',
      key: input.idempotencyKey,
      request,
      invoke: () => connectors.store({ ...request, fileName: `${documentId}.txt`, contentBase64: contentBuffer.toString('base64') }, input.idempotencyKey),
      metadata: (result) => result,
    });
    if (!stored.result || stored.result.contentHash !== contentHash) throw legalError('STORAGE_INTEGRITY_FAILURE', 'Storage provider checksum did not match generated content', 502);
    const existing = await prisma.legalDocument.findUnique({ where: { id: documentId }, include: { versions: true } });
    if (existing) return existing;
    return prisma.$transaction(async (tx) => {
      const document = await tx.legalDocument.create({
        data: {
          id: documentId,
          matterId,
          title: input.title,
          documentType: template.documentType,
          status: 'REVIEW_PENDING',
          privileged: input.privileged,
          currentVersion: 1,
          templateId: template.id,
          templateVersion: template.version,
          retentionUntil: matter.retentionUntil,
          createdById: actor.id,
          versions: {
            create: {
              version: 1,
              source: 'DETERMINISTIC_MERGE',
              storageProvider: connectors.providerName('STORAGE'),
              storageKey: stored.result.storageKey,
              sourceUri: stored.result.sourceUri,
              mimeType: 'text/plain',
              byteSize: contentBuffer.length,
              contentHash,
              provenance: { templateId: template.id, templateKey: template.templateKey, templateVersion: template.version, templateHash: template.contentHash, sourceSystem: template.sourceSystem, sourceUri: template.sourceUri, variablesHash: requestHash(input.variables), idempotencyKey: input.idempotencyKey },
              createdById: actor.id,
            },
          },
        },
        include: { versions: true, template: true },
      });
      await appendAudit(tx, {
        matterId,
        actorId: actor.id,
        action: 'DOCUMENT_GENERATED_FOR_REVIEW',
        entityType: 'DOCUMENT',
        entityId: document.id,
        payload: { documentType: document.documentType, version: 1, contentHash, templateId: template.id, templateVersion: template.version, templateEffectiveFrom: template.effectiveFrom.toISOString(), templateEffectiveUntil: template.effectiveUntil && template.effectiveUntil.toISOString(), jurisdiction: matter.jurisdiction },
      });
      return document;
    });
  }

  async function reviewDocument(actor, documentId, input) {
    const { document, access } = await documentAccess(prisma, documentId, actor);
    if (!LEGAL_REVIEWERS.has(access.role)) {
      throw legalError('LEGAL_REVIEWER_REQUIRED', 'A designated legal reviewer is required', 403);
    }
    if (document.status !== 'REVIEW_PENDING') throw legalError('DOCUMENT_NOT_REVIEWABLE', 'Document is not awaiting review', 409);
    const version = document.versions.find((item) => item.version === document.currentVersion);
    if (version.createdById === actor.id) throw legalError('SEPARATE_REVIEWER_REQUIRED', 'Document creator cannot approve or reject the same version', 409);
    const template = document.template;
    const now = new Date();
    if (!template || template.jurisdiction !== access.matter.jurisdiction || template.status !== 'ACTIVE' || template.effectiveFrom > now || (template.effectiveUntil && template.effectiveUntil < now)) {
      throw legalError('TEMPLATE_VALIDATION_FAILED', 'Template jurisdiction or effective date is no longer valid', 409);
    }
    const provenance = version.provenance && typeof version.provenance === 'object' ? version.provenance : {};
    if (document.templateVersion !== template.version || provenance.templateId !== template.id || provenance.templateVersion !== template.version || provenance.templateHash !== template.contentHash) {
      throw legalError('TEMPLATE_PROVENANCE_INVALID', 'Current document version is not bound to the reviewed authoritative template', 409);
    }
    return prisma.$transaction(async (tx) => {
      const updated = await tx.legalDocument.updateMany({
        where: { id: documentId, lockVersion: input.expectedVersion, status: 'REVIEW_PENDING' },
        data: { status: input.decision, lockVersion: { increment: 1 } },
      });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Document version is stale', 409);
      const review = await tx.documentReview.create({
        data: {
          documentId,
          documentVersion: document.currentVersion,
          reviewerId: actor.id,
          decision: input.decision,
          jurisdiction: access.matter.jurisdiction,
          templateId: template.id,
          templateVersion: template.version,
          comments: input.comments,
        },
      });
      await appendAudit(tx, {
        matterId: document.matterId,
        actorId: actor.id,
        action: input.decision === 'APPROVED' ? 'DOCUMENT_LEGAL_REVIEW_APPROVED' : 'DOCUMENT_LEGAL_REVIEW_REJECTED',
        entityType: 'DOCUMENT_REVIEW',
        entityId: review.id,
        payload: { documentId, documentVersion: document.currentVersion, jurisdiction: access.matter.jurisdiction, templateId: template.id, templateVersion: template.version, commentsHash: sha256(input.comments) },
      });
      return tx.legalDocument.findUnique({ where: { id: documentId }, include: { reviews: true, versions: true } });
    });
  }

  async function requestSignature(actor, documentId, input) {
    const { document } = await documentAccess(prisma, documentId, actor, { roles: MATTER_MANAGERS });
    const signerEmailHash = sha256(input.signerEmail);
    const existingEnvelope = await prisma.signatureEnvelope.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existingEnvelope) {
      if (existingEnvelope.documentId !== documentId || existingEnvelope.signerEmailHash !== signerEmailHash) {
        throw legalError('IDEMPOTENCY_CONFLICT', 'Signature key was used for different input', 409);
      }
      if (existingEnvelope.status !== 'FAILED') {
        return { document: await prisma.legalDocument.findUnique({ where: { id: documentId } }), envelope: existingEnvelope, replayed: true };
      }
    }
    if (document.status !== 'APPROVED') throw legalError('LEGAL_APPROVAL_REQUIRED', 'Current document version requires approved legal review', 409);
    const review = document.reviews.find((item) => item.documentVersion === document.currentVersion && item.decision === 'APPROVED');
    if (!review) throw legalError('LEGAL_APPROVAL_REQUIRED', 'Current document version requires approved legal review', 409);
    const version = document.versions.find((item) => item.version === document.currentVersion);
    const request = { documentId, documentVersion: document.currentVersion, sourceUri: version.sourceUri, contentHash: version.contentHash, signerEmail: input.signerEmail, signerName: input.signerName };
    const existingAttempt = await prisma.integrationAttempt.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existingAttempt && existingAttempt.requestHash !== requestHash(request)) throw legalError('IDEMPOTENCY_CONFLICT', 'Signature key was used for different input', 409);
    const provider = connectors.providerName('ESIGN');
    await prisma.$transaction(async (tx) => {
      const updated = await tx.legalDocument.updateMany({ where: { id: documentId, lockVersion: input.expectedVersion, status: 'APPROVED' }, data: { status: 'SIGNATURE_PENDING', lockVersion: { increment: 1 } } });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Document version is stale', 409);
      await tx.signatureEnvelope.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        update: { status: 'PENDING', failedAt: null, failureCode: null, failureMessage: null },
        create: { documentId, documentVersion: document.currentVersion, provider, idempotencyKey: input.idempotencyKey, signerEmailHash, requestedById: actor.id },
      });
      await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: 'SIGNATURE_REQUESTED', entityType: 'DOCUMENT', entityId: documentId, payload: { documentVersion: document.currentVersion, provider, signerEmailHash, idempotencyKey: input.idempotencyKey } });
    });
    try {
      const operation = await integrationAttempt({
        matterId: document.matterId,
        entityId: documentId,
        operation: 'ESIGN',
        key: input.idempotencyKey,
        request,
        invoke: () => connectors.requestSignature(request, input.idempotencyKey),
        metadata: (result) => result,
      });
      const envelope = await prisma.$transaction(async (tx) => {
        const row = await tx.signatureEnvelope.update({ where: { idempotencyKey: input.idempotencyKey }, data: { externalId: operation.result.externalId, status: operation.result.status } });
        await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: 'SIGNATURE_SENT', entityType: 'SIGNATURE_ENVELOPE', entityId: row.id, payload: { documentId, documentVersion: document.currentVersion, provider, externalId: operation.result.externalId, status: operation.result.status } });
        return row;
      });
      return { document: await prisma.legalDocument.findUnique({ where: { id: documentId } }), envelope };
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.legalDocument.updateMany({ where: { id: documentId, status: 'SIGNATURE_PENDING' }, data: { status: 'APPROVED' } });
        const envelope = await tx.signatureEnvelope.update({ where: { idempotencyKey: input.idempotencyKey }, data: { status: 'FAILED', failedAt: new Date(), failureCode: error.code || 'CONNECTOR_FAILURE', failureMessage: String(error.message || 'Signature provider failed').slice(0, 1000) } });
        await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: 'SIGNATURE_FAILED', entityType: 'SIGNATURE_ENVELOPE', entityId: envelope.id, payload: { documentId, documentVersion: document.currentVersion, provider, failureCode: envelope.failureCode } });
      });
      throw error;
    }
  }

  async function applySignatureEvent({ provider, eventId, externalId, status, payloadHash }) {
    if (!['COMPLETED', 'DECLINED', 'FAILED', 'VOIDED'].includes(status)) throw legalError('WEBHOOK_STATUS_INVALID', 'Unsupported signature event status', 422);
    const receiptProvider = `ESIGN:${provider}`;
    const existing = await prisma.legalWebhookReceipt.findUnique({ where: { provider_eventId: { provider: receiptProvider, eventId } } });
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw legalError('WEBHOOK_REPLAY_CONFLICT', 'Webhook event ID was reused with different content', 409);
      return { replayed: true };
    }
    const envelope = await prisma.signatureEnvelope.findFirst({ where: { provider, externalId }, include: { document: true } });
    if (!envelope) throw legalError('SIGNATURE_ENVELOPE_NOT_FOUND', 'Signature envelope not found', 404);
    return prisma.$transaction(async (tx) => {
      try {
        await tx.legalWebhookReceipt.create({ data: { provider: receiptProvider, eventId, payloadHash } });
      } catch (error) {
        if (isUniqueError(error)) return { replayed: true };
        throw error;
      }
      const completed = status === 'COMPLETED';
      await tx.signatureEnvelope.update({
        where: { id: envelope.id },
        data: {
          status,
          completedAt: completed ? new Date() : null,
          failedAt: completed ? null : new Date(),
          failureCode: completed ? null : status,
          lastProviderEvent: eventId,
        },
      });
      await tx.legalDocument.updateMany({
        where: { id: envelope.documentId, currentVersion: envelope.documentVersion, status: 'SIGNATURE_PENDING' },
        data: { status: completed ? 'SIGNED' : 'APPROVED', lockVersion: { increment: 1 } },
      });
      await appendAudit(tx, { matterId: envelope.document.matterId, actorId: `ESIGN:${provider}`, action: completed ? 'SIGNATURE_COMPLETED' : 'SIGNATURE_TERMINATED', entityType: 'SIGNATURE_ENVELOPE', entityId: envelope.id, payload: { documentId: envelope.documentId, documentVersion: envelope.documentVersion, provider, externalId, eventId, status, payloadHash } });
      return { replayed: false, status };
    });
  }

  async function applyFilingEvent({ provider, eventId, externalId, status, receiptUri, payloadHash }) {
    if (!['FILED', 'REJECTED', 'FAILED'].includes(status)) throw legalError('WEBHOOK_STATUS_INVALID', 'Unsupported filing event status', 422);
    const receiptProvider = `FILING:${provider}`;
    const existing = await prisma.legalWebhookReceipt.findUnique({ where: { provider_eventId: { provider: receiptProvider, eventId } } });
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw legalError('WEBHOOK_REPLAY_CONFLICT', 'Webhook event ID was reused with different content', 409);
      return { replayed: true };
    }
    const filing = await prisma.filingRecord.findFirst({ where: { provider, externalId }, include: { document: true } });
    if (!filing) throw legalError('FILING_RECORD_NOT_FOUND', 'Filing record not found', 404);
    return prisma.$transaction(async (tx) => {
      try {
        await tx.legalWebhookReceipt.create({ data: { provider: receiptProvider, eventId, payloadHash } });
      } catch (error) {
        if (isUniqueError(error)) return { replayed: true };
        throw error;
      }
      const filed = status === 'FILED';
      await tx.filingRecord.update({
        where: { id: filing.id },
        data: {
          status,
          filedAt: filed ? new Date() : null,
          receiptUri: filed ? receiptUri || filing.receiptUri : filing.receiptUri,
          failureCode: filed ? null : status,
          failureMessage: null,
        },
      });
      await tx.legalDocument.updateMany({
        where: { id: filing.documentId, currentVersion: filing.documentVersion, status: 'FILING_PENDING' },
        data: { status: filed ? 'FILED' : 'SIGNED', lockVersion: { increment: 1 } },
      });
      await appendAudit(tx, {
        matterId: filing.document.matterId,
        actorId: `FILING:${provider}`,
        action: filed ? 'DOCUMENT_FILED' : 'FILING_TERMINATED',
        entityType: 'FILING_RECORD',
        entityId: filing.id,
        payload: { documentId: filing.documentId, documentVersion: filing.documentVersion, provider, externalId, eventId, status, receiptUri: filed ? receiptUri || null : null, payloadHash },
      });
      return { replayed: false, status };
    });
  }

  async function requestFiling(actor, documentId, input) {
    const { document, access } = await documentAccess(prisma, documentId, actor, { roles: MATTER_MANAGERS });
    const existingFiling = await prisma.filingRecord.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existingFiling) {
      if (existingFiling.documentId !== documentId || existingFiling.jurisdiction !== access.matter.jurisdiction) {
        throw legalError('IDEMPOTENCY_CONFLICT', 'Filing key was used for different input', 409);
      }
      if (existingFiling.status !== 'FAILED') {
        return { document: await prisma.legalDocument.findUnique({ where: { id: documentId } }), filing: existingFiling, replayed: true };
      }
    }
    if (document.status !== 'SIGNED') throw legalError('SIGNED_DOCUMENT_REQUIRED', 'Only a completed signed document may be filed', 409);
    const version = document.versions.find((item) => item.version === document.currentVersion);
    const request = { documentId, documentVersion: document.currentVersion, jurisdiction: access.matter.jurisdiction, filingType: input.filingType, sourceUri: version.sourceUri, contentHash: version.contentHash };
    const existingAttempt = await prisma.integrationAttempt.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existingAttempt && existingAttempt.requestHash !== requestHash(request)) throw legalError('IDEMPOTENCY_CONFLICT', 'Filing key was used for different input', 409);
    const provider = connectors.providerName('FILING');
    await prisma.$transaction(async (tx) => {
      const updated = await tx.legalDocument.updateMany({ where: { id: documentId, lockVersion: input.expectedVersion, status: 'SIGNED' }, data: { status: 'FILING_PENDING', lockVersion: { increment: 1 } } });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Document version is stale', 409);
      await tx.filingRecord.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        update: { status: 'PENDING', failureCode: null, failureMessage: null },
        create: { documentId, documentVersion: document.currentVersion, provider, idempotencyKey: input.idempotencyKey, jurisdiction: access.matter.jurisdiction, requestedById: actor.id },
      });
      await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: 'FILING_REQUESTED', entityType: 'DOCUMENT', entityId: documentId, payload: { documentVersion: document.currentVersion, jurisdiction: access.matter.jurisdiction, filingType: input.filingType, provider, idempotencyKey: input.idempotencyKey } });
    });
    try {
      const operation = await integrationAttempt({ matterId: document.matterId, entityId: documentId, operation: 'FILE', key: input.idempotencyKey, request, invoke: () => connectors.file(request, input.idempotencyKey), metadata: (result) => result });
      const filing = await prisma.$transaction(async (tx) => {
        const row = await tx.filingRecord.update({ where: { idempotencyKey: input.idempotencyKey }, data: { externalId: operation.result.externalId, status: operation.result.status, filedAt: operation.result.status === 'FILED' ? new Date() : null, receiptUri: operation.result.receiptUri || null } });
        if (operation.result.status === 'FILED') await tx.legalDocument.update({ where: { id: documentId }, data: { status: 'FILED', lockVersion: { increment: 1 } } });
        await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: operation.result.status === 'FILED' ? 'DOCUMENT_FILED' : 'FILING_ACCEPTED', entityType: 'FILING_RECORD', entityId: row.id, payload: { documentId, documentVersion: document.currentVersion, provider, externalId: row.externalId, status: row.status, receiptUri: row.receiptUri } });
        return row;
      });
      return { document: await prisma.legalDocument.findUnique({ where: { id: documentId } }), filing };
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.legalDocument.updateMany({ where: { id: documentId, status: 'FILING_PENDING' }, data: { status: 'SIGNED' } });
        const filing = await tx.filingRecord.update({ where: { idempotencyKey: input.idempotencyKey }, data: { status: 'FAILED', failureCode: error.code || 'CONNECTOR_FAILURE', failureMessage: String(error.message || 'Filing provider failed').slice(0, 1000) } });
        await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: 'FILING_FAILED', entityType: 'FILING_RECORD', entityId: filing.id, payload: { documentId, provider, failureCode: filing.failureCode } });
      });
      throw error;
    }
  }

  async function setLegalHold(actor, matterId, enabled, input) {
    await accessFor(prisma, matterId, actor, { roles: MATTER_MANAGERS, privileged: true });
    return prisma.$transaction(async (tx) => {
      const updated = await tx.legalMatter.updateMany({
        where: { id: matterId, version: input.expectedVersion },
        data: {
          legalHold: enabled,
          legalHoldReason: enabled ? input.reason : null,
          legalHoldSetAt: enabled ? new Date() : null,
          legalHoldSetById: enabled ? actor.id : null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Matter version is stale', 409);
      await appendAudit(tx, { matterId, actorId: actor.id, action: enabled ? 'LEGAL_HOLD_APPLIED' : 'LEGAL_HOLD_RELEASED', entityType: 'MATTER', entityId: matterId, payload: { reason: input.reason } });
      return tx.legalMatter.findUnique({ where: { id: matterId } });
    });
  }

  async function disposeDocument(actor, documentId, input) {
    const { document, access } = await documentAccess(prisma, documentId, actor, { roles: MATTER_MANAGERS, privileged: true });
    if (access.matter.legalHold) throw legalError('LEGAL_HOLD_ACTIVE', 'Legal hold prevents disposition', 409);
    const retentionUntil = document.retentionUntil || access.matter.retentionUntil;
    if (!retentionUntil || retentionUntil > new Date()) throw legalError('RETENTION_PERIOD_ACTIVE', 'Document retention period has not expired', 409);
    if (document.status === 'DISPOSED') return document;
    const priorStatus = document.status;
    await prisma.$transaction(async (tx) => {
      const updated = await tx.legalDocument.updateMany({ where: { id: documentId, lockVersion: input.expectedVersion, status: { not: 'DISPOSED' } }, data: { status: 'DISPOSITION_PENDING', lockVersion: { increment: 1 } } });
      if (updated.count !== 1) throw legalError('VERSION_CONFLICT', 'Document version is stale', 409);
      await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: 'DOCUMENT_DISPOSITION_REQUESTED', entityType: 'DOCUMENT', entityId: documentId, payload: { reason: input.reason, retentionUntil: retentionUntil.toISOString(), versionCount: document.versions.length } });
    });
    const request = { documentId, objects: document.versions.map((version) => ({ storageKey: version.storageKey, contentHash: version.contentHash })) };
    try {
      const operation = await integrationAttempt({ matterId: document.matterId, entityId: documentId, operation: 'DISPOSE', key: input.idempotencyKey, request, invoke: () => connectors.dispose(request, input.idempotencyKey), metadata: (result) => result });
      if (!operation.result.disposed) throw legalError('DISPOSITION_NOT_CONFIRMED', 'Storage provider did not confirm disposition', 502);
      return prisma.$transaction(async (tx) => {
        const row = await tx.legalDocument.update({ where: { id: documentId }, data: { status: 'DISPOSED', disposedAt: new Date(), disposedById: actor.id, dispositionReason: input.reason, lockVersion: { increment: 1 } } });
        await appendAudit(tx, { matterId: document.matterId, actorId: actor.id, action: 'DOCUMENT_DISPOSED', entityType: 'DOCUMENT', entityId: documentId, payload: { reason: input.reason, storageObjects: document.versions.map((version) => ({ storageKeyHash: sha256(version.storageKey), contentHash: version.contentHash })) } });
        return row;
      });
    } catch (error) {
      await prisma.legalDocument.updateMany({ where: { id: documentId, status: 'DISPOSITION_PENDING' }, data: { status: priorStatus } });
      throw error;
    }
  }

  async function exportMatter(actor, matterId) {
    const access = await accessFor(prisma, matterId, actor);
    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      include: {
        documents: { include: { versions: { orderBy: { version: 'asc' } }, reviews: true, signatureEnvelopes: true, filings: true, extractions: true }, orderBy: { createdAt: 'asc' } },
        auditEvents: { orderBy: { id: 'asc' } },
      },
    });
    const visible = matter.documents.filter((document) => !document.privileged || access.canViewPrivileged);
    const manifest = {
      format: 'moving-company-legal-export-v1',
      exportedAt: new Date().toISOString(),
      matter: { id: matter.id, matterNumber: matter.matterNumber, title: matter.title, jurisdiction: matter.jurisdiction, status: matter.status, version: matter.version, retentionUntil: matter.retentionUntil && matter.retentionUntil.toISOString(), legalHold: matter.legalHold },
      documents: visible.map((document) => ({
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        status: document.status,
        privileged: document.privileged,
        currentVersion: document.currentVersion,
        versions: document.versions.map((version) => ({ id: version.id, version: version.version, source: version.source, parentVersionId: version.parentVersionId, storageProvider: version.storageProvider, storageKeyHash: sha256(version.storageKey), sourceUriHash: version.sourceUri ? sha256(version.sourceUri) : null, mimeType: version.mimeType, byteSize: version.byteSize, contentHash: version.contentHash, provenance: exportProvenance(version.provenance), createdById: version.createdById, createdAt: version.createdAt.toISOString() })),
        reviews: document.reviews,
        signatures: document.signatureEnvelopes.map((envelope) => ({ ...envelope, signerEmailHash: envelope.signerEmailHash })),
        filings: document.filings,
        extractions: document.extractions.map(({ extractedText, ...extraction }) => extraction),
      })),
      auditEvents: access.canViewPrivileged
        ? matter.auditEvents.map(serializeEvent)
        : matter.auditEvents.map((event) => ({ id: event.id.toString(), action: event.action, entityType: event.entityType, previousHash: event.previousHash, eventHash: event.eventHash, createdAt: event.createdAt.toISOString() })),
      redaction: { privilegedDocumentsOmitted: matter.documents.length - visible.length, auditPayloadsOmitted: !access.canViewPrivileged },
    };
    const normalizedManifest = JSON.parse(JSON.stringify(manifest));
    const manifestHash = sha256(canonicalJson(normalizedManifest));
    await prisma.$transaction((tx) => appendAudit(tx, { matterId, actorId: actor.id, action: 'MATTER_EXPORTED', entityType: 'MATTER', entityId: matterId, payload: { manifestHash, privilegedDocumentsOmitted: manifest.redaction.privilegedDocumentsOmitted, documentCount: manifest.documents.length } }));
    return { manifest: normalizedManifest, manifestHash };
  }

  async function verifyAuditChain(matterId) {
    const events = await prisma.legalAuditEvent.findMany({ where: { matterId }, orderBy: { id: 'asc' } });
    let previousHash = null;
    for (const event of events) {
      const material = { matterId: event.matterId, actorId: event.actorId, action: event.action, entityType: event.entityType, entityId: event.entityId, payload: event.payload, previousHash, createdAt: event.createdAt.toISOString() };
      const expected = sha256(canonicalJson(material));
      if (event.previousHash !== previousHash || event.eventHash !== expected) return { valid: false, eventId: event.id.toString() };
      previousHash = event.eventHash;
    }
    return { valid: true, count: events.length, head: previousHash };
  }

  return {
    applyFilingEvent,
    applySignatureEvent,
    createMatter,
    disposeDocument,
    exportMatter,
    extractDocument,
    generateDocument,
    getDocumentContent,
    getMatter,
    grantAccess,
    listMatters,
    listTemplates,
    requestFiling,
    requestSignature,
    reviseDocument,
    reviewDocument,
    revokeAccess,
    setLegalHold,
    syncTemplates,
    uploadDocument,
    verifyAuditChain,
  };
}

module.exports = { createLegalService };
