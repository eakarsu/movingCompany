const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { requireSecret } = require('../config');

const TOKEN_ISSUER = 'moving-company-legal-documents';
const TOKEN_AUDIENCE = 'moving-company-operators';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return res.status(401).json({ error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' });
    const decoded = jwt.verify(token, requireSecret('JWT_SECRET'), {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        authVersion: true,
      },
    });
    if (!user || !user.isActive || decoded.authVersion !== user.authVersion) {
      return res.status(401).json({ error: 'Session is no longer valid', code: 'SESSION_REVOKED' });
    }
    req.user = user;
    req.tokenClaims = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session', code: 'INVALID_SESSION' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
  return next();
};

module.exports = { authenticate, authorize, TOKEN_AUDIENCE, TOKEN_ISSUER };
