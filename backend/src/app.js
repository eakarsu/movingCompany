const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { allowedOrigins } = require('./config');
const { createConnectors } = require('./legal/connectors');
const { LegalWorkflowError } = require('./legal/errors');
const { createLegalService } = require('./legal/service');
const { createLegalDocumentsRouter } = require('./routes/legalDocuments');
const authRoutes = require('./routes/auth');

const EXPECTED_MIGRATION = '202607200001_governed_legal_documents';

function createApp({ prisma, connectors = createConnectors(), legalService } = {}) {
  if (!prisma) throw new Error('Prisma client is required');
  const app = express();
  const configuredOrigins = allowedOrigins();
  const service = legalService || createLegalService({ prisma, connectors });

  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
  app.use((req, res, next) => {
    req.requestId = req.get('x-request-id') || crypto.randomUUID();
    res.set('x-request-id', req.requestId);
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    credentials: false,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (configuredOrigins.has(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) return callback(null, true);
      return callback(new LegalWorkflowError('ORIGIN_NOT_ALLOWED', 'Request origin is not allowed', 403));
    },
  }));
  app.use(express.json({
    limit: '15mb',
    verify(req, res, buffer) {
      req.rawBody = Buffer.from(buffer);
    },
  }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
  app.use('/api', generalLimiter);
  app.use('/api/auth/login', authLimiter);

  app.get('/api/health/live', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', async (req, res) => {
    try {
      const migrations = await prisma.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 1');
      const latest = migrations[0];
      if (!latest || latest.migration_name !== EXPECTED_MIGRATION || !latest.finished_at || latest.rolled_back_at) {
        return res.status(503).json({ status: 'not_ready', reason: 'schema_not_current' });
      }
      await prisma.$queryRaw`SELECT 1`;
      return res.json({ status: 'ready', migration: EXPECTED_MIGRATION });
    } catch {
      return res.status(503).json({ status: 'not_ready', reason: 'database_unavailable' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/legal-documents', createLegalDocumentsRouter(service));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' }));

  const frontend = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(path.join(frontend, 'index.html'))) {
    app.use(express.static(frontend, { index: false, maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      return res.sendFile(path.join(frontend, 'index.html'));
    });
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof LegalWorkflowError ? error.status : 500;
    const payload = error instanceof LegalWorkflowError ? error.payload() : { error: 'Internal server error', code: 'INTERNAL_ERROR' };
    if (status >= 500) console.error(`[${req.requestId}] ${error.code || error.name || 'Error'}: ${error.message}`);
    return res.status(status).json(payload);
  });

  return app;
}

module.exports = { createApp, EXPECTED_MIGRATION };
