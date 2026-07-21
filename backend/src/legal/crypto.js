const crypto = require('crypto');

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return crypto.createHash('sha256').update(input).digest('hex');
}

function requestHash(value) {
  return sha256(canonicalJson(value));
}

function verifyHmac(payload, supplied, secret) {
  if (!supplied || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const normalized = String(supplied).replace(/^sha256=/, '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(normalized, 'hex'));
}

module.exports = { canonicalJson, requestHash, sha256, verifyHmac };
