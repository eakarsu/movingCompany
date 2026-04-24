const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();
const prisma = new PrismaClient();

// Get all inventory items
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, jobId, surveyId, condition } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(req.query);

    const where = {};
    if (category) where.category = category;
    if (jobId) where.jobId = jobId;
    if (surveyId) where.surveyId = surveyId;
    if (condition) where.condition = condition;

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          survey: {
            select: { id: true, leadId: true },
          },
          job: {
            select: { id: true, jobNumber: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json(paginatedResponse(items, total, page, limit));
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to get inventory items' });
  }
});

// Get inventory item by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: {
        survey: true,
        job: true,
        claims: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Failed to get inventory item' });
  }
});

// Create inventory item
router.post('/', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.create({
      data: req.body,
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item
router.put('/:id', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(item);
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete inventory item
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.inventoryItem.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Inventory item deleted' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Mark item as loaded
router.post('/:id/load', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        loadedAt: new Date(),
        boxNumber: req.body.boxNumber,
        labelId: req.body.labelId,
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Load item error:', error);
    res.status(500).json({ error: 'Failed to mark item as loaded' });
  }
});

// Mark item as unloaded
router.post('/:id/unload', authenticate, async (req, res) => {
  try {
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        unloadedAt: new Date(),
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Unload item error:', error);
    res.status(500).json({ error: 'Failed to mark item as unloaded' });
  }
});

// Verify item
router.post('/:id/verify', authenticate, async (req, res) => {
  try {
    const { condition, conditionNotes } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        verifiedAt: new Date(),
        condition,
        conditionNotes,
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Verify item error:', error);
    res.status(500).json({ error: 'Failed to verify item' });
  }
});

// Get job inventory summary
router.get('/job/:jobId/summary', authenticate, async (req, res) => {
  try {
    const [
      totalItems,
      loadedItems,
      unloadedItems,
      verifiedItems,
      damagedItems,
    ] = await Promise.all([
      prisma.inventoryItem.count({ where: { jobId: req.params.jobId } }),
      prisma.inventoryItem.count({
        where: { jobId: req.params.jobId, loadedAt: { not: null } },
      }),
      prisma.inventoryItem.count({
        where: { jobId: req.params.jobId, unloadedAt: { not: null } },
      }),
      prisma.inventoryItem.count({
        where: { jobId: req.params.jobId, verifiedAt: { not: null } },
      }),
      prisma.inventoryItem.count({
        where: { jobId: req.params.jobId, condition: 'DAMAGED' },
      }),
    ]);

    res.json({
      totalItems,
      loadedItems,
      unloadedItems,
      verifiedItems,
      damagedItems,
      loadingProgress: totalItems > 0 ? ((loadedItems / totalItems) * 100).toFixed(1) : 0,
      unloadingProgress: totalItems > 0 ? ((unloadedItems / totalItems) * 100).toFixed(1) : 0,
    });
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ error: 'Failed to get inventory summary' });
  }
});

// Bulk create inventory items
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { items, surveyId, jobId } = req.body;

    const createdItems = await prisma.inventoryItem.createMany({
      data: items.map((item) => ({
        ...item,
        surveyId,
        jobId,
      })),
    });

    res.status(201).json({ count: createdItems.count });
  } catch (error) {
    console.error('Bulk create inventory error:', error);
    res.status(500).json({ error: 'Failed to bulk create inventory items' });
  }
});

// Transfer inventory from survey to job
router.post('/transfer/:surveyId/:jobId', authenticate, async (req, res) => {
  try {
    const updated = await prisma.inventoryItem.updateMany({
      where: { surveyId: req.params.surveyId },
      data: { jobId: req.params.jobId },
    });

    res.json({ count: updated.count });
  } catch (error) {
    console.error('Transfer inventory error:', error);
    res.status(500).json({ error: 'Failed to transfer inventory' });
  }
});

module.exports = router;
