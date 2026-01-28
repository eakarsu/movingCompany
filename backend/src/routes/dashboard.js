const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard overview
router.get('/overview', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [
      totalLeads,
      newLeadsToday,
      newLeadsThisMonth,
      activeJobs,
      jobsToday,
      completedJobsThisMonth,
      pendingQuotes,
      revenue,
      pendingInvoices,
      openClaims,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: thisMonth, lt: nextMonth } },
      }),
      prisma.job.count({
        where: { status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'LOADING', 'IN_TRANSIT', 'UNLOADING'] } },
      }),
      prisma.job.count({
        where: { moveDate: { gte: today, lt: tomorrow } },
      }),
      prisma.job.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: thisMonth, lt: nextMonth },
        },
      }),
      prisma.quote.count({
        where: { status: { in: ['DRAFT', 'SENT', 'VIEWED'] } },
      }),
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: thisMonth, lt: nextMonth },
        },
        _sum: { paidAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] } },
        _sum: { total: true },
      }),
      prisma.claim.count({
        where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      }),
    ]);

    res.json({
      leads: {
        total: totalLeads,
        today: newLeadsToday,
        thisMonth: newLeadsThisMonth,
      },
      jobs: {
        active: activeJobs,
        today: jobsToday,
        completedThisMonth: completedJobsThisMonth,
      },
      quotes: {
        pending: pendingQuotes,
      },
      financials: {
        revenueThisMonth: revenue._sum.paidAmount || 0,
        pendingInvoices: pendingInvoices._sum.total || 0,
      },
      claims: {
        open: openClaims,
      },
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

// Get today's schedule
router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [jobs, surveys, followUps] = await Promise.all([
      prisma.job.findMany({
        where: {
          moveDate: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true },
          },
          crewAssignments: {
            include: {
              crewMember: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.survey.findMany({
        where: {
          scheduledAt: { gte: today, lt: tomorrow },
          completedAt: null,
        },
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true, originAddress: true },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.followUp.findMany({
        where: {
          scheduledAt: { gte: today, lt: tomorrow },
          completedAt: null,
        },
        include: {
          lead: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);

    res.json({
      jobs,
      surveys,
      followUps,
    });
  } catch (error) {
    console.error('Get today schedule error:', error);
    res.status(500).json({ error: 'Failed to get today\'s schedule' });
  }
});

// Get recent activity
router.get('/activity', authenticate, async (req, res) => {
  try {
    const [recentLeads, recentJobs, recentQuotes, recentPayments] = await Promise.all([
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          source: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.job.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          jobNumber: true,
          status: true,
          updatedAt: true,
          lead: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      prisma.quote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quoteNumber: true,
          total: true,
          status: true,
          createdAt: true,
          lead: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { processedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          method: true,
          processedAt: true,
          invoice: {
            select: {
              invoiceNumber: true,
              job: {
                select: {
                  lead: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      recentLeads,
      recentJobs,
      recentQuotes,
      recentPayments,
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

// Get performance metrics
router.get('/metrics', authenticate, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      leadsConverted,
      totalLeads,
      quotesAccepted,
      totalQuotes,
      jobsCompleted,
      averageJobValue,
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          status: 'WON',
          convertedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.quote.count({
        where: {
          status: 'ACCEPTED',
          acceptedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.quote.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.job.count({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: thirtyDaysAgo },
        },
        _avg: { total: true },
      }),
    ]);

    res.json({
      conversionRate: totalLeads > 0 ? ((leadsConverted / totalLeads) * 100).toFixed(1) : 0,
      quoteAcceptanceRate: totalQuotes > 0 ? ((quotesAccepted / totalQuotes) * 100).toFixed(1) : 0,
      jobsCompleted,
      averageJobValue: averageJobValue._avg.total || 0,
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// Get revenue chart data
router.get('/revenue-chart', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const data = [];

    if (period === 'month') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

        const revenue = await prisma.invoice.aggregate({
          where: {
            status: 'PAID',
            paidAt: { gte: startOfMonth, lt: endOfMonth },
          },
          _sum: { paidAmount: true },
        });

        data.push({
          period: startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
          revenue: revenue._sum.paidAmount || 0,
        });
      }
    } else {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const revenue = await prisma.invoice.aggregate({
          where: {
            status: 'PAID',
            paidAt: { gte: date, lt: nextDay },
          },
          _sum: { paidAmount: true },
        });

        data.push({
          period: date.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' }),
          revenue: revenue._sum.paidAmount || 0,
        });
      }
    }

    res.json(data);
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({ error: 'Failed to get revenue chart data' });
  }
});

// Get lead sources breakdown
router.get('/lead-sources', authenticate, async (req, res) => {
  try {
    const sources = await prisma.lead.groupBy({
      by: ['source'],
      _count: { source: true },
    });

    res.json(
      sources.map((s) => ({
        source: s.source,
        count: s._count.source,
      }))
    );
  } catch (error) {
    console.error('Get lead sources error:', error);
    res.status(500).json({ error: 'Failed to get lead sources' });
  }
});

module.exports = router;
