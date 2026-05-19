// Referral / upsell agent (packing supplies, cleaning, storage).
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function ai(messages, max = 600) {
  if (!OPENROUTER_API_KEY) {
    const e = new Error('OPENROUTER_API_KEY not configured'); e.statusCode = 503; throw e;
  }
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: max, temperature: 0.5 })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.choices[0].message.content;
}

router.post('/suggest', authenticate, async (req, res) => {
  try {
    const { job, customer } = req.body;
    if (!job) return res.status(400).json({ error: 'job required' });
    const sys = `You suggest upsells for a move. Return JSON {"suggestions":[{"item":string,"reason":string,"priceUSD":number,"confidence":0-1}]}`;
    const out = await ai([{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify({ job, customer }).slice(0, 4000) }]);
    let parsed;
    try { parsed = JSON.parse(out.match(/\{[\s\S]*\}/)[0]); } catch { parsed = { raw: out }; }
    res.json(parsed);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// POST /api/referral-upsell/refer — record a referral.
const referrals = [];
router.post('/refer', authenticate, (req, res) => {
  const { fromCustomerId, toEmail, channel = 'email' } = req.body;
  if (!fromCustomerId || !toEmail) return res.status(400).json({ error: 'fromCustomerId and toEmail required' });
  referrals.push({ id: referrals.length + 1, fromCustomerId, toEmail, channel, createdAt: new Date() });
  res.json({ ok: true, total: referrals.length });
});

router.get('/referrals', authenticate, (_req, res) => {
  res.json({ count: referrals.length, recent: referrals.slice(-50) });
});

module.exports = router;
