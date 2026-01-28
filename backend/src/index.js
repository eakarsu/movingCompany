const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
