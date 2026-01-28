import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJobs, getEnums, getLeads, getQuotes, createJob } from '../api';
import { format } from 'date-fns';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const [jobsRes, enumsRes, leadsRes, quotesRes] = await Promise.all([
        getJobs(filter),
        getEnums(),
        getLeads({ status: 'QUOTED' }),
        getQuotes({ status: 'ACCEPTED' }),
      ]);
      setJobs(jobsRes.data);
      setEnums(enumsRes.data);
      setLeads(leadsRes.data.leads || []);
      setQuotes(quotesRes.data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (data) => {
    try {
      const response = await createJob(data);
      setShowModal(false);
      navigate(`/jobs/${response.data.id}`);
    } catch (error) {
      console.error('Error creating job:', error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="select w-40"
        >
          <option value="">All Statuses</option>
          {enums?.jobStatuses?.map((status) => (
            <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New Job
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 table-header">Job #</th>
              <th className="px-6 py-3 table-header">Customer</th>
              <th className="px-6 py-3 table-header">Route</th>
              <th className="px-6 py-3 table-header">Move Date</th>
              <th className="px-6 py-3 table-header">Crew</th>
              <th className="px-6 py-3 table-header">Status</th>
              <th className="px-6 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{job.jobNumber}</td>
                <td className="px-6 py-4">
                  <p>{job.lead?.firstName} {job.lead?.lastName}</p>
                  <p className="text-sm text-gray-500">{job.lead?.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm">{job.originCity} → {job.destCity}</p>
                </td>
                <td className="px-6 py-4">
                  {format(new Date(job.moveDate), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <p>{job.crewAssignments?.length || 0} / {job.crewSize}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${getStatusColor(job.status)}`}>
                    {job.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Link to={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-800">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && (
          <p className="text-center py-8 text-gray-500">No jobs found</p>
        )}
      </div>

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">New Job</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
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
