const { z } = require('zod');
const { LegalWorkflowError } = require('./errors');

const CONNECTORS = {
  STORAGE: { url: 'DOCUMENT_STORAGE_URL', token: 'DOCUMENT_STORAGE_TOKEN' },
  OCR: { url: 'OCR_PROVIDER_URL', token: 'OCR_PROVIDER_TOKEN' },
  ESIGN: { url: 'ESIGN_PROVIDER_URL', token: 'ESIGN_PROVIDER_TOKEN' },
  FILING: { url: 'FILING_PROVIDER_URL', token: 'FILING_PROVIDER_TOKEN' },
  TEMPLATE: { url: 'TEMPLATE_REGISTRY_URL', token: 'TEMPLATE_REGISTRY_TOKEN' },
};

const storedObject = z.object({
  externalId: z.string().min(1).max(300),
  storageKey: z.string().min(1).max(1000),
  sourceUri: z.string().url().max(2000),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const extraction = z.object({
  externalId: z.string().min(1).max(300),
  status: z.enum(['SUCCEEDED', 'FAILED']),
  text: z.string().max(2_000_000).optional(),
  confidence: z.number().min(0).max(1).optional(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  failureCode: z.string().max(120).optional(),
  failureMessage: z.string().max(1000).optional(),
}).strict();

const template = z.object({
  templateKey: z.string().min(1).max(120),
  jurisdiction: z.string().regex(/^[A-Z]{2}(?:-[A-Z0-9]{1,12})?$/),
  documentType: z.enum(['CLAIM_FORM', 'SETTLEMENT_AGREEMENT', 'RELEASE', 'NOTICE', 'FILING_COVER_SHEET', 'OTHER']),
  version: z.string().min(1).max(120),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().nullable().optional(),
  sourceSystem: z.string().min(1).max(120),
  sourceUri: z.string().url().max(2000),
  content: z.string().min(1).max(1_000_000),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const templateResponse = z.object({ templates: z.array(template).max(100) }).strict();
const signatureResponse = z.object({
  externalId: z.string().min(1).max(300),
  status: z.enum(['PENDING', 'SENT']),
}).strict();
const filingResponse = z.object({
  externalId: z.string().min(1).max(300),
  status: z.enum(['PENDING', 'FILED']),
  receiptUri: z.string().url().max(2000).optional(),
}).strict();
const disposalResponse = z.object({ disposed: z.boolean() }).strict();
const retrievedObject = z.object({
  contentBase64: z.string().min(1).max(14_000_000),
  mimeType: z.string().min(3).max(120),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

function connectorConfiguration(kind, environment = process.env) {
  const definition = CONNECTORS[kind];
  if (!definition) throw new LegalWorkflowError('CONNECTOR_UNKNOWN', 'Unknown connector type', 500);
  const rawUrl = String(environment[definition.url] || '').trim();
  if (!rawUrl) {
    throw new LegalWorkflowError('CONNECTOR_NOT_CONFIGURED', `${kind} connector is not configured`, 503);
  }
  let baseUrl;
  try {
    baseUrl = new URL(rawUrl);
  } catch {
    throw new LegalWorkflowError('CONNECTOR_CONFIG_INVALID', `${kind} connector URL is invalid`, 503);
  }
  const allowHttp = environment.CONNECTOR_ALLOW_HTTP === 'true';
  if (baseUrl.protocol !== 'https:' && !(allowHttp && baseUrl.protocol === 'http:')) {
    throw new LegalWorkflowError('CONNECTOR_CONFIG_INVALID', `${kind} connector must use HTTPS`, 503);
  }
  if (baseUrl.username || baseUrl.password) {
    throw new LegalWorkflowError('CONNECTOR_CONFIG_INVALID', `${kind} connector URL must not contain credentials`, 503);
  }
  const allowedHosts = new Set(String(environment.DOCUMENT_CONNECTOR_ALLOWED_HOSTS || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
  if (!allowedHosts.has(baseUrl.hostname.toLowerCase())) {
    throw new LegalWorkflowError('CONNECTOR_HOST_NOT_ALLOWED', `${kind} connector host is not allowlisted`, 503);
  }
  return { baseUrl, token: String(environment[definition.token] || '').trim() };
}

async function request(kind, path, payload, idempotencyKey, options = {}) {
  const environment = options.environment || process.env;
  const fetchImplementation = options.fetchImplementation || fetch;
  const { baseUrl, token } = connectorConfiguration(kind, environment);
  const url = new URL(path.replace(/^\//, ''), baseUrl.href.endsWith('/') ? baseUrl : `${baseUrl.href}/`);
  if (url.hostname !== baseUrl.hostname || url.protocol !== baseUrl.protocol) {
    throw new LegalWorkflowError('CONNECTOR_PATH_INVALID', 'Connector path escaped its configured origin', 500);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(environment.CONNECTOR_TIMEOUT_MS || 10_000));
  try {
    const response = await fetchImplementation(url, {
      method: 'POST',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-idempotency-key': idempotencyKey,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    const maximumResponseBytes = options.maximumResponseBytes || 2_000_000;
    if (Buffer.byteLength(text, 'utf8') > maximumResponseBytes) {
      throw new LegalWorkflowError('CONNECTOR_RESPONSE_TOO_LARGE', `${kind} connector response exceeded its size limit`, 502);
    }
    let body = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new LegalWorkflowError('CONNECTOR_RESPONSE_INVALID', `${kind} connector returned invalid JSON`, 502);
    }
    if (!response.ok) {
      const providerCode = typeof body.code === 'string' ? body.code.slice(0, 120) : `HTTP_${response.status}`;
      throw new LegalWorkflowError('CONNECTOR_REQUEST_FAILED', `${kind} connector rejected the request`, 502, { providerCode });
    }
    return body;
  } catch (error) {
    if (error instanceof LegalWorkflowError) throw error;
    const code = error && error.name === 'AbortError' ? 'CONNECTOR_TIMEOUT' : 'CONNECTOR_UNAVAILABLE';
    throw new LegalWorkflowError(code, `${kind} connector is unavailable`, 502);
  } finally {
    clearTimeout(timeout);
  }
}

function validateResponse(kind, schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new LegalWorkflowError(
      'CONNECTOR_RESPONSE_INVALID',
      `${kind} connector returned an invalid response contract`,
      502,
    );
  }
  return parsed.data;
}

function createConnectors(options = {}) {
  const call = (kind, path, payload, key, requestOptions = {}) => request(kind, path, payload, key, { ...options, ...requestOptions });
  return {
    providerName(kind) {
      return connectorConfiguration(kind, options.environment || process.env).baseUrl.hostname;
    },
    async store(payload, key) {
      return validateResponse('STORAGE', storedObject, await call('STORAGE', 'objects', payload, key));
    },
    async dispose(payload, key) {
      return validateResponse('STORAGE', disposalResponse, await call('STORAGE', 'objects/dispose', payload, key));
    },
    async retrieve(payload, key) {
      return validateResponse('STORAGE', retrievedObject, await call('STORAGE', 'objects/retrieve', payload, key, { maximumResponseBytes: 14_100_000 }));
    },
    async extract(payload, key) {
      return validateResponse('OCR', extraction, await call('OCR', 'extract', payload, key));
    },
    async resolveTemplates(payload, key) {
      return validateResponse('TEMPLATE', templateResponse, await call('TEMPLATE', 'templates/resolve', payload, key));
    },
    async requestSignature(payload, key) {
      return validateResponse('ESIGN', signatureResponse, await call('ESIGN', 'envelopes', payload, key));
    },
    async file(payload, key) {
      return validateResponse('FILING', filingResponse, await call('FILING', 'filings', payload, key));
    },
  };
}

module.exports = { connectorConfiguration, createConnectors };
