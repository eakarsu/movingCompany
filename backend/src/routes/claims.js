const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { parsePaginationParams, paginatedResponse } = require('../utils/pagination');

const router = express.Router();
const prisma = new PrismaClient();

// Get all claims
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, type, jobId } = req.query;
    const { page, limit, skip, sortBy, sortOrder } = parsePaginationParams(req.query);

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (jobId) where.jobId = jobId;

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: {
          job: {
            include: {
              lead: {
                select: { firstName: true, lastName: true, email: true, phone: true },
              },
            },
          },
          item: {
            select: { id: true, name: true, category: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.claim.count({ where }),
    ]);

    res.json(paginatedResponse(claims, total, page, limit));
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Failed to get claims' });
  }
});

// Bulk delete
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await prisma.claim.deleteMany({ where: { id: { in: ids } } });
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
    const result = await prisma.claim.updateMany({ where: { id: { in: ids } }, data });
    res.json({ message: `${result.count} items updated`, count: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// Get claim by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: {
        job: {
          include: {
            lead: true,
            quote: true,
          },
        },
        item: true,
      },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    res.json(claim);
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ error: 'Failed to get claim' });
  }
});

// Submit claim
router.post('/', authenticate, async (req, res) => {
  try {
    // Generate claim number
    const claimCount = await prisma.claim.count();
    const claimNumber = `CLM-${String(claimCount + 1).padStart(6, '0')}`;

    const claim = await prisma.claim.create({
      data: {
        claimNumber,
        ...req.body,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        job: {
          include: {
            lead: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        item: true,
      },
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error('Submit claim error:', error);
    res.status(500).json({ error: 'Failed to submit claim' });
  }
});

// Update claim
router.put('/:id', authenticate, async (req, res) => {
  try {
    const claim = await prisma.claim.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(claim);
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

// Review claim
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const claim = await prisma.claim.update({
      where: { id: req.params.id },
      data: {
        status: 'UNDER_REVIEW',
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
      },
    });

    res.json(claim);
  } catch (error) {
    console.error('Review claim error:', error);
    res.status(500).json({ error: 'Failed to review claim' });
  }
});

// Approve claim
router.post('/:id/approve', authenticate, async (req, res) => {
  try {
    const { approvedAmount, resolution } = req.body;

    const claim = await prisma.claim.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedAmount,
        resolution,
        resolvedAt: new Date(),
      },
    });

    res.json(claim);
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ error: 'Failed to approve claim' });
  }
});

// Deny claim
router.post('/:id/deny', authenticate, async (req, res) => {
  try {
    const { resolution } = req.body;

    const claim = await prisma.claim.update({
      where: { id: req.params.id },
      data: {
        status: 'DENIED',
        resolution,
        resolvedAt: new Date(),
      },
    });

    res.json(claim);
  } catch (error) {
    console.error('Deny claim error:', error);
    res.status(500).json({ error: 'Failed to deny claim' });
  }
});

// Settle claim
router.post('/:id/settle', authenticate, async (req, res) => {
  try {
    const { approvedAmount, resolution } = req.body;

    const claim = await prisma.claim.update({
      where: { id: req.params.id },
      data: {
        status: 'SETTLED',
        approvedAmount,
        resolution,
        resolvedAt: new Date(),
      },
    });

    res.json(claim);
  } catch (error) {
    console.error('Settle claim error:', error);
    res.status(500).json({ error: 'Failed to settle claim' });
  }
});

// Add photos to claim
router.post('/:id/photos', authenticate, async (req, res) => {
  try {
    const { photos } = req.body;

    const claim = await prisma.claim.update({
      where: { id: req.params.id },
      data: {
        damagePhotos: {
          push: photos,
        },
      },
    });

    res.json(claim);
  } catch (error) {
    console.error('Add photos error:', error);
    res.status(500).json({ error: 'Failed to add photos' });
  }
});

// Get claim statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const [
      totalClaims,
      pendingClaims,
      approvedClaims,
      deniedClaims,
      totalApproved,
    ] = await Promise.all([
      prisma.claim.count(),
      prisma.claim.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.claim.count({ where: { status: 'APPROVED' } }),
      prisma.claim.count({ where: { status: 'DENIED' } }),
      prisma.claim.aggregate({
        where: { status: { in: ['APPROVED', 'SETTLED'] } },
        _sum: { approvedAmount: true },
      }),
    ]);

    res.json({
      totalClaims,
      pendingClaims,
      approvedClaims,
      deniedClaims,
      totalApprovedAmount: totalApproved._sum.approvedAmount || 0,
    });
  } catch (error) {
    console.error('Get claim stats error:', error);
    res.status(500).json({ error: 'Failed to get claim statistics' });
  }
});

module.exports = router;
