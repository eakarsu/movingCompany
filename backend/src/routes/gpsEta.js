// Real-time GPS + customer ETA notifications.
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// In-memory truck position cache; replace with Redis when ready.
const positions = new Map();

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

router.post('/position', authenticate, (req, res) => {
  const { truckId, lat, lng, speed = 0, heading = 0 } = req.body;
  if (!truckId || lat == null || lng == null) return res.status(400).json({ error: 'truckId, lat, lng required' });
  positions.set(truckId, { truckId, lat, lng, speed, heading, at: new Date() });
  res.json({ ok: true });
});

router.get('/position/:truckId', authenticate, (req, res) => {
  const p = positions.get(req.params.truckId);
  if (!p) return res.status(404).json({ error: 'no position recorded' });
  res.json(p);
});

router.get('/eta', authenticate, (req, res) => {
  const { truckId, destLat, destLng } = req.query;
  if (!truckId || destLat == null || destLng == null) return res.status(400).json({ error: 'truckId, destLat, destLng required' });
  const p = positions.get(truckId);
  if (!p) return res.status(404).json({ error: 'no position recorded' });
  const km = haversineKm({ lat: p.lat, lng: p.lng }, { lat: Number(destLat), lng: Number(destLng) });
  const speed = Math.max(20, p.speed || 30); // km/h floor
  const etaMin = Math.round((km / speed) * 60);
  res.json({ truckId, distanceKm: Number(km.toFixed(2)), etaMinutes: etaMin });
});

module.exports = router;
