// Vision-based damage assessment (claim photos → severity score → reserve).
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

router.post('/assess', authenticate, async (req, res) => {
  try {
    const { imageUrl, claimId, itemDescription } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });
    if (!OPENROUTER_API_KEY) return res.status(503).json({ error: 'OPENROUTER_API_KEY not configured' });

    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Item: ${itemDescription || 'unknown'}.\nAssess damage in the photo. Return JSON {"severity":"none|minor|moderate|severe","damage_types":[string],"estimated_repair_usd":number,"reserve_usd":number,"notes":string}.` },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 500
      })
    });
    const d = await r.json();
    if (d.error) return res.status(502).json({ error: d.error.message });
    let parsed;
    try { parsed = JSON.parse(d.choices[0].message.content.match(/\{[\s\S]*\}/)[0]); } catch { parsed = { raw: d.choices[0].message.content }; }
    res.json({ claimId, assessment: parsed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
