const PLACEHOLDER_MARKERS = ['change-in-production', 'changeme', 'replace-me', 'placeholder', 'example-secret', 'generate'];

function requireSecret(name, minimumLength = 32) {
  const value = String(process.env[name] || '').trim();
  if (value.length < minimumLength || PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker))) {
    throw new Error(`${name} must be a non-placeholder secret containing at least ${minimumLength} characters`);
  }
  return value;
}

function requireDatabaseUrl() {
  const value = String(process.env.DATABASE_URL || '').trim();
  if (!/^postgres(?:ql)?:\/\//.test(value)) {
    throw new Error('DATABASE_URL must be an explicit PostgreSQL URL');
  }
  return value;
}

function allowedOrigins() {
  const origins = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS is required in production');
  }
  return new Set(origins);
}

function validateRuntimeConfig() {
  requireDatabaseUrl();
  requireSecret('JWT_SECRET');
  allowedOrigins();
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 10');
  }
  const timeout = Number(process.env.CONNECTOR_TIMEOUT_MS || 10_000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 60_000) {
    throw new Error('CONNECTOR_TIMEOUT_MS must be an integer from 100 to 60000');
  }
  if (process.env.NODE_ENV === 'production') {
    if (process.env.CONNECTOR_ALLOW_HTTP === 'true') throw new Error('CONNECTOR_ALLOW_HTTP cannot be enabled in production');
    requireSecret('ESIGN_WEBHOOK_SECRET');
    requireSecret('FILING_WEBHOOK_SECRET');
    const { connectorConfiguration } = require('./legal/connectors');
    for (const kind of ['STORAGE', 'OCR', 'ESIGN', 'FILING', 'TEMPLATE']) connectorConfiguration(kind);
  }
}

module.exports = { allowedOrigins, requireDatabaseUrl, requireSecret, validateRuntimeConfig };
