import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJobs, getEnums, getLeads, getQuotes, createJob, bulkDeleteJobs, bulkUpdateJobs } from '../api';
import { format } from 'date-fns';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import BulkActions, { SelectCheckbox } from '../components/BulkActions';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';

const exportColumns = [
  { key: 'jobNumber', label: 'Job #' },
  { label: 'Customer', accessor: (row) => `${row.lead?.firstName || ''} ${row.lead?.lastName || ''}`.trim() },
  { label: 'Phone', accessor: (row) => row.lead?.phone || '' },
  { label: 'Move Date', accessor: (row) => row.moveDate ? format(new Date(row.moveDate), 'MMM d, yyyy') : '' },
  { key: 'status', label: 'Status' },
  { label: 'Origin', accessor: (row) => `${row.originAddress || ''}, ${row.originCity || ''}, ${row.originState || ''} ${row.originZip || ''}`.trim() },
  { label: 'Destination', accessor: (row) => `${row.destAddress || ''}, ${row.destCity || ''}, ${row.destState || ''} ${row.destZip || ''}`.trim() },
  { label: 'Route', accessor: (row) => `${row.originCity || ''} → ${row.destCity || ''}` },
  { key: 'crewSize', label: 'Crew Size' },
  { key: 'trucksNeeded', label: 'Trucks' },
  { label: 'Total Amount', accessor: (row) => row.totalAmount != null ? `$${Number(row.totalAmount).toLocaleString()}` : '' },
  { label: 'Created', accessor: (row) => row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy') : '' },
];

const bulkUpdateOptions = [
  { label: 'Set Status: Scheduled', value: 'status:SCHEDULED' },
  { label: 'Set Status: In Progress', value: 'status:IN_PROGRESS' },
  { label: 'Set Status: Completed', value: 'status:COMPLETED' },
  { label: 'Set Status: Cancelled', value: 'status:CANCELLED' },
];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [leads, setLeads] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [jobsRes, enumsRes, leadsRes, quotesRes] = await Promise.all([
        getJobs({ ...filter, page, sortBy, sortOrder }),
        getEnums(),
        getLeads({ status: 'QUOTED' }),
        getQuotes({ status: 'ACCEPTED' }),
      ]);
      const jobsData = jobsRes.data;
      setJobs(jobsData.data || jobsData);
      setPagination(jobsData.pagination || null);
      setEnums(enumsRes.data);
      setLeads(leadsRes.data.leads || leadsRes.data.data || []);
      setQuotes(quotesRes.data || []);
      setSelectedIds([]);
    } catch (error) {
      showToast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [filter, page, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateJob = async (data) => {
    try {
      const response = await createJob(data);
      showToast.success('Job created successfully');
      setShowModal(false);
      navigate(`/jobs/${response.data.id}`);
    } catch (error) {
      showToast.error('Failed to create job');
    }
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Selected Jobs',
      message: `Are you sure you want to delete ${selectedIds.length} job(s)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await bulkDeleteJobs(selectedIds);
        showToast.success(`${selectedIds.length} job(s) deleted`);
        loadData();
      } catch (error) {
        showToast.error('Failed to delete jobs');
      }
    }
  };

  const handleBulkUpdate = async (data) => {
    try {
      await bulkUpdateJobs(selectedIds, data);
      showToast.success(`${selectedIds.length} job(s) updated`);
      loadData();
    } catch (error) {
      showToast.error('Failed to update jobs');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === jobs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(jobs.map((j) => j.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: 'badge-blue',
      CONFIRMED: 'badge-green',
      IN_PROGRESS: 'badge-yellow',
      LOADING: 'badge-yellow',
      IN_TRANSIT: 'badge-purple',
      UNLOADING: 'badge-yellow',
      COMPLETED: 'badge-green',
      CANCELLED: 'badge-red',
    };
    return colors[status] || 'badge-gray';
  };

  if (loading && !jobs.length) {
    return <TableSkeleton rows={8} cols={7} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <select
            value={filter.status}
            onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}
            className="select w-full sm:w-40"
          >
            <option value="">All Statuses</option>
            {enums?.jobStatuses?.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(jobs, exportColumns, 'jobs')} className="btn-secondary text-sm">
            CSV
          </button>
          <button onClick={() => exportToPDF(jobs, exportColumns, 'jobs', 'Jobs Report')} className="btn-secondary text-sm">
            PDF
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            + New Job
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

      {/* Jobs Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <SelectCheckbox
                  checked={selectedIds.length === jobs.length && jobs.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < jobs.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 table-header">Job #</th>
              <th className="px-4 py-3 table-header">Customer</th>
              <th className="px-4 py-3 table-header hidden md:table-cell">Route</th>
              <th className="px-4 py-3">
                <SortHeader label="Move Date" field="moveDate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 table-header hidden lg:table-cell">Crew</th>
              <th className="px-4 py-3">
                <SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 hidden lg:table-cell">
                <SortHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <SelectCheckbox
                    checked={selectedIds.includes(job.id)}
                    onChange={() => toggleSelect(job.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-sm">{job.jobNumber}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{job.lead?.firstName} {job.lead?.lastName}</p>
                    <p className="text-xs text-gray-500">{job.lead?.phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-sm">{job.originCity} → {job.destCity}</p>
                </td>
                <td className="px-4 py-3 text-sm">
                  {job.moveDate ? format(new Date(job.moveDate), 'MMM d, yyyy') : ''}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <p className="text-sm">{job.crewAssignments?.length || 0} / {job.crewSize}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusColor(job.status)} text-xs`}>
                    {job.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                  {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : ''}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-500">No jobs found</p>
        )}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Create Job Modal */}
      {showModal && (
        <JobModal
          leads={leads}
          quotes={quotes}
          enums={enums}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateJob}
        />
      )}
    </div>
  );
}

