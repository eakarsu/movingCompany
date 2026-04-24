const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();
const prisma = new PrismaClient();

// Get all communications
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, direction, leadId, jobId } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(req.query);

    const where = {};
    if (type) where.type = type;
    if (direction) where.direction = direction;
    if (leadId) where.leadId = leadId;
    if (jobId) where.jobId = jobId;

    const [communications, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true },
          },
          job: {
            select: { id: true, jobNumber: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          template: {
            select: { id: true, name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.communication.count({ where }),
    ]);

    res.json(paginatedResponse(communications, total, page, limit));
  } catch (error) {
    console.error('Get communications error:', error);
    res.status(500).json({ error: 'Failed to get communications' });
  }
});

// Send communication
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, direction, subject, content, leadId, jobId, templateId } = req.body;

    const communication = await prisma.communication.create({
      data: {
        type,
        direction,
        subject,
        content,
        leadId,
        jobId,
        userId: req.user.id,
        templateId,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    res.status(201).json(communication);
  } catch (error) {
    console.error('Send communication error:', error);
    res.status(500).json({ error: 'Failed to send communication' });
  }
});

// Send booking confirmation
router.post('/booking-confirmation', authenticate, async (req, res) => {
  try {
    const { jobId } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { lead: true, quote: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const content = `Dear ${job.lead.firstName},

Thank you for choosing our moving services! Your move has been confirmed.

Job Details:
- Job Number: ${job.jobNumber}
- Move Date: ${new Date(job.moveDate).toLocaleDateString()}
- From: ${job.originAddress}, ${job.originCity}, ${job.originState}
- To: ${job.destAddress}, ${job.destCity}, ${job.destState}
- Total Quote: $${job.quote.total.toFixed(2)}

If you have any questions, please contact us.

Best regards,
Your Moving Team`;

    const communication = await prisma.communication.create({
      data: {
        type: 'EMAIL',
        direction: 'OUTBOUND',
        subject: `Booking Confirmation - Job #${job.jobNumber}`,
        content,
        jobId,
        leadId: job.leadId,
        userId: req.user.id,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    res.json(communication);
  } catch (error) {
    console.error('Send booking confirmation error:', error);
    res.status(500).json({ error: 'Failed to send booking confirmation' });
  }
});

// Send pre-move reminder
router.post('/pre-move-reminder', authenticate, async (req, res) => {
  try {
    const { jobId, daysUntilMove } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { lead: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const content = `Dear ${job.lead.firstName},

Your move is in ${daysUntilMove} day(s)!

Move Details:
- Date: ${new Date(job.moveDate).toLocaleDateString()}
- From: ${job.originCity}, ${job.originState}
- To: ${job.destCity}, ${job.destState}

Please ensure all items are packed and ready.

Your Moving Team`;

    const communication = await prisma.communication.create({
      data: {
        type: 'EMAIL',
        direction: 'OUTBOUND',
        subject: `Move Reminder - ${daysUntilMove} Day(s) Until Your Move`,
        content,
        jobId,
        leadId: job.leadId,
        userId: req.user.id,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    res.json(communication);
  } catch (error) {
    console.error('Send pre-move reminder error:', error);
    res.status(500).json({ error: 'Failed to send pre-move reminder' });
  }
});

// Send day-of update
router.post('/day-of-update', authenticate, async (req, res) => {
  try {
    const { jobId, message } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { lead: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const content = `Hi ${job.lead.firstName},

${message}

Job #${job.jobNumber}

Your Moving Team`;

    const communication = await prisma.communication.create({
      data: {
        type: 'SMS',
        direction: 'OUTBOUND',
        content,
        jobId,
        leadId: job.leadId,
        userId: req.user.id,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    res.json(communication);
  } catch (error) {
    console.error('Send day-of update error:', error);
    res.status(500).json({ error: 'Failed to send day-of update' });
  }
});

// Send post-move follow-up
router.post('/post-move-followup', authenticate, async (req, res) => {
  try {
    const { jobId } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { lead: true },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const content = `Dear ${job.lead.firstName},

Thank you for choosing us for your recent move! We hope everything went smoothly.

We'd love to hear about your experience. Please take a moment to leave us a review.

If you have any concerns or need to file a claim, please contact us.

Best regards,
Your Moving Team`;

    const communication = await prisma.communication.create({
      data: {
        type: 'EMAIL',
        direction: 'OUTBOUND',
        subject: 'Thank You for Your Recent Move!',
        content,
        jobId,
        leadId: job.leadId,
        userId: req.user.id,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    res.json(communication);
  } catch (error) {
    console.error('Send post-move follow-up error:', error);
    res.status(500).json({ error: 'Failed to send post-move follow-up' });
  }
});

// Get templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await prisma.communicationTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Create template
router.post('/templates', authenticate, async (req, res) => {
  try {
    const template = await prisma.communicationTemplate.create({
      data: req.body,
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    const template = await prisma.communicationTemplate.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    await prisma.communicationTemplate.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
