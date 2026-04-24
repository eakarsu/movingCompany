import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, sendInvoice, recordPayment, getInvoiceStats, getEnums, getJobs, createInvoice, bulkDeleteInvoices, bulkUpdateInvoices } from '../api';
import { format } from 'date-fns';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import BulkActions, { SelectCheckbox } from '../components/BulkActions';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';

const exportColumns = [
  { key: 'invoiceNumber', label: 'Invoice Number' },
  { label: 'Client', accessor: (row) => `${row.job?.lead?.firstName || ''} ${row.job?.lead?.lastName || ''}`.trim() },
  { key: 'total', label: 'Total Amount' },
  { key: 'status', label: 'Status' },
  { label: 'Due Date', accessor: (row) => row.dueDate ? format(new Date(row.dueDate), 'MMM d, yyyy') : '' },
  { label: 'Created Date', accessor: (row) => row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy') : '' },
];

const bulkUpdateOptions = [
  { label: 'Set Status: DRAFT', value: 'status:DRAFT' },
  { label: 'Set Status: SENT', value: 'status:SENT' },
  { label: 'Set Status: PAID', value: 'status:PAID' },
  { label: 'Set Status: OVERDUE', value: 'status:OVERDUE' },
  { label: 'Set Status: CANCELLED', value: 'status:CANCELLED' },
];

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [invoicesRes, statsRes, enumsRes, jobsRes] = await Promise.all([
        getInvoices({ ...filter, page, sortBy, sortOrder }),
        getInvoiceStats(),
        getEnums(),
        getJobs({ status: 'COMPLETED' }),
      ]);
      const data = invoicesRes.data;
      setInvoices(data.data || data);
      setPagination(data.pagination || null);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
      // Filter jobs that don't already have an invoice
      const jobsWithoutInvoice = (jobsRes.data || []).filter(job => !job.invoice);
      setJobs(jobsWithoutInvoice);
      setSelectedIds([]);
    } catch (error) {
      showToast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [filter, page, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvoice = async (id) => {
    try {
      await sendInvoice(id);
      showToast.success('Invoice sent successfully');
      loadData();
    } catch (error) {
      showToast.error('Failed to send invoice');
    }
  };

  const handleRecordPayment = async (data) => {
    try {
      await recordPayment(selectedInvoice.id, data);
      showToast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      loadData();
    } catch (error) {
      showToast.error('Failed to record payment');
    }
  };

  const handleCreateInvoice = async (data) => {
    try {
      await createInvoice(data);
      showToast.success('Invoice created successfully');
      setShowInvoiceModal(false);
      loadData();
    } catch (error) {
      showToast.error('Failed to create invoice');
    }
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Selected Invoices',
      message: `Are you sure you want to delete ${selectedIds.length} invoice(s)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await bulkDeleteInvoices(selectedIds);
        showToast.success(`${selectedIds.length} invoice(s) deleted`);
        loadData();
      } catch (error) {
        showToast.error('Failed to delete invoices');
      }
    }
  };

  const handleBulkUpdate = async (data) => {
    try {
      await bulkUpdateInvoices(selectedIds, data);
      showToast.success(`${selectedIds.length} invoice(s) updated`);
      loadData();
    } catch (error) {
      showToast.error('Failed to update invoices');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((inv) => inv.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'badge-gray',
      SENT: 'badge-blue',
      VIEWED: 'badge-yellow',
      PARTIAL: 'badge-yellow',
      PAID: 'badge-green',
      OVERDUE: 'badge-red',
      CANCELLED: 'badge-red',
    };
    return colors[status] || 'badge-gray';
  };

  if (loading && !invoices.length) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Total Invoices</p>
          <p className="text-lg sm:text-2xl font-bold">{stats?.totalInvoices || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Paid</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats?.paidInvoices || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Pending</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">${stats?.pendingAmount?.toLocaleString() || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Collected</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">${stats?.collectedAmount?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <select
            value={filter.status}
            onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}
            className="select w-full sm:w-40"
          >
            <option value="">All Statuses</option>
            {enums?.invoiceStatuses?.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(invoices, exportColumns, 'invoices')} className="btn-secondary text-sm">
            CSV
          </button>
          <button onClick={() => exportToPDF(invoices, exportColumns, 'invoices', 'Invoices Report')} className="btn-secondary text-sm">
            PDF
          </button>
          <button onClick={() => setShowInvoiceModal(true)} className="btn-primary text-sm">
            + New Invoice
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onUpdate={handleBulkUpdate}
        updateOptions={bulkUpdateOptions}
      />

      {/* Invoices Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <SelectCheckbox
                  checked={selectedIds.length === invoices.length && invoices.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < invoices.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader label="Invoice #" field="invoiceNumber" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 table-header hidden sm:table-cell">Customer</th>
              <th className="px-4 py-3 table-header hidden md:table-cell">Job</th>
              <th className="px-4 py-3">
                <SortHeader label="Total" field="totalAmount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 table-header hidden lg:table-cell">Paid</th>
              <th className="px-4 py-3">
                <SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 hidden md:table-cell">
                <SortHeader label="Due Date" field="dueDate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 hidden lg:table-cell">
                <SortHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <SelectCheckbox
                    checked={selectedIds.includes(invoice.id)}
                    onChange={() => toggleSelect(invoice.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-sm">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-sm">
                  {invoice.job?.lead?.firstName} {invoice.job?.lead?.lastName}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm">{invoice.job?.jobNumber}</td>
                <td className="px-4 py-3 font-bold text-sm">${invoice.total?.toLocaleString()}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm">${invoice.paidAmount?.toLocaleString() || 0}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusColor(invoice.status)} text-xs`}>{invoice.status}</span>
                </td>
                <td className="px-4 py-3 text-sm hidden md:table-cell">
                  {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : ''}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                  {invoice.createdAt ? format(new Date(invoice.createdAt), 'MMM d, yyyy') : ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSendInvoice(invoice.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
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
                        className="text-green-600 hover:text-green-800 text-sm"
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
        {invoices.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-500">No invoices found</p>
        )}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={setPage} />

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">New Invoice</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">Record Payment - {invoice.invoiceNumber}</h2>
          <p className="text-sm text-gray-500">Total: ${invoice.total} | Remaining: ${remaining}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
