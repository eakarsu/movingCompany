import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, sendInvoice, recordPayment, getInvoiceStats, getEnums, getJobs, createInvoice } from '../api';
import { format } from 'date-fns';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const [invoicesRes, statsRes, enumsRes, jobsRes] = await Promise.all([
        getInvoices(filter),
        getInvoiceStats(),
        getEnums(),
        getJobs({ status: 'COMPLETED' }),
      ]);
      setInvoices(invoicesRes.data);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
      // Filter jobs that don't already have an invoice
      const jobsWithoutInvoice = (jobsRes.data || []).filter(job => !job.invoice);
      setJobs(jobsWithoutInvoice);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (id) => {
    try {
      await sendInvoice(id);
      loadData();
    } catch (error) {
      console.error('Error sending invoice:', error);
    }
  };

  const handleRecordPayment = async (data) => {
    try {
      await recordPayment(selectedInvoice.id, data);
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const handleCreateInvoice = async (data) => {
    try {
      await createInvoice(data);
      setShowInvoiceModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'badge-gray',
      SENT: 'badge-blue',
      VIEWED: 'badge-yellow',
      PARTIAL: 'badge-yellow',
      PAID: 'badge-green',
      OVERDUE: 'badge-red',
    };
    return colors[status] || 'badge-gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold">{stats?.totalInvoices || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-green-600">{stats?.paidInvoices || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">${stats?.pendingAmount?.toLocaleString() || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Collected</p>
          <p className="text-2xl font-bold text-green-600">${stats?.collectedAmount?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="select w-40"
        >
          <option value="">All Statuses</option>
          {enums?.invoiceStatuses?.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <button onClick={() => setShowInvoiceModal(true)} className="btn-primary">
          + New Invoice
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 table-header">Invoice #</th>
              <th className="px-6 py-3 table-header">Customer</th>
              <th className="px-6 py-3 table-header">Job</th>
              <th className="px-6 py-3 table-header">Total</th>
              <th className="px-6 py-3 table-header">Paid</th>
              <th className="px-6 py-3 table-header">Status</th>
              <th className="px-6 py-3 table-header">Due Date</th>
              <th className="px-6 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{invoice.invoiceNumber}</td>
                <td className="px-6 py-4">
                  {invoice.job?.lead?.firstName} {invoice.job?.lead?.lastName}
                </td>
                <td className="px-6 py-4">{invoice.job?.jobNumber}</td>
                <td className="px-6 py-4 font-bold">${invoice.total?.toLocaleString()}</td>
                <td className="px-6 py-4">${invoice.paidAmount?.toLocaleString() || 0}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${getStatusColor(invoice.status)}`}>{invoice.status}</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSendInvoice(invoice.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Send
                      </button>
                    )}
                    {['SENT', 'VIEWED', 'PARTIAL'].includes(invoice.status) && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowPaymentModal(true);
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        Payment
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <p className="text-center py-8 text-gray-500">No invoices found</p>
        )}
      </div>

      {showPaymentModal && (
        <PaymentModal
          invoice={selectedInvoice}
          enums={enums}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onSubmit={handleRecordPayment}
        />
      )}

      {showInvoiceModal && (
        <InvoiceModal
          jobs={jobs}
          onClose={() => setShowInvoiceModal(false)}
          onSubmit={handleCreateInvoice}
        />
      )}
    </div>
  );
}

function InvoiceModal({ jobs, onClose, onSubmit }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({
    jobId: '',
    dueInDays: 30,
    notes: '',
  });

  const handleJobSelect = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    setSelectedJob(job);
    setFormData({ ...formData, jobId });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">New Invoice</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Completed Job *</label>
            <select
              value={formData.jobId}
              onChange={(e) => handleJobSelect(e.target.value)}
              className="select"
              required
            >
              <option value="">Select a job...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobNumber} - {job.lead?.firstName} {job.lead?.lastName}
                </option>
              ))}
            </select>
            {jobs.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">No completed jobs without invoices available.</p>
            )}
          </div>

          {selectedJob && (
            <>
              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                <p><strong>Customer:</strong> {selectedJob.lead?.firstName} {selectedJob.lead?.lastName}</p>
                <p><strong>Route:</strong> {selectedJob.originCity} → {selectedJob.destCity}</p>
                <p><strong>Move Date:</strong> {format(new Date(selectedJob.moveDate), 'MMM d, yyyy')}</p>
                {selectedJob.quote && (
                  <p><strong>Quote Total:</strong> ${selectedJob.quote.total?.toLocaleString()}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Due (Days)</label>
                <input
                  type="number"
                  value={formData.dueInDays}
                  onChange={(e) => setFormData({ ...formData, dueInDays: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Additional notes for the invoice..."
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!formData.jobId}>
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ invoice, enums, onClose, onSubmit }) {
  const remaining = invoice.total - (invoice.paidAmount || 0);
  const [formData, setFormData] = useState({
    amount: remaining,
    method: 'CREDIT_CARD',
    reference: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Record Payment - {invoice.invoiceNumber}</h2>
          <p className="text-sm text-gray-500">Total: ${invoice.total} | Remaining: ${remaining}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="input"
              max={remaining}
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="select"
            >
              {enums?.paymentMethods?.map((method) => (
                <option key={method} value={method}>{method.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reference #</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="input"
              placeholder="Check #, Transaction ID, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-success">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
}
