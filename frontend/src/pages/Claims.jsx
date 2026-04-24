import { useState, useEffect, useCallback } from 'react';
import { getClaims, submitClaim, reviewClaim, approveClaim, denyClaim, getClaimStats, getEnums, getJobs, bulkDeleteClaims, bulkUpdateClaims } from '../api';
import { format } from 'date-fns';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import BulkActions, { SelectCheckbox } from '../components/BulkActions';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';

const exportColumns = [
  { key: 'claimNumber', label: 'Claim Number' },
  { label: 'Client', accessor: (row) => `${row.job?.lead?.firstName || ''} ${row.job?.lead?.lastName || ''}`.trim() },
  { key: 'type', label: 'Type' },
  { label: 'Amount', accessor: (row) => row.estimatedValue ? `$${row.estimatedValue.toLocaleString()}` : '' },
  { key: 'status', label: 'Status' },
  { label: 'Created Date', accessor: (row) => row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy') : '' },
];

const bulkUpdateOptions = [
  { label: 'Set Status: Submitted', value: 'status:SUBMITTED' },
  { label: 'Set Status: Under Review', value: 'status:UNDER_REVIEW' },
  { label: 'Set Status: Approved', value: 'status:APPROVED' },
  { label: 'Set Status: Denied', value: 'status:DENIED' },
  { label: 'Set Status: Settled', value: 'status:SETTLED' },
];

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [claimsRes, statsRes, enumsRes, jobsRes] = await Promise.all([
        getClaims({ ...filter, page, sortBy, sortOrder }),
        getClaimStats(),
        getEnums(),
        getJobs(), // Get all jobs, not just completed
      ]);
      const claimsData = claimsRes.data;
      setClaims(claimsData.data || claimsData);
      setPagination(claimsData.pagination || null);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
      // Filter out cancelled jobs - claims can be filed for any active/completed job
      const activeJobs = (jobsRes.data || []).filter(job => job.status !== 'CANCELLED');
      setJobs(activeJobs);
      setSelectedIds([]);
    } catch (error) {
      showToast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [filter, page, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitClaim = async (data) => {
    try {
      await submitClaim(data);
      showToast.success('Claim submitted successfully');
      setShowModal(false);
      loadData();
    } catch (error) {
      showToast.error('Failed to submit claim');
    }
  };

  const handleReview = async (id) => {
    try {
      await reviewClaim(id);
      showToast.success('Claim moved to review');
      loadData();
    } catch (error) {
      showToast.error('Failed to review claim');
    }
  };

  const handleResolve = async (data) => {
    try {
      if (data.approved) {
        await approveClaim(selectedClaim.id, {
          approvedAmount: data.approvedAmount,
          resolution: data.resolution,
        });
        showToast.success('Claim approved successfully');
      } else {
        await denyClaim(selectedClaim.id, { resolution: data.resolution });
        showToast.success('Claim denied');
      }
      setShowResolveModal(false);
      setSelectedClaim(null);
      loadData();
    } catch (error) {
      showToast.error('Failed to resolve claim');
    }
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Selected Claims',
      message: `Are you sure you want to delete ${selectedIds.length} claim(s)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await bulkDeleteClaims(selectedIds);
        showToast.success(`${selectedIds.length} claim(s) deleted`);
        loadData();
      } catch (error) {
        showToast.error('Failed to delete claims');
      }
    }
  };

  const handleBulkUpdate = async (data) => {
    try {
      await bulkUpdateClaims(selectedIds, data);
      showToast.success(`${selectedIds.length} claim(s) updated`);
      loadData();
    } catch (error) {
      showToast.error('Failed to update claims');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === claims.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(claims.map((c) => c.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      SUBMITTED: 'badge-blue',
      UNDER_REVIEW: 'badge-yellow',
      APPROVED: 'badge-green',
      DENIED: 'badge-red',
      SETTLED: 'badge-gray',
    };
    return colors[status] || 'badge-gray';
  };

  if (loading && !claims.length) {
    return <TableSkeleton rows={8} cols={7} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Total Claims</p>
          <p className="text-lg sm:text-2xl font-bold">{stats?.totalClaims || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Pending</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats?.pendingClaims || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Approved</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats?.approvedClaims || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Denied</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{stats?.deniedClaims || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Total Approved</p>
          <p className="text-lg sm:text-2xl font-bold">${stats?.totalApprovedAmount?.toLocaleString() || 0}</p>
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
            {enums?.claimStatuses?.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(claims, exportColumns, 'claims')} className="btn-secondary text-sm">
            CSV
          </button>
          <button onClick={() => exportToPDF(claims, exportColumns, 'claims', 'Claims Report')} className="btn-secondary text-sm">
            PDF
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            + Submit Claim
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

      {/* Claims Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <SelectCheckbox
                  checked={selectedIds.length === claims.length && claims.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < claims.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 table-header">Claim #</th>
              <th className="px-4 py-3 table-header">Customer</th>
              <th className="px-4 py-3 table-header hidden sm:table-cell">Type</th>
              <th className="px-4 py-3 table-header hidden lg:table-cell">Description</th>
              <th className="px-4 py-3 hidden md:table-cell">
                <SortHeader label="Est. Value" field="claimAmount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
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
            {claims.map((claim) => (
              <tr key={claim.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <SelectCheckbox
                    checked={selectedIds.includes(claim.id)}
                    onChange={() => toggleSelect(claim.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-sm">{claim.claimNumber}</td>
                <td className="px-4 py-3 text-sm">
                  {claim.job?.lead?.firstName} {claim.job?.lead?.lastName}
                </td>
                <td className="px-4 py-3 text-sm hidden sm:table-cell">{claim.type}</td>
                <td className="px-4 py-3 max-w-xs truncate text-sm hidden lg:table-cell">{claim.description}</td>
                <td className="px-4 py-3 text-sm hidden md:table-cell">${claim.estimatedValue?.toLocaleString() || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusColor(claim.status)} text-xs`}>
                    {claim.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                  {claim.createdAt ? format(new Date(claim.createdAt), 'MMM d, yyyy') : ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {claim.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleReview(claim.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Review
                      </button>
                    )}
                    {claim.status === 'UNDER_REVIEW' && (
                      <button
                        onClick={() => {
                          setSelectedClaim(claim);
                          setShowResolveModal(true);
                        }}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {claims.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-500">No claims found</p>
        )}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={setPage} />

      {showModal && (
        <ClaimModal
          jobs={jobs}
          enums={enums}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitClaim}
        />
      )}

      {showResolveModal && (
        <ResolveModal
          claim={selectedClaim}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedClaim(null);
          }}
          onSubmit={handleResolve}
        />
      )}
    </div>
  );
}

