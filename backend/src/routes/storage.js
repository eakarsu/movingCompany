const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all storage units
router.get('/units', authenticate, async (req, res) => {
  try {
    const { size, isOccupied, climate } = req.query;

    const where = {};
    if (size) where.size = size;
    if (isOccupied !== undefined) where.isOccupied = isOccupied === 'true';
    if (climate !== undefined) where.climate = climate === 'true';

    const units = await prisma.storageUnit.findMany({
      where,
      include: {
        reservations: {
          where: {
            status: 'ACTIVE',
          },
        },
      },
      orderBy: { unitNumber: 'asc' },
    });

    res.json(units);
  } catch (error) {
    console.error('Get storage units error:', error);
    res.status(500).json({ error: 'Failed to get storage units' });
  }
});

// Get storage unit by ID
router.get('/units/:id', authenticate, async (req, res) => {
  try {
    const unit = await prisma.storageUnit.findUnique({
      where: { id: req.params.id },
      include: {
        reservations: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!unit) {
      return res.status(404).json({ error: 'Storage unit not found' });
    }

    res.json(unit);
  } catch (error) {
    console.error('Get storage unit error:', error);
    res.status(500).json({ error: 'Failed to get storage unit' });
  }
});

// Create storage unit
router.post('/units', authenticate, async (req, res) => {
  try {
    const unit = await prisma.storageUnit.create({
      data: req.body,
    });

    res.status(201).json(unit);
  } catch (error) {
    console.error('Create storage unit error:', error);
    res.status(500).json({ error: 'Failed to create storage unit' });
  }
});

// Update storage unit
router.put('/units/:id', authenticate, async (req, res) => {
  try {
    const unit = await prisma.storageUnit.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(unit);
  } catch (error) {
    console.error('Update storage unit error:', error);
    res.status(500).json({ error: 'Failed to update storage unit' });
  }
});

// Delete storage unit
router.delete('/units/:id', authenticate, async (req, res) => {
  try {
    await prisma.storageUnit.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Storage unit deleted' });
  } catch (error) {
    console.error('Delete storage unit error:', error);
    res.status(500).json({ error: 'Failed to delete storage unit' });
  }
});

// Get all reservations
router.get('/reservations', authenticate, async (req, res) => {
  try {
    const { status, unitId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (unitId) where.unitId = unitId;

    const reservations = await prisma.storageReservation.findMany({
      where,
      include: {
        unit: true,
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(reservations);
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Failed to get reservations' });
  }
});

// Get reservation by ID
router.get('/reservations/:id', authenticate, async (req, res) => {
  try {
    const reservation = await prisma.storageReservation.findUnique({
      where: { id: req.params.id },
      include: {
        unit: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ error: 'Failed to get reservation' });
  }
});

// Create reservation
router.post('/reservations', authenticate, async (req, res) => {
  try {
    const { unitId, ...reservationData } = req.body;

    const reservation = await prisma.storageReservation.create({
      data: {
        unitId,
        ...reservationData,
        startDate: new Date(reservationData.startDate),
        endDate: reservationData.endDate ? new Date(reservationData.endDate) : null,
      },
      include: {
        unit: true,
      },
    });

    // Update unit status
    await prisma.storageUnit.update({
      where: { id: unitId },
      data: { isOccupied: true },
    });

    res.status(201).json(reservation);
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// Update reservation
router.put('/reservations/:id', authenticate, async (req, res) => {
  try {
    const reservation = await prisma.storageReservation.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(reservation);
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

// End reservation
router.post('/reservations/:id/end', authenticate, async (req, res) => {
  try {
    const reservation = await prisma.storageReservation.update({
      where: { id: req.params.id },
      data: {
        status: 'ENDED',
        endDate: new Date(),
      },
      include: {
        unit: true,
      },
    });

    // Update unit status
    await prisma.storageUnit.update({
      where: { id: reservation.unitId },
      data: { isOccupied: false },
    });

    res.json(reservation);
  } catch (error) {
    console.error('End reservation error:', error);
    res.status(500).json({ error: 'Failed to end reservation' });
  }
});

// Get storage stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [
      totalUnits,
      occupiedUnits,
      activeReservations,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.storageUnit.count(),
      prisma.storageUnit.count({ where: { isOccupied: true } }),
      prisma.storageReservation.count({ where: { status: 'ACTIVE' } }),
      prisma.storageReservation.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { monthlyRate: true },
      }),
    ]);

    res.json({
      totalUnits,
      occupiedUnits,
      availableUnits: totalUnits - occupiedUnits,
      occupancyRate: totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0,
      activeReservations,
      monthlyRevenue: monthlyRevenue._sum.monthlyRate || 0,
    });
  } catch (error) {
    console.error('Get storage stats error:', error);
    res.status(500).json({ error: 'Failed to get storage stats' });
  }
});

// Get overdue reservations
router.get('/reservations/overdue', authenticate, async (req, res) => {
  try {
    const reservations = await prisma.storageReservation.findMany({
      where: {
        status: 'OVERDUE',
      },
      include: {
        unit: true,
      },
      orderBy: { startDate: 'asc' },
    });

    res.json(reservations);
  } catch (error) {
    console.error('Get overdue reservations error:', error);
    res.status(500).json({ error: 'Failed to get overdue reservations' });
  }
});

module.exports = router;
