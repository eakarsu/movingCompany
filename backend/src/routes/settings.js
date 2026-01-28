const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get company settings
router.get('/', authenticate, async (req, res) => {
  try {
    let settings = await prisma.companySettings.findFirst();

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.companySettings.create({
        data: {
          companyName: 'Moving Company',
          laborRate: 50,
          travelRate: 35,
          packingRate: 40,
          minHours: 2,
          taxRate: 0,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update company settings
router.put('/', authenticate, async (req, res) => {
  try {
    const existing = await prisma.companySettings.findFirst();

    let settings;
    if (existing) {
      settings = await prisma.companySettings.update({
        where: { id: existing.id },
        data: req.body,
      });
    } else {
      settings = await prisma.companySettings.create({
        data: req.body,
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get rates
router.get('/rates', authenticate, async (req, res) => {
  try {
    const settings = await prisma.companySettings.findFirst();

    res.json({
      laborRate: settings?.laborRate || 50,
      travelRate: settings?.travelRate || 35,
      packingRate: settings?.packingRate || 40,
      minHours: settings?.minHours || 2,
      taxRate: settings?.taxRate || 0,
    });
  } catch (error) {
    console.error('Get rates error:', error);
    res.status(500).json({ error: 'Failed to get rates' });
  }
});

// Update rates
router.put('/rates', authenticate, async (req, res) => {
  try {
    const existing = await prisma.companySettings.findFirst();

    const { laborRate, travelRate, packingRate, minHours, taxRate } = req.body;

    let settings;
    if (existing) {
      settings = await prisma.companySettings.update({
        where: { id: existing.id },
        data: { laborRate, travelRate, packingRate, minHours, taxRate },
      });
    } else {
      settings = await prisma.companySettings.create({
        data: {
          companyName: 'Moving Company',
          laborRate,
          travelRate,
          packingRate,
          minHours,
          taxRate,
        },
      });
    }

    res.json({
      laborRate: settings.laborRate,
      travelRate: settings.travelRate,
      packingRate: settings.packingRate,
      minHours: settings.minHours,
      taxRate: settings.taxRate,
    });
  } catch (error) {
    console.error('Update rates error:', error);
    res.status(500).json({ error: 'Failed to update rates' });
  }
});

// Get enum values for dropdowns
router.get('/enums', async (req, res) => {
  try {
    res.json({
      leadSources: ['WEBSITE', 'PHONE', 'REFERRAL', 'GOOGLE_ADS', 'FACEBOOK', 'YELP', 'THUMBTACK', 'OTHER'],
      leadStatuses: ['NEW', 'CONTACTED', 'QUALIFIED', 'SURVEY_SCHEDULED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST'],
      moveTypes: ['LOCAL', 'LONG_DISTANCE', 'COMMERCIAL', 'STORAGE', 'PACKING_ONLY'],
      propertyTypes: ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'OFFICE', 'WAREHOUSE', 'STORAGE_UNIT'],
      surveyTypes: ['VIRTUAL', 'ON_SITE'],
      quoteTypes: ['BINDING', 'NON_BINDING', 'NOT_TO_EXCEED'],
      quoteStatuses: ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
      insuranceOptions: ['BASIC', 'FULL_VALUE', 'THIRD_PARTY'],
      jobStatuses: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'LOADING', 'IN_TRANSIT', 'UNLOADING', 'COMPLETED', 'CANCELLED'],
      crewRoles: ['DRIVER', 'CREW_LEAD', 'MOVER', 'PACKER'],
      truckTypes: ['PICKUP', 'CARGO_VAN', 'BOX_TRUCK_12', 'BOX_TRUCK_16', 'BOX_TRUCK_20', 'BOX_TRUCK_26', 'SEMI'],
      equipmentTypes: ['DOLLY', 'HAND_TRUCK', 'FURNITURE_PAD', 'STRAP', 'TOOL_KIT', 'PIANO_BOARD', 'APPLIANCE_DOLLY', 'STAIR_CLIMBER', 'LIFT_GATE', 'CRATE'],
      itemCategories: ['FURNITURE', 'ELECTRONICS', 'APPLIANCE', 'BOXES', 'FRAGILE', 'ARTWORK', 'ANTIQUE', 'PIANO', 'POOL_TABLE', 'GYM_EQUIPMENT', 'OUTDOOR', 'GARAGE', 'OTHER'],
      itemConditions: ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'],
      invoiceStatuses: ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'],
      paymentMethods: ['CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ACH', 'ZELLE', 'VENMO', 'OTHER'],
      claimStatuses: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED', 'SETTLED'],
      claimTypes: ['DAMAGE', 'LOSS', 'DELAY', 'OTHER'],
      communicationTypes: ['EMAIL', 'SMS', 'PHONE', 'IN_APP'],
      userRoles: ['ADMIN', 'MANAGER', 'STAFF', 'DRIVER', 'CREW_LEAD'],
      // Storage sizes for storage units
      storageSizes: ['5x5', '5x10', '10x10', '10x15', '10x20', '15x20', '20x20', '20x25', '20x30', '25x30'],
      // Room types for AI volume estimator
      roomTypes: [
        { value: 'living_room', label: 'Living Room' },
        { value: 'bedroom', label: 'Bedroom' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'dining_room', label: 'Dining Room' },
        { value: 'bathroom', label: 'Bathroom' },
        { value: 'garage', label: 'Garage' },
        { value: 'basement', label: 'Basement' },
        { value: 'attic', label: 'Attic' },
        { value: 'office', label: 'Office' },
        { value: 'laundry', label: 'Laundry Room' },
        { value: 'storage', label: 'Storage Room' },
      ],
      // Item density levels for AI
      itemDensities: [
        { value: 'low', label: 'Light' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'Heavy' },
      ],
      // Communication message types for AI
      communicationMessageTypes: [
        { value: 'reminder', label: 'Pre-Move Reminder' },
        { value: 'confirmation', label: 'Booking Confirmation' },
        { value: 'status_update', label: 'Status Update' },
        { value: 'follow_up', label: 'Post-Move Follow-up' },
        { value: 'thank_you', label: 'Thank You Message' },
        { value: 'review_request', label: 'Review Request' },
      ],
      // Storage statuses
      storageStatuses: ['RESERVED', 'ACTIVE', 'ENDED', 'OVERDUE'],
    });
  } catch (error) {
    console.error('Get enums error:', error);
    res.status(500).json({ error: 'Failed to get enums' });
  }
});

module.exports = router;
