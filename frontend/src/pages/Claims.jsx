import { useState, useEffect } from 'react';
import { getClaims, submitClaim, reviewClaim, approveClaim, denyClaim, getClaimStats, getEnums, getJobs } from '../api';
import { format } from 'date-fns';

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const [claimsRes, statsRes, enumsRes, jobsRes] = await Promise.all([
        getClaims(filter),
        getClaimStats(),
        getEnums(),
        getJobs(), // Get all jobs, not just completed
      ]);
      setClaims(claimsRes.data);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
      // Filter out cancelled jobs - claims can be filed for any active/completed job
      const activeJobs = (jobsRes.data || []).filter(job => job.status !== 'CANCELLED');
      setJobs(activeJobs);
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClaim = async (data) => {
    try {
      await submitClaim(data);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error submitting claim:', error);
    }
  };

  const handleReview = async (id) => {
    try {
      await reviewClaim(id);
      loadData();
    } catch (error) {
      console.error('Error reviewing claim:', error);
    }
  };

  const handleResolve = async (data) => {
    try {
      if (data.approved) {
        await approveClaim(selectedClaim.id, {
          approvedAmount: data.approvedAmount,
          resolution: data.resolution,
        });
      } else {
        await denyClaim(selectedClaim.id, { resolution: data.resolution });
      }
      setShowResolveModal(false);
      setSelectedClaim(null);
      loadData();
    } catch (error) {
      console.error('Error resolving claim:', error);
    }
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Claims</p>
          <p className="text-2xl font-bold">{stats?.totalClaims || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.pendingClaims || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats?.approvedClaims || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Denied</p>
          <p className="text-2xl font-bold text-red-600">{stats?.deniedClaims || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Approved</p>
          <p className="text-2xl font-bold">${stats?.totalApprovedAmount?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="select w-40"
        >
          <option value="">All Statuses</option>
          {enums?.claimStatuses?.map((status) => (
            <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Submit Claim
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 table-header">Claim #</th>
              <th className="px-6 py-3 table-header">Customer</th>
              <th className="px-6 py-3 table-header">Type</th>
              <th className="px-6 py-3 table-header">Description</th>
              <th className="px-6 py-3 table-header">Est. Value</th>
              <th className="px-6 py-3 table-header">Status</th>
              <th className="px-6 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {claims.map((claim) => (
              <tr key={claim.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{claim.claimNumber}</td>
                <td className="px-6 py-4">
                  {claim.job?.lead?.firstName} {claim.job?.lead?.lastName}
                </td>
                <td className="px-6 py-4">{claim.type}</td>
                <td className="px-6 py-4 max-w-xs truncate">{claim.description}</td>
                <td className="px-6 py-4">${claim.estimatedValue?.toLocaleString() || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${getStatusColor(claim.status)}`}>
                    {claim.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {claim.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleReview(claim.id)}
                        className="text-blue-600 hover:text-blue-800"
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
                        className="text-green-600 hover:text-green-800"
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
        {claims.length === 0 && (
          <p className="text-center py-8 text-gray-500">No claims found</p>
        )}
      </div>

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Submit Claim</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Resolve Claim - {claim?.claimNumber}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, approved: true })}
              className={`flex-1 py-2 rounded-lg border ${formData.approved ? 'bg-green-100 border-green-500' : ''}`}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, approved: false })}
              className={`flex-1 py-2 rounded-lg border ${!formData.approved ? 'bg-red-100 border-red-500' : ''}`}
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
