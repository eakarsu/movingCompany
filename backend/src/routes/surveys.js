const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all surveys
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, leadId, completed } = req.query;

    const where = {};
    if (type) where.type = type;
    if (leadId) where.leadId = leadId;
    if (completed === 'true') where.completedAt = { not: null };
    if (completed === 'false') where.completedAt = null;

    const surveys = await prisma.survey.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            originAddress: true,
          },
        },
        _count: {
          select: { photos: true, inventoryItems: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    res.json(surveys);
  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ error: 'Failed to get surveys' });
  }
});

// Get survey by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        photos: true,
        inventoryItems: true,
      },
    });

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.json(survey);
  } catch (error) {
    console.error('Get survey error:', error);
    res.status(500).json({ error: 'Failed to get survey' });
  }
});

// Create survey
router.post('/', authenticate, async (req, res) => {
  try {
    const { leadId, type, scheduledAt } = req.body;

    const survey = await prisma.survey.create({
      data: {
        leadId,
        type,
        scheduledAt: new Date(scheduledAt),
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'SURVEY_SCHEDULED' },
    });

    res.status(201).json(survey);
  } catch (error) {
    console.error('Create survey error:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

// Update survey
router.put('/:id', authenticate, async (req, res) => {
  try {
    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(survey);
  } catch (error) {
    console.error('Update survey error:', error);
    res.status(500).json({ error: 'Failed to update survey' });
  }
});

// Complete survey
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const {
      totalVolume,
      totalWeight,
      estimatedHours,
      accessNotes,
      specialItems,
      packingNeeded,
      packingHours,
    } = req.body;

    const survey = await prisma.survey.update({
      where: { id: req.params.id },
      data: {
        completedAt: new Date(),
        conductedBy: req.user.id,
        totalVolume,
        totalWeight,
        estimatedHours,
        accessNotes,
        specialItems,
        packingNeeded,
        packingHours,
      },
      include: {
        lead: true,
      },
    });

    // Update lead with estimated volume
    await prisma.lead.update({
      where: { id: survey.leadId },
      data: { estimatedVolume: totalVolume },
    });

    res.json(survey);
  } catch (error) {
    console.error('Complete survey error:', error);
    res.status(500).json({ error: 'Failed to complete survey' });
  }
});

// Add photo to survey
router.post('/:id/photos', authenticate, async (req, res) => {
  try {
    const { url, room, description } = req.body;

    const photo = await prisma.surveyPhoto.create({
      data: {
        surveyId: req.params.id,
        url,
        room,
        description,
      },
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error('Add photo error:', error);
    res.status(500).json({ error: 'Failed to add photo' });
  }
});

// Add inventory item to survey
router.post('/:id/inventory', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        surveyId: req.params.id,
        ...req.body,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Add inventory item error:', error);
    res.status(500).json({ error: 'Failed to add inventory item' });
  }
});

// Get scheduled surveys
router.get('/scheduled/upcoming', authenticate, async (req, res) => {
  try {
    const surveys = await prisma.survey.findMany({
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
            originAddress: true,
            originCity: true,
            originState: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(surveys);
  } catch (error) {
    console.error('Get scheduled surveys error:', error);
    res.status(500).json({ error: 'Failed to get scheduled surveys' });
  }
});

module.exports = router;
