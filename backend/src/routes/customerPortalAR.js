// Customer portal with AR pre-move room scan and volume estimation.
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// In-memory portal sessions.
const sessions = new Map();

// POST /api/customer-portal-ar/start
router.post('/start', authenticate, (req, res) => {
  const { customerId } = req.body;
  const id = `arp_${Date.now()}`;
  sessions.set(id, { id, customerId, rooms: [], createdAt: new Date() });
  res.json({ sessionId: id });
});

// POST /api/customer-portal-ar/:sessionId/room
router.post('/:sessionId/room', authenticate, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'session not found' });
  const { roomName, dimensions, items = [] } = req.body;
  if (!roomName || !dimensions) return res.status(400).json({ error: 'roomName and dimensions (l,w,h ft) required' });
  const cuft = (dimensions.length || 0) * (dimensions.width || 0) * (dimensions.height || 8) * 0.45; // packed factor
  const itemCuft = items.reduce((s, it) => s + (Number(it.estCuft) || 5), 0);
  const totalCuft = Math.max(cuft, itemCuft);
  const room = { name: roomName, dimensions, items, estimatedCuft: Math.round(totalCuft) };
  s.rooms.push(room);
  res.json({ session: s.id, room });
});

// GET /api/customer-portal-ar/:sessionId/estimate
router.get('/:sessionId/estimate', authenticate, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'session not found' });
  const totalCuft = s.rooms.reduce((sum, r) => sum + r.estimatedCuft, 0);
  // Average moving truck holds ~1000 cuft; ~250 cuft per laborer-hour.
  const truckCount = Math.max(1, Math.ceil(totalCuft / 1000));
  const laborHours = Math.ceil(totalCuft / 250);
  res.json({
    rooms: s.rooms.length,
    totalCuft,
    estimatedTrucks: truckCount,
    estimatedLaborHours: laborHours,
    estimatedQuoteUSD: Math.round(totalCuft * 1.2 + laborHours * 65)
  });
});

module.exports = router;