function JobModal({ leads, quotes, enums, onClose, onSubmit }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [formData, setFormData] = useState({
    leadId: '',
    quoteId: '',
    moveDate: '',
    originAddress: '',
    originCity: '',
    originState: '',
    originZip: '',
    destAddress: '',
    destCity: '',
    destState: '',
    destZip: '',
    crewSize: 2,
    trucksNeeded: 1,
    specialInstructions: '',
  });

  const handleLeadSelect = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    setSelectedLead(lead);

    // Find quotes for this lead
    const leadQuotes = quotes.filter(q => q.leadId === leadId);

    if (lead) {
      setFormData({
        ...formData,
        leadId,
        moveDate: lead.moveDate ? lead.moveDate.split('T')[0] : '',
        originAddress: lead.originAddress || '',
        originCity: lead.originCity || '',
        originState: lead.originState || '',
        originZip: lead.originZip || '',
        destAddress: lead.destAddress || '',
        destCity: lead.destCity || '',
        destState: lead.destState || '',
        destZip: lead.destZip || '',
        crewSize: lead.estimatedVolume > 500 ? 3 : 2,
      });
    }
  };

  const handleQuoteSelect = (quoteId) => {
    const quote = quotes.find(q => q.id === quoteId);
    setSelectedQuote(quote);
    setFormData({
      ...formData,
      quoteId,
      crewSize: quote?.crewSize || formData.crewSize,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const leadQuotes = quotes.filter(q => q.leadId === formData.leadId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">New Job</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Lead *</label>
            <select
              value={formData.leadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className="select"
              required
            >
              <option value="">Select a lead...</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.firstName} {lead.lastName} - {lead.originCity} to {lead.destCity}
                </option>
              ))}
            </select>
            {leads.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">No quoted leads available.</p>
            )}
          </div>

          {selectedLead && leadQuotes.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Quote (Optional)</label>
              <select
                value={formData.quoteId}
                onChange={(e) => handleQuoteSelect(e.target.value)}
                className="select"
              >
                <option value="">No quote selected</option>
                {leadQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.quoteNumber} - ${quote.total?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedLead && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Move Date *</label>
                <input
                  type="date"
                  value={formData.moveDate}
                  onChange={(e) => setFormData({ ...formData, moveDate: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Crew Size</label>
                  <input
                    type="number"
                    value={formData.crewSize}
                    onChange={(e) => setFormData({ ...formData, crewSize: parseInt(e.target.value) })}
                    className="input"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trucks Needed</label>
                  <input
                    type="number"
                    value={formData.trucksNeeded}
                    onChange={(e) => setFormData({ ...formData, trucksNeeded: parseInt(e.target.value) })}
                    className="input"
                    min="1"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Origin</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={formData.originAddress}
                      onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })}
                      placeholder="Address"
                      className="input"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.originCity}
                    onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                    placeholder="City"
                    className="input"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.originState}
                      onChange={(e) => setFormData({ ...formData, originState: e.target.value })}
                      placeholder="State"
                      className="input w-20"
                      required
                    />
                    <input
                      type="text"
                      value={formData.originZip}
                      onChange={(e) => setFormData({ ...formData, originZip: e.target.value })}
                      placeholder="ZIP"
                      className="input"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Destination</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={formData.destAddress}
                      onChange={(e) => setFormData({ ...formData, destAddress: e.target.value })}
                      placeholder="Address"
                      className="input"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.destCity}
                    onChange={(e) => setFormData({ ...formData, destCity: e.target.value })}
                    placeholder="City"
                    className="input"
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.destState}
                      onChange={(e) => setFormData({ ...formData, destState: e.target.value })}
                      placeholder="State"
                      className="input w-20"
                      required
                    />
                    <input
                      type="text"
                      value={formData.destZip}
                      onChange={(e) => setFormData({ ...formData, destZip: e.target.value })}
                      placeholder="ZIP"
                      className="input"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Special Instructions</label>
                <textarea
                  value={formData.specialInstructions}
                  onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!formData.leadId}>
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
