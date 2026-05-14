# Audit Note - movingCompany

Source: `_AUDIT/reports/batch_10.md` (lines 426-463).

## Original Audit Recommendations

### What's Missing
- Real-time GPS tracking for crews/trucks.
- Insurance/liability management.
- Customer portal for move tracking.
- Pre-move consultation/questionnaire AI analysis.
- Damage photo analysis (computer vision for claims).
- Market-rate pricing optimization.

### Custom Feature Suggestions
1. Real-time GPS + ETA tracking with customer notifications.
2. Vision-based damage assessment from photos.
3. Multi-vendor logistics.
4. Predictive crew scheduling.
5. Customer portal with AR pre-move visualization.
6. Referral/upsell agent.

## Implementations Applied

Added 3 AI endpoints to `backend/src/routes/ai.js` matching the existing OpenRouter+Prisma pattern with `authenticate` middleware:
- `POST /api/ai/pre-move-analyze`
- `POST /api/ai/damage-assess`
- `POST /api/ai/market-rate-pricing`

All use the existing `callOpenRouter` helper, return JSON-structured output with fallback to `rawAnalysis`. No new dependencies. Damage-assess accepts a `photoDescription` field as a vision-ready stand-in until vision-model integration lands.

## Backlog (Prioritized)

### High
- Real-time GPS tracking for crews/trucks.
- Customer portal for move tracking.
- Insurance/liability tracking.

### Medium
- True vision-model damage analysis (multi-modal SDK decision needed).
- Predictive crew scheduling.
- Multi-vendor logistics network.

### Low / Product Decisions
- AR pre-move visualization.
- Referral/upsell agent.

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS — frontend already wired.
- `frontend/src/pages/AIAdvanced.jsx` (tabbed: Pre-Move / Damage / Pricing) calls `preMoveAnalyze`, `damageAssess`, `marketRatePricing` from `api/index.js` (axios with JWT Bearer from localStorage).
- Route registered at `/ai-advanced` in `frontend/src/App.jsx`.
- Error handling surfaces `err.response?.data?.error` (covers 503 no-key); Tailwind styling matches rest of app.
- See `_AUDIT/apply3_logs/ab3_82.md`.

## Apply pass 4 (mechanical backlog)

- **Action:** SKIPPED — no MECHANICAL AI backlog remaining.
- All 3 audited mechanical AI endpoints (`/pre-move-analyze`, `/damage-assess`, `/market-rate-pricing`) were implemented in apply pass 2 and wired through `frontend/src/pages/AIAdvanced.jsx` in apply pass 3.
- Remaining backlog is non-AI infrastructure (real-time GPS, customer portal, insurance/liability tracking) → NEEDS-PRODUCT-DECISION; true vision-model damage analysis → NEEDS-CREDS / multi-modal SDK decision; AR pre-move visualization & referral agent → NEEDS-PRODUCT-DECISION.
- See `_AUDIT/apply4_logs/ab3_82.md`.
