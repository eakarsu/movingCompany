const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all trucks
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, isActive } = req.query;

    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const trucks = await prisma.truck.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(trucks);
  } catch (error) {
    console.error('Get trucks error:', error);
    res.status(500).json({ error: 'Failed to get trucks' });
  }
});

// Get truck by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.findUnique({
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
                originCity: true,
                destCity: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    res.json(truck);
  } catch (error) {
    console.error('Get truck error:', error);
    res.status(500).json({ error: 'Failed to get truck' });
  }
});

// Create truck
router.post('/', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.create({
      data: req.body,
    });

    res.status(201).json(truck);
  } catch (error) {
    console.error('Create truck error:', error);
    res.status(500).json({ error: 'Failed to create truck' });
  }
});

// Update truck
router.put('/:id', authenticate, async (req, res) => {
  try {
    const truck = await prisma.truck.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(truck);
  } catch (error) {
    console.error('Update truck error:', error);
    res.status(500).json({ error: 'Failed to update truck' });
  }
});

// Delete truck
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.truck.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Truck deactivated' });
  } catch (error) {
    console.error('Delete truck error:', error);
    res.status(500).json({ error: 'Failed to delete truck' });
  }
});

// Get truck availability
router.get('/availability/:date', authenticate, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const allTrucks = await prisma.truck.findMany({
      where: { isActive: true },
    });

    const assignedTrucks = await prisma.truckAssignment.findMany({
      where: {
        job: {
          moveDate: {
            gte: date,
            lt: nextDay,
          },
          status: {
            not: 'CANCELLED',
          },
        },
      },
      include: {
        truck: true,
        job: {
          select: { id: true, jobNumber: true, startTime: true },
        },
      },
    });

    const assignedIds = new Set(assignedTrucks.map((a) => a.truckId));

    const availability = allTrucks.map((truck) => ({
      ...truck,
      isAvailable: !assignedIds.has(truck.id),
      assignedJob: assignedTrucks.find((a) => a.truckId === truck.id)?.job || null,
    }));

    res.json(availability);
  } catch (error) {
    console.error('Get truck availability error:', error);
    res.status(500).json({ error: 'Failed to get truck availability' });
  }
});

// Update truck mileage
router.post('/:id/mileage', authenticate, async (req, res) => {
  try {
    const { mileage } = req.body;

    const truck = await prisma.truck.update({
      where: { id: req.params.id },
      data: { currentMileage: mileage },
    });

    res.json(truck);
  } catch (error) {
    console.error('Update mileage error:', error);
    res.status(500).json({ error: 'Failed to update mileage' });
  }
});

// Record service
router.post('/:id/service', authenticate, async (req, res) => {
  try {
    const { nextServiceDue } = req.body;

    const truck = await prisma.truck.update({
      where: { id: req.params.id },
      data: {
        lastServiceDate: new Date(),
        nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : null,
      },
    });

    res.json(truck);
  } catch (error) {
    console.error('Record service error:', error);
    res.status(500).json({ error: 'Failed to record service' });
  }
});

// Get trucks needing service
router.get('/maintenance/due', authenticate, async (req, res) => {
  try {
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const trucks = await prisma.truck.findMany({
      where: {
        isActive: true,
        OR: [
          { nextServiceDue: { lte: twoWeeksFromNow } },
          { insuranceExpiry: { lte: twoWeeksFromNow } },
          { registrationExpiry: { lte: twoWeeksFromNow } },
        ],
      },
    });

    res.json(trucks);
  } catch (error) {
    console.error('Get maintenance due error:', error);
    res.status(500).json({ error: 'Failed to get trucks needing maintenance' });
  }
});

module.exports = router;
