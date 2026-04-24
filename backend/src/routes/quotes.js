const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();
const prisma = new PrismaClient();

// Get all quotes
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, leadId, type } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(req.query);

    const where = {};
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;
    if (type) where.type = type;

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              moveDate: true,
              originCity: true,
              destCity: true,
            },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ]);

    res.json(paginatedResponse(quotes, total, page, limit));
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Failed to get quotes' });
  }
});

// Bulk delete
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await prisma.quote.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${result.count} items deleted`, count: result.count });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Bulk update
router.put('/bulk-update', authenticate, async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await prisma.quote.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${result.count} items updated`, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// Get quote by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Failed to get quote' });
  }
});

// Create quote
router.post('/', authenticate, async (req, res) => {
  try {
    // Generate quote number
    const quoteCount = await prisma.quote.count();
    const quoteNumber = `QT-${String(quoteCount + 1).padStart(6, '0')}`;

    const {
      leadId,
      type,
      estimatedHours,
      crewSize,
      laborRate,
      travelHours,
      travelRate,
      packingHours,
      packingRate,
      packingMaterials,
      storageMonths,
      storageFee,
      insuranceOption,
      insuranceFee,
      discount,
      discountReason,
      taxes,
      notes,
      validDays,
    } = req.body;

    // Calculate totals
    const laborTotal = estimatedHours * crewSize * laborRate;
    const travelTotal = (travelHours || 0) * (travelRate || 0);
    const packingTotal = (packingHours || 0) * (packingRate || 0);
    const storageTotal = (storageMonths || 0) * (storageFee || 0);

    const subtotal = laborTotal + travelTotal + packingTotal +
                     (packingMaterials || 0) + storageTotal + (insuranceFee || 0);
    const total = subtotal - (discount || 0) + (taxes || 0);

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (validDays || 30));

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        leadId,
        createdById: req.user.id,
        type,
        status: 'DRAFT',
        estimatedHours,
        crewSize,
        laborRate,
        laborTotal,
        travelHours,
        travelRate,
        travelTotal,
        packingHours,
        packingRate,
        packingTotal,
        packingMaterials,
        storageMonths,
        storageFee,
        insuranceOption,
        insuranceFee,
        subtotal,
        discount: discount || 0,
        discountReason,
        taxes: taxes || 0,
        total,
        validUntil,
        notes,
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// Update quote
router.put('/:id', authenticate, async (req, res) => {
  try {
    const existingQuote = await prisma.quote.findUnique({
      where: { id: req.params.id },
    });

    if (!existingQuote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const {
      type,
      estimatedHours,
      crewSize,
      laborRate,
      travelHours,
      travelRate,
      packingHours,
      packingRate,
      packingMaterials,
      storageMonths,
      storageFee,
      insuranceOption,
      insuranceFee,
      discount,
      discountReason,
      taxes,
      notes,
    } = req.body;

    // Recalculate totals
    const laborTotal = estimatedHours * crewSize * laborRate;
    const travelTotal = (travelHours || 0) * (travelRate || 0);
    const packingTotal = (packingHours || 0) * (packingRate || 0);
    const storageTotal = (storageMonths || 0) * (storageFee || 0);

    const subtotal = laborTotal + travelTotal + packingTotal +
                     (packingMaterials || 0) + storageTotal + (insuranceFee || 0);
    const total = subtotal - (discount || 0) + (taxes || 0);

    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        type,
        estimatedHours,
        crewSize,
        laborRate,
        laborTotal,
        travelHours,
        travelRate,
        travelTotal,
        packingHours,
        packingRate,
        packingTotal,
        packingMaterials,
        storageMonths,
        storageFee,
        insuranceOption,
        insuranceFee,
        subtotal,
        discount: discount || 0,
        discountReason,
        taxes: taxes || 0,
        total,
        notes,
      },
    });

    res.json(quote);
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// Send quote
router.post('/:id/send', authenticate, async (req, res) => {
  try {
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'SENT' },
      include: {
        lead: true,
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: quote.leadId },
      data: { status: 'QUOTED' },
    });

    res.json(quote);
  } catch (error) {
    console.error('Send quote error:', error);
    res.status(500).json({ error: 'Failed to send quote' });
  }
});

// Accept quote
router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    res.json(quote);
  } catch (error) {
    console.error('Accept quote error:', error);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
});

// Reject quote
router.post('/:id/reject', authenticate, async (req, res) => {
  try {
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });

    res.json(quote);
  } catch (error) {
    console.error('Reject quote error:', error);
    res.status(500).json({ error: 'Failed to reject quote' });
  }
});

// Clone quote
router.post('/:id/clone', authenticate, async (req, res) => {
  try {
    const original = await prisma.quote.findUnique({
      where: { id: req.params.id },
    });

    if (!original) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quoteCount = await prisma.quote.count();
    const quoteNumber = `QT-${String(quoteCount + 1).padStart(6, '0')}`;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const { id, quoteNumber: _, createdAt, updatedAt, status, acceptedAt, ...quoteData } = original;

    const quote = await prisma.quote.create({
      data: {
        ...quoteData,
        quoteNumber,
        createdById: req.user.id,
        status: 'DRAFT',
        validUntil,
      },
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Clone quote error:', error);
    res.status(500).json({ error: 'Failed to clone quote' });
  }
});

module.exports = router;
