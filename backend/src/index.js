const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const surveyRoutes = require('./routes/surveys');
const quoteRoutes = require('./routes/quotes');
const jobRoutes = require('./routes/jobs');
const crewRoutes = require('./routes/crew');
const truckRoutes = require('./routes/trucks');
const equipmentRoutes = require('./routes/equipment');
const storageRoutes = require('./routes/storage');
const communicationRoutes = require('./routes/communications');
const inventoryRoutes = require('./routes/inventory');
const invoiceRoutes = require('./routes/invoices');
const claimRoutes = require('./routes/claims');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/crew', crewRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gps-eta', require('./routes/gpsEta')); app.use('/api/damage-vision', require('./routes/damageVision')); app.use('/api/customer-portal-ar', require('./routes/customerPortalAR')); app.use('/api/market-rate-pricing', require('./routes/marketRatePricing')); app.use('/api/insurance-partners', require('./routes/insurancePartners')); app.use('/api/referral-upsell', require('./routes/referralUpsell'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

// === Batch 10 Gaps & Frontend Mounts === (mounts)
app.use('/api/gap-no-vision-based-damage-assessment-from', require('./routes/gap_no_vision_based_damage_assessment_from'));
app.use('/api/gap-no-pre-move-questionnaire-deep-analysis', require('./routes/gap_no_pre_move_questionnaire_deep_analysis'));
app.use('/api/gap-no-market-rate-pricing-optimizer', require('./routes/gap_no_market_rate_pricing_optimizer'));
app.use('/api/gap-no-predictive-demand-pre-positioning-of', require('./routes/gap_no_predictive_demand_pre_positioning_of'));
app.use('/api/gap-no-customer-sentiment-dashboard-across-surveys', require('./routes/gap_no_customer_sentiment_dashboard_across_surveys'));
app.use('/api/gap-no-real-time-gps-tracking-for', require('./routes/gap_no_real_time_gps_tracking_for'));
app.use('/api/gap-no-customer-portal-move-tracker', require('./routes/gap_no_customer_portal_move_tracker'));
app.use('/api/gap-no-insurance-liability-policy-management', require('./routes/gap_no_insurance_liability_policy_management'));
app.use('/api/gap-no-payment-processing-module-stripe-ach', require('./routes/gap_no_payment_processing_module_stripe_ach'));
app.use('/api/gap-no-webhooks-for-partners-storage-packing', require('./routes/gap_no_webhooks_for_partners_storage_packing'));
app.use('/api/gap-no-multi-vendor-logistics-marketplace', require('./routes/gap_no_multi_vendor_logistics_marketplace'));
app.use('/api/gap-no-ar-pre-move-visualization', require('./routes/gap_no_ar_pre_move_visualization'));
