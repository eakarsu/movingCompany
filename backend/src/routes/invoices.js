const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        job: {
          include: {
            lead: {
              select: { firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// Get invoice by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        job: {
          include: {
            lead: true,
            quote: true,
          },
        },
        additionalCharges: true,
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

// Create invoice from job
router.post('/', authenticate, async (req, res) => {
  try {
    const { jobId } = req.body;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        quote: true,
        timeEntries: true,
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Generate invoice number
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, '0')}`;

    // Calculate actuals
    const totalHours = job.timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const laborTotal = totalHours * job.quote.laborRate * job.crewSize;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const subtotal = laborTotal + (job.quote.travelTotal || 0) +
                     (job.quote.packingMaterials || 0) + (job.quote.insuranceFee || 0);
    const total = subtotal - (job.quote.discount || 0) + (job.quote.taxes || 0);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        jobId,
        status: 'DRAFT',
        laborHours: totalHours || job.quote.estimatedHours,
        laborRate: job.quote.laborRate,
        laborTotal,
        travelHours: job.quote.travelHours,
        travelRate: job.quote.travelRate,
        travelTotal: job.quote.travelTotal,
        packingMaterials: job.quote.packingMaterials,
        storageCharges: job.quote.storageFee ? job.quote.storageFee * (job.quote.storageMonths || 0) : null,
        insuranceFee: job.quote.insuranceFee,
        subtotal,
        discount: job.quote.discount || 0,
        discountReason: job.quote.discountReason,
        taxes: job.quote.taxes || 0,
        total,
        dueDate,
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
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Send invoice
router.post('/:id/send', authenticate, async (req, res) => {
  try {
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: 'SENT' },
    });

    res.json(invoice);
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

// Add additional charge
router.post('/:id/charges', authenticate, async (req, res) => {
  try {
    const { description, amount, quantity } = req.body;
    const total = amount * quantity;

    const charge = await prisma.invoiceCharge.create({
      data: {
        invoiceId: req.params.id,
        description,
        amount,
        quantity,
        total,
      },
    });

    // Update invoice total
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { additionalCharges: true },
    });

    const chargesTotal = invoice.additionalCharges.reduce((sum, c) => sum + c.total, 0);
    const newSubtotal = invoice.laborTotal + (invoice.travelTotal || 0) +
                        (invoice.packingMaterials || 0) + (invoice.insuranceFee || 0) +
                        (invoice.storageCharges || 0) + chargesTotal;
    const newTotal = newSubtotal - invoice.discount + invoice.taxes;

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { subtotal: newSubtotal, total: newTotal },
    });

    res.status(201).json(charge);
  } catch (error) {
    console.error('Add charge error:', error);
    res.status(500).json({ error: 'Failed to add charge' });
  }
});

// Remove additional charge
router.delete('/:id/charges/:chargeId', authenticate, async (req, res) => {
  try {
    await prisma.invoiceCharge.delete({
      where: { id: req.params.chargeId },
    });

    // Recalculate invoice total
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { additionalCharges: true },
    });

    const chargesTotal = invoice.additionalCharges.reduce((sum, c) => sum + c.total, 0);
    const newSubtotal = invoice.laborTotal + (invoice.travelTotal || 0) +
                        (invoice.packingMaterials || 0) + (invoice.insuranceFee || 0) +
                        (invoice.storageCharges || 0) + chargesTotal;
    const newTotal = newSubtotal - invoice.discount + invoice.taxes;

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { subtotal: newSubtotal, total: newTotal },
    });

    res.json({ message: 'Charge removed' });
  } catch (error) {
    console.error('Remove charge error:', error);
    res.status(500).json({ error: 'Failed to remove charge' });
  }
});

// Record payment
router.post('/:id/payments', authenticate, async (req, res) => {
  try {
    const { amount, method, reference, notes } = req.body;

    const payment = await prisma.payment.create({
      data: {
        invoiceId: req.params.id,
        amount,
        method,
        reference,
        notes,
        processedBy: req.user.id,
      },
    });

    // Update invoice status
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { payments: true },
    });

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus = invoice.status;
    if (totalPaid >= invoice.total) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL';
    }

    await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        status: newStatus,
        paidAmount: totalPaid,
        paidAt: totalPaid >= invoice.total ? new Date() : null,
        paymentMethod: method,
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get overdue invoices
router.get('/overdue/list', authenticate, async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'VIEWED', 'PARTIAL'] },
        dueDate: { lt: new Date() },
      },
      include: {
        job: {
          include: {
            lead: {
              select: { firstName: true, lastName: true, phone: true, email: true },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(invoices);
  } catch (error) {
    console.error('Get overdue invoices error:', error);
    res.status(500).json({ error: 'Failed to get overdue invoices' });
  }
});

// Get invoice statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const [
      totalInvoices,
      paidInvoices,
      pendingAmount,
      collectedAmount,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { paidAmount: true },
      }),
    ]);

    res.json({
      totalInvoices,
      paidInvoices,
      pendingAmount: pendingAmount._sum.total || 0,
      collectedAmount: collectedAmount._sum.paidAmount || 0,
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ error: 'Failed to get invoice statistics' });
  }
});

module.exports = router;
