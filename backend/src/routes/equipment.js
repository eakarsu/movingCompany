const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();
const prisma = new PrismaClient();

// Get all equipment
router.get('/', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(req.query);

    const where = {};
    if (type) where.type = type;

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.equipment.count({ where }),
    ]);

    res.json(paginatedResponse(equipment, total, page, limit));
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// Bulk delete
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await prisma.equipment.deleteMany({ where: { id: { in: ids } } });
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
    const result = await prisma.equipment.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${result.count} items updated`, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// Get equipment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: {
            job: {
              select: {
                id: true,
                jobNumber: true,
                moveDate: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ error: 'Failed to get equipment' });
  }
});

// Create equipment
router.post('/', authenticate, async (req, res) => {
  try {
    const { quantity, ...rest } = req.body;

    const equipment = await prisma.equipment.create({
      data: {
        ...rest,
        quantity,
        available: quantity,
      },
    });

    res.status(201).json(equipment);
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

// Update equipment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(equipment);
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// Delete equipment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.equipment.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Equipment deleted' });
  } catch (error) {
    console.error('Delete equipment error:', error);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

// Get equipment availability
router.get('/availability/check', authenticate, async (req, res) => {
  try {
    const { date } = req.query;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all equipment with their current assignments
    const equipment = await prisma.equipment.findMany({
      include: {
        assignments: {
          where: {
            returnedAt: null,
            job: {
              moveDate: {
                gte: targetDate,
                lt: nextDay,
              },
              status: {
                not: 'CANCELLED',
              },
            },
          },
        },
      },
    });

    const availability = equipment.map((eq) => {
      const assignedQuantity = eq.assignments.reduce((sum, a) => sum + a.quantity, 0);
      return {
        ...eq,
        assignedQuantity,
        availableQuantity: eq.quantity - assignedQuantity,
      };
    });

    res.json(availability);
  } catch (error) {
    console.error('Get equipment availability error:', error);
    res.status(500).json({ error: 'Failed to get equipment availability' });
  }
});

// Get low stock equipment
router.get('/stock/low', authenticate, async (req, res) => {
  try {
    const equipment = await prisma.equipment.findMany({
      where: {
        available: {
          lte: 2,
        },
      },
    });

    res.json(equipment);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ error: 'Failed to get low stock equipment' });
  }
});

// Adjust quantity
router.post('/:id/adjust', authenticate, async (req, res) => {
  try {
    const { adjustment, reason } = req.body;

    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        quantity: { increment: adjustment },
        available: { increment: adjustment },
      },
    });

    res.json(equipment);
  } catch (error) {
    console.error('Adjust quantity error:', error);
    res.status(500).json({ error: 'Failed to adjust quantity' });
  }
});

module.exports = router;
