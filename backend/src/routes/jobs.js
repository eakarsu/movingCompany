const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all jobs
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, assignedTo, startDate, endDate, search } = req.query;

    const where = {};
    if (status) where.status = status;
    if (assignedTo) where.assignedToId = assignedTo;
    if (startDate || endDate) {
      where.moveDate = {};
      if (startDate) where.moveDate.gte = new Date(startDate);
      if (endDate) where.moveDate.lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { originCity: { contains: search, mode: 'insensitive' } },
        { destCity: { contains: search, mode: 'insensitive' } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
        quote: {
          select: { total: true, type: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        crewAssignments: {
          include: {
            crewMember: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        truckAssignments: {
          include: {
            truck: {
              select: { id: true, name: true, licensePlate: true },
            },
          },
        },
      },
      orderBy: { moveDate: 'asc' },
    });

    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Get job by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true,
        quote: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        crewAssignments: {
          include: {
            crewMember: true,
          },
        },
        truckAssignments: {
          include: {
            truck: true,
          },
        },
        equipmentAssignments: {
          include: {
            equipment: true,
          },
        },
        jobNotes: {
          orderBy: { createdAt: 'desc' },
        },
        inventoryItems: true,
        timeEntries: {
          include: {
            crewMember: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
        },
        invoice: true,
        claims: true,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// Create job
router.post('/', authenticate, async (req, res) => {
  try {
    // Generate job number
    const jobCount = await prisma.job.count();
    const jobNumber = `JOB-${String(jobCount + 1).padStart(6, '0')}`;

    const data = { ...req.body };

    // Convert moveDate from date string to DateTime if provided
    if (data.moveDate && typeof data.moveDate === 'string') {
      data.moveDate = new Date(data.moveDate).toISOString();
    }

    const job = await prisma.job.create({
      data: {
        jobNumber,
        ...data,
        createdById: req.user.id,
        status: data.status || 'SCHEDULED',
      },
      include: {
        lead: true,
        quote: true,
      },
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
router.put('/:id', authenticate, async (req, res) => {
  try {
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(job);
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Update job status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };

    if (status === 'IN_PROGRESS') {
      updateData.startTime = new Date();
    } else if (status === 'COMPLETED') {
      updateData.endTime = new Date();
      updateData.completedAt = new Date();
    }

    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(job);
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// Assign crew to job
router.post('/:id/crew', authenticate, async (req, res) => {
  try {
    const { crewMemberId, role } = req.body;

    const assignment = await prisma.crewAssignment.create({
      data: {
        jobId: req.params.id,
        crewMemberId,
        role,
      },
      include: {
        crewMember: true,
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Assign crew error:', error);
    res.status(500).json({ error: 'Failed to assign crew' });
  }
});

// Remove crew from job
router.delete('/:id/crew/:crewMemberId', authenticate, async (req, res) => {
  try {
    await prisma.crewAssignment.delete({
      where: {
        jobId_crewMemberId: {
          jobId: req.params.id,
          crewMemberId: req.params.crewMemberId,
        },
      },
    });

    res.json({ message: 'Crew member removed from job' });
  } catch (error) {
    console.error('Remove crew error:', error);
    res.status(500).json({ error: 'Failed to remove crew' });
  }
});

// Confirm crew assignment
router.post('/:id/crew/:crewMemberId/confirm', authenticate, async (req, res) => {
  try {
    const assignment = await prisma.crewAssignment.update({
      where: {
        jobId_crewMemberId: {
          jobId: req.params.id,
          crewMemberId: req.params.crewMemberId,
        },
      },
      data: {
        confirmedAt: new Date(),
      },
    });

    res.json(assignment);
  } catch (error) {
    console.error('Confirm crew error:', error);
    res.status(500).json({ error: 'Failed to confirm crew' });
  }
});

// Assign truck to job
router.post('/:id/trucks', authenticate, async (req, res) => {
  try {
    const { truckId } = req.body;

    const assignment = await prisma.truckAssignment.create({
      data: {
        jobId: req.params.id,
        truckId,
      },
      include: {
        truck: true,
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Assign truck error:', error);
    res.status(500).json({ error: 'Failed to assign truck' });
  }
});

// Remove truck from job
router.delete('/:id/trucks/:truckId', authenticate, async (req, res) => {
  try {
    await prisma.truckAssignment.delete({
      where: {
        jobId_truckId: {
          jobId: req.params.id,
          truckId: req.params.truckId,
        },
      },
    });

    res.json({ message: 'Truck removed from job' });
  } catch (error) {
    console.error('Remove truck error:', error);
    res.status(500).json({ error: 'Failed to remove truck' });
  }
});

// Assign equipment to job
router.post('/:id/equipment', authenticate, async (req, res) => {
  try {
    const { equipmentId, quantity } = req.body;

    const assignment = await prisma.equipmentAssignment.create({
      data: {
        jobId: req.params.id,
        equipmentId,
        quantity,
      },
      include: {
        equipment: true,
      },
    });

    // Update equipment available count
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        available: {
          decrement: quantity,
        },
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Assign equipment error:', error);
    res.status(500).json({ error: 'Failed to assign equipment' });
  }
});

// Return equipment
router.post('/:id/equipment/:equipmentId/return', authenticate, async (req, res) => {
  try {
    const { condition } = req.body;

    const assignment = await prisma.equipmentAssignment.update({
      where: {
        jobId_equipmentId: {
          jobId: req.params.id,
          equipmentId: req.params.equipmentId,
        },
      },
      data: {
        returnedAt: new Date(),
        condition,
      },
    });

    // Update equipment available count
    await prisma.equipment.update({
      where: { id: req.params.equipmentId },
      data: {
        available: {
          increment: assignment.quantity,
        },
      },
    });

    res.json(assignment);
  } catch (error) {
    console.error('Return equipment error:', error);
    res.status(500).json({ error: 'Failed to return equipment' });
  }
});

// Add job note
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const { content } = req.body;

    const note = await prisma.jobNote.create({
      data: {
        jobId: req.params.id,
        content,
        createdBy: `${req.user.firstName} ${req.user.lastName}`,
      },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Add time entry
router.post('/:id/time', authenticate, async (req, res) => {
  try {
    const { crewMemberId, type, startTime, endTime, notes } = req.body;

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    const duration = end ? (end - start) / (1000 * 60 * 60) : null;

    const entry = await prisma.timeEntry.create({
      data: {
        jobId: req.params.id,
        crewMemberId,
        type,
        startTime: start,
        endTime: end,
        duration,
        notes,
      },
      include: {
        crewMember: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Add time entry error:', error);
    res.status(500).json({ error: 'Failed to add time entry' });
  }
});

// Update time entry
router.put('/:id/time/:entryId', authenticate, async (req, res) => {
  try {
    const { endTime, notes } = req.body;
    const entry = await prisma.timeEntry.findUnique({
      where: { id: req.params.entryId },
    });

    const end = new Date(endTime);
    const duration = (end - entry.startTime) / (1000 * 60 * 60);

    const updated = await prisma.timeEntry.update({
      where: { id: req.params.entryId },
      data: {
        endTime: end,
        duration,
        notes,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// Get today's jobs
router.get('/schedule/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const jobs = await prisma.job.findMany({
      where: {
        moveDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true },
        },
        crewAssignments: {
          include: {
            crewMember: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        truckAssignments: {
          include: {
            truck: {
              select: { id: true, name: true, licensePlate: true },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json(jobs);
  } catch (error) {
    console.error('Get today jobs error:', error);
    res.status(500).json({ error: 'Failed to get today\'s jobs' });
  }
});

// Get jobs for calendar
router.get('/schedule/calendar', authenticate, async (req, res) => {
  try {
    const { start, end } = req.query;

    const jobs = await prisma.job.findMany({
      where: {
        moveDate: {
          gte: new Date(start),
          lte: new Date(end),
        },
      },
      include: {
        lead: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { moveDate: 'asc' },
    });

    res.json(jobs);
  } catch (error) {
    console.error('Get calendar jobs error:', error);
    res.status(500).json({ error: 'Failed to get calendar jobs' });
  }
});

module.exports = router;