function ClaimModal({ jobs, enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    jobId: '',
    type: 'DAMAGE',
    description: '',
    estimatedValue: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">Submit Claim</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Job *</label>
            <select
              value={formData.jobId}
              onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
              className="select"
              required
            >
              <option value="">Select job</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobNumber} - {job.lead?.firstName} {job.lead?.lastName} ({job.status})
                </option>
              ))}
            </select>
            {jobs.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">No jobs available. Create a job first to submit claims.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="select"
            >
              {enums?.claimTypes?.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estimated Value</label>
            <input
              type="number"
              value={formData.estimatedValue}
              onChange={(e) => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) })}
              className="input"
              step="0.01"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Submit Claim</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResolveModal({ claim, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    approved: true,
    approvedAmount: claim?.estimatedValue || 0,
    resolution: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">Resolve Claim - {claim?.claimNumber}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, approved: true })}
              className={`py-2 rounded-lg border ${formData.approved ? 'bg-green-100 border-green-500' : ''}`}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, approved: false })}
              className={`py-2 rounded-lg border ${!formData.approved ? 'bg-red-100 border-red-500' : ''}`}
            >
              Deny
            </button>
          </div>
          {formData.approved && (
            <div>
              <label className="block text-sm font-medium mb-1">Approved Amount</label>
              <input
                type="number"
                value={formData.approvedAmount}
                onChange={(e) => setFormData({ ...formData, approvedAmount: parseFloat(e.target.value) })}
                className="input"
                step="0.01"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Resolution Notes</label>
            <textarea
              value={formData.resolution}
              onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
              className="input"
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className={formData.approved ? 'btn-success' : 'btn-danger'}>
              {formData.approved ? 'Approve' : 'Deny'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
