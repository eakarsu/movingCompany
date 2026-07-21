const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { requireSecret } = require('../config');
const { authenticate, authorize, TOKEN_AUDIENCE, TOKEN_ISSUER } = require('../middleware/auth');

const router = express.Router();

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

const password = z.string().min(12).max(128)
  .regex(/[a-z]/, 'Password requires a lowercase letter')
  .regex(/[A-Z]/, 'Password requires an uppercase letter')
  .regex(/[0-9]/, 'Password requires a number')
  .regex(/[^A-Za-z0-9]/, 'Password requires a symbol');

function validationError(res, result) {
  return res.status(422).json({ error: 'Request validation failed', code: 'VALIDATION_ERROR', details: result.error.flatten() });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
  };
}

function signSession(user) {
  return jwt.sign(
    { authVersion: user.authVersion, role: user.role },
    requireSecret('JWT_SECRET'),
    {
      algorithm: 'HS256',
      audience: TOKEN_AUDIENCE,
      issuer: TOKEN_ISSUER,
      expiresIn: '1h',
      jwtid: crypto.randomUUID(),
      subject: user.id,
    },
  );
}

router.post('/login', async (req, res) => {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(1).max(128) }).strict().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const valid = user ? await bcrypt.compare(parsed.data.password, user.password) : false;
    if (!valid || !user.isActive) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    if (!user.emailVerified) return res.status(403).json({ error: 'Account is not verified', code: 'ACCOUNT_NOT_VERIFIED' });
    return res.json({ user: publicUser(user), token: signSession(user), expiresIn: 3600 });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ error: 'Login failed', code: 'LOGIN_FAILED' });
  }
});

router.post('/logout', authenticate, asyncRoute(async (req, res) => {
  await prisma.user.update({ where: { id: req.user.id }, data: { authVersion: { increment: 1 } } });
  return res.json({ message: 'All sessions were revoked' });
}));

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

router.put('/profile', authenticate, asyncRoute(async (req, res) => {
  const parsed = z.object({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100), phone: z.string().trim().max(40).nullable().optional() }).strict().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: parsed.data });
  return res.json({ user: publicUser(user) });
}));

router.put('/password', authenticate, asyncRoute(async (req, res) => {
  const parsed = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!await bcrypt.compare(parsed.data.currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect', code: 'CURRENT_PASSWORD_INVALID' });
  }
  const nextHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: nextHash, authVersion: { increment: 1 } } });
  return res.json({ message: 'Password updated; all sessions were revoked' });
}));

router.get('/users', authenticate, authorize('ADMIN'), asyncRoute(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ users });
}));

router.get('/users/directory', authenticate, authorize('ADMIN', 'MANAGER'), asyncRoute(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  return res.json({ users });
}));

router.post('/users', authenticate, authorize('ADMIN'), asyncRoute(async (req, res) => {
  const parsed = z.object({
    email: z.string().trim().toLowerCase().email().max(320),
    password,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(40).nullable().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'DRIVER', 'CREW_LEAD']),
  }).strict().safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  try {
    const user = await prisma.user.create({
      data: {
        ...parsed.data,
        password: await bcrypt.hash(parsed.data.password, 12),
        emailVerified: true,
      },
    });
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Email is already provisioned', code: 'EMAIL_CONFLICT' });
    throw error;
  }
}));

router.put('/users/:id', authenticate, authorize('ADMIN'), asyncRoute(async (req, res) => {
  const parsed = z.object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'DRIVER', 'CREW_LEAD']).optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  if (req.params.id === req.user.id && parsed.data.isActive === false) {
    return res.status(409).json({ error: 'Administrators cannot deactivate their own active session', code: 'SELF_DEACTIVATION_BLOCKED' });
  }
  if (req.params.id === req.user.id && parsed.data.role && parsed.data.role !== 'ADMIN') {
    return res.status(409).json({ error: 'Administrators cannot remove their own administrator role', code: 'SELF_DEMOTION_BLOCKED' });
  }
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { ...parsed.data, authVersion: { increment: 1 } },
    });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    throw error;
  }
}));

module.exports = router;
