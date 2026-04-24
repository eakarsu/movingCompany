const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all leads
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, source, assignedTo, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (assignedTo) where.assignedToId = assignedTo;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { followUps: true, quotes: true },
          },
        },
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.lead.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      data: leads,
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Bulk delete leads
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${result.count} leads deleted`, count: result.count });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Bulk update leads
router.put('/bulk-update', authenticate, async (req, res) => {
  try {
    const { ids, data } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await prisma.lead.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${result.count} leads updated`, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// Get lead by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
        },
        surveys: {
          include: {
            photos: true,
            inventoryItems: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to get lead' });
  }
});

// Create lead
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };

    // Convert moveDate from date string to DateTime if provided
    if (data.moveDate && typeof data.moveDate === 'string') {
      data.moveDate = new Date(data.moveDate).toISOString();
    }

    const lead = await prisma.lead.create({
      data,
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', authenticate, async (req, res) => {
  try {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(lead);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.lead.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Qualify lead
router.post('/:id/qualify', authenticate, async (req, res) => {
  try {
    const { qualificationScore } = req.body;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        status: 'QUALIFIED',
        qualificationScore,
        qualifiedAt: new Date(),
        qualifiedBy: req.user.id,
      },
    });

    res.json(lead);
  } catch (error) {
    console.error('Qualify lead error:', error);
    res.status(500).json({ error: 'Failed to qualify lead' });
  }
});

// Assign lead
router.post('/:id/assign', authenticate, async (req, res) => {
  try {
    const { assignedToId } = req.body;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { assignedToId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json(lead);
  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({ error: 'Failed to assign lead' });
  }
});

// Convert lead to job
router.post('/:id/convert', authenticate, async (req, res) => {
  try {
    const { quoteId } = req.body;
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { quotes: true },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote || quote.leadId !== lead.id) {
      return res.status(400).json({ error: 'Invalid quote' });
    }

    // Generate job number
    const jobCount = await prisma.job.count();
    const jobNumber = `JOB-${String(jobCount + 1).padStart(6, '0')}`;

    // Create job from lead and quote
    const job = await prisma.job.create({
      data: {
        jobNumber,
        leadId: lead.id,
        quoteId: quote.id,
        createdById: req.user.id,
        status: 'SCHEDULED',
        moveDate: lead.moveDate || new Date(),
        originAddress: lead.originAddress || '',
        originCity: lead.originCity || '',
        originState: lead.originState || '',
        originZip: lead.originZip || '',
        destAddress: lead.destAddress || '',
        destCity: lead.destCity || '',
        destState: lead.destState || '',
        destZip: lead.destZip || '',
        crewSize: quote.crewSize,
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'WON',
        convertedAt: new Date(),
      },
    });

    // Update quote status
    await prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    res.json(job);
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// Get lead statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      quotedLeads,
      wonLeads,
      lostLeads,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'NEW' } }),
      prisma.lead.count({ where: { status: 'QUALIFIED' } }),
      prisma.lead.count({ where: { status: 'QUOTED' } }),
      prisma.lead.count({ where: { status: 'WON' } }),
      prisma.lead.count({ where: { status: 'LOST' } }),
    ]);

    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : 0;

    res.json({
      totalLeads,
      newLeads,
      qualifiedLeads,
      quotedLeads,
      wonLeads,
      lostLeads,
      conversionRate,
    });
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ error: 'Failed to get lead statistics' });
  }
});

// Add follow-up
router.post('/:id/followups', authenticate, async (req, res) => {
  try {
    const { type, scheduledAt, notes } = req.body;

    const followUp = await prisma.followUp.create({
      data: {
        leadId: req.params.id,
        type,
        scheduledAt: new Date(scheduledAt),
        notes,
      },
    });

    res.status(201).json(followUp);
  } catch (error) {
    console.error('Create follow-up error:', error);
    res.status(500).json({ error: 'Failed to create follow-up' });
  }
});

// Complete follow-up
router.put('/followups/:id/complete', authenticate, async (req, res) => {
  try {
    const { outcome, notes } = req.body;

    const followUp = await prisma.followUp.update({
      where: { id: req.params.id },
      data: {
        completedAt: new Date(),
        outcome,
        notes,
      },
    });

    res.json(followUp);
  } catch (error) {
    console.error('Complete follow-up error:', error);
    res.status(500).json({ error: 'Failed to complete follow-up' });
  }
});

// Get follow-ups
router.get('/followups/pending', authenticate, async (req, res) => {
  try {
    const followUps = await prisma.followUp.findMany({
      where: {
        completedAt: null,
        scheduledAt: {
          gte: new Date(),
        },
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(followUps);
  } catch (error) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({ error: 'Failed to get follow-ups' });
  }
});

module.exports = router;
