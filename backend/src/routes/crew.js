const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all crew members
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, isActive } = req.query;

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const crew = await prisma.crewMember.findMany({
      where,
      orderBy: { lastName: 'asc' },
    });

    res.json(crew);
  } catch (error) {
    console.error('Get crew error:', error);
    res.status(500).json({ error: 'Failed to get crew members' });
  }
});

// Get crew member by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const crewMember = await prisma.crewMember.findUnique({
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
        timeEntries: {
          orderBy: { startTime: 'desc' },
          take: 20,
        },
      },
    });

    if (!crewMember) {
      return res.status(404).json({ error: 'Crew member not found' });
    }

    res.json(crewMember);
  } catch (error) {
    console.error('Get crew member error:', error);
    res.status(500).json({ error: 'Failed to get crew member' });
  }
});

// Create crew member
router.post('/', authenticate, async (req, res) => {
  try {
    const crewMember = await prisma.crewMember.create({
      data: req.body,
    });

    res.status(201).json(crewMember);
  } catch (error) {
    console.error('Create crew member error:', error);
    res.status(500).json({ error: 'Failed to create crew member' });
  }
});

// Update crew member
router.put('/:id', authenticate, async (req, res) => {
  try {
    const crewMember = await prisma.crewMember.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(crewMember);
  } catch (error) {
    console.error('Update crew member error:', error);
    res.status(500).json({ error: 'Failed to update crew member' });
  }
});

// Delete crew member
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.crewMember.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Crew member deactivated' });
  } catch (error) {
    console.error('Delete crew member error:', error);
    res.status(500).json({ error: 'Failed to delete crew member' });
  }
});

// Get crew availability
router.get('/availability/:date', authenticate, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all active crew members
    const allCrew = await prisma.crewMember.findMany({
      where: { isActive: true },
    });

    // Get crew assigned to jobs on this date
    const assignedCrew = await prisma.crewAssignment.findMany({
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
        crewMember: true,
        job: {
          select: { id: true, jobNumber: true, startTime: true },
        },
      },
    });

    const assignedIds = new Set(assignedCrew.map((a) => a.crewMemberId));

    const availability = allCrew.map((crew) => ({
      ...crew,
      isAvailable: !assignedIds.has(crew.id),
      assignedJob: assignedCrew.find((a) => a.crewMemberId === crew.id)?.job || null,
    }));

    res.json(availability);
  } catch (error) {
    console.error('Get crew availability error:', error);
    res.status(500).json({ error: 'Failed to get crew availability' });
  }
});

// Get crew schedule
router.get('/:id/schedule', authenticate, async (req, res) => {
  try {
    const { start, end } = req.query;

    const assignments = await prisma.crewAssignment.findMany({
      where: {
        crewMemberId: req.params.id,
        job: {
          moveDate: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
      },
      include: {
        job: {
          include: {
            lead: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: {
        job: {
          moveDate: 'asc',
        },
      },
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get crew schedule error:', error);
    res.status(500).json({ error: 'Failed to get crew schedule' });
  }
});

// Get crew performance
router.get('/:id/performance', authenticate, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalJobs,
      totalHours,
      completedJobs,
    ] = await Promise.all([
      prisma.crewAssignment.count({
        where: {
          crewMemberId: req.params.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.timeEntry.aggregate({
        where: {
          crewMemberId: req.params.id,
          startTime: { gte: thirtyDaysAgo },
        },
        _sum: { duration: true },
      }),
      prisma.crewAssignment.count({
        where: {
          crewMemberId: req.params.id,
          createdAt: { gte: thirtyDaysAgo },
          job: { status: 'COMPLETED' },
        },
      }),
    ]);

    res.json({
      totalJobs,
      completedJobs,
      totalHours: totalHours._sum.duration || 0,
      averageHoursPerJob: totalJobs > 0 ? (totalHours._sum.duration || 0) / totalJobs : 0,
    });
  } catch (error) {
    console.error('Get crew performance error:', error);
    res.status(500).json({ error: 'Failed to get crew performance' });
  }
});

module.exports = router;
