const { z } = require('zod');

const identifier = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const jurisdiction = z.string().trim().toUpperCase().regex(/^[A-Z]{2}(?:-[A-Z0-9]{1,12})?$/);
const idempotencyKey = z.string().trim().min(8).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/);
const expectedVersion = z.coerce.number().int().positive();

const createMatter = z.object({
  title: z.string().trim().min(3).max(200),
  jurisdiction,
  jobId: z.string().uuid().optional(),
  claimId: z.string().uuid().optional(),
  retentionUntil: z.coerce.date().optional(),
  idempotencyKey,
}).strict();

const grantAccess = z.object({
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'LEGAL_REVIEWER', 'CONTRIBUTOR', 'VIEWER']),
  canViewPrivileged: z.boolean().default(false),
  expectedVersion,
}).strict();

const revokeAccess = z.object({
  reason: z.string().trim().min(10).max(500),
  expectedVersion,
}).strict();

const uploadDocument = z.object({
  title: z.string().trim().min(3).max(200),
  documentType: z.enum(['EVIDENCE', 'CLAIM_FORM', 'SETTLEMENT_AGREEMENT', 'RELEASE', 'NOTICE', 'FILING_COVER_SHEET', 'OTHER']),
  privileged: z.boolean().default(false),
  mimeType: z.string().trim().min(3).max(120),
  fileName: z.string().trim().min(1).max(240),
  contentBase64: z.string().min(1),
  idempotencyKey,
}).strict();

const reviseDocument = z.object({
  expectedVersion,
  title: z.string().trim().min(3).max(200).optional(),
  mimeType: z.string().trim().min(3).max(120),
  fileName: z.string().trim().min(1).max(240),
  contentBase64: z.string().min(1),
  idempotencyKey,
}).strict();

const syncTemplates = z.object({
  documentTypes: z.array(z.enum(['CLAIM_FORM', 'SETTLEMENT_AGREEMENT', 'RELEASE', 'NOTICE', 'FILING_COVER_SHEET', 'OTHER'])).min(1).max(10),
  asOf: z.coerce.date().optional(),
  idempotencyKey,
}).strict();

const generateDocument = z.object({
  templateId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  variables: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/), z.string().max(5000)).default({}),
  privileged: z.boolean().default(true),
  idempotencyKey,
}).strict();

const reviewDocument = z.object({
  expectedVersion,
  decision: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().trim().min(10).max(5000),
}).strict();

const requestSignature = z.object({
  expectedVersion,
  signerEmail: z.string().trim().toLowerCase().email().max(320),
  signerName: z.string().trim().min(2).max(160),
  idempotencyKey,
}).strict();

const requestFiling = z.object({
  expectedVersion,
  filingType: identifier,
  idempotencyKey,
}).strict();

const legalHold = z.object({
  expectedVersion,
  reason: z.string().trim().min(10).max(1000),
}).strict();

const disposition = z.object({
  expectedVersion,
  reason: z.string().trim().min(10).max(1000),
  idempotencyKey,
}).strict();

module.exports = {
  createMatter,
  disposition,
  generateDocument,
  grantAccess,
  idempotencyKey,
  jurisdiction,
  legalHold,
  requestFiling,
  requestSignature,
  reviseDocument,
  reviewDocument,
  revokeAccess,
  syncTemplates,
  uploadDocument,
};
