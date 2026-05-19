// Insurance partner integrations + auto-issue COI per move.
// TODO: configure credentials — INSURANCE_API_KEY for partner portal.
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// In-memory COI store.
const cois = new Map();

router.post('/quote', authenticate, async (req, res) => {
  try {
    const { jobId, coverageUSD = 100000, propertyValueUSD = 50000 } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId required' });
    // Simple actuarial-ish premium model: 0.6% of coverage + 0.2% property uplift.
    const premium = Math.round(coverageUSD * 0.006 + propertyValueUSD * 0.002);
    res.json({ jobId, coverageUSD, propertyValueUSD, premiumUSD: premium });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/issue-coi', authenticate, async (req, res) => {
  const { jobId, holder, holderAddress, coverageUSD } = req.body;
  if (!jobId || !holder) return res.status(400).json({ error: 'jobId and holder required' });
  const coi = {
    id: `coi_${Date.now()}`,
    jobId,
    holder,
    holderAddress,
    coverageUSD: coverageUSD || 100000,
    issuedAt: new Date(),
    pdfUrl: process.env.INSURANCE_API_KEY ? `https://partner.example/coi/${jobId}.pdf` : null
  };
  cois.set(coi.id, coi);
  res.json({
    ...coi,
    note: process.env.INSURANCE_API_KEY ? 'Live partner mode' : 'Mock COI — INSURANCE_API_KEY not configured'
  });
});

router.get('/coi/:id', authenticate, (req, res) => {
  const c = cois.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'coi not found' });
  res.json(c);
});

module.exports = router;
