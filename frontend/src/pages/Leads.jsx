import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLeads, createLead, getLeadStats, getEnums } from '../api';
import { format } from 'date-fns';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', source: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const [leadsRes, statsRes, enumsRes] = await Promise.all([
        getLeads(filter),
        getLeadStats(),
        getEnums(),
      ]);
      setLeads(leadsRes.data.leads);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (data) => {
    try {
      const response = await createLead(data);
      navigate(`/leads/${response.data.id}`);
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      NEW: 'badge-blue',
      CONTACTED: 'badge-yellow',
      QUALIFIED: 'badge-green',
      SURVEY_SCHEDULED: 'badge-purple',
      QUOTED: 'badge-blue',
      WON: 'badge-green',
      LOST: 'badge-red',
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard label="Total" value={stats?.totalLeads || 0} />
        <StatCard label="New" value={stats?.newLeads || 0} color="blue" />
        <StatCard label="Qualified" value={stats?.qualifiedLeads || 0} color="green" />
        <StatCard label="Quoted" value={stats?.quotedLeads || 0} color="yellow" />
        <StatCard label="Won" value={stats?.wonLeads || 0} color="green" />
        <StatCard label="Conversion" value={`${stats?.conversionRate || 0}%`} />
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="select w-40"
          >
            <option value="">All Statuses</option>
            {enums?.leadStatuses?.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={filter.source}
            onChange={(e) => setFilter({ ...filter, source: e.target.value })}
            className="select w-40"
          >
            <option value="">All Sources</option>
            {enums?.leadSources?.map((source) => (
              <option key={source} value={source}>{source.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New Lead
        </button>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 table-header">Contact</th>
              <th className="px-6 py-3 table-header">Source</th>
              <th className="px-6 py-3 table-header">Move Details</th>
              <th className="px-6 py-3 table-header">Status</th>
              <th className="px-6 py-3 table-header">Created</th>
              <th className="px-6 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                    <p className="text-sm text-gray-500">{lead.email}</p>
                    <p className="text-sm text-gray-500">{lead.phone}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="badge badge-gray">{lead.source?.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p>{lead.originCity} → {lead.destCity}</p>
                    {lead.moveDate && (
                      <p className="text-gray-500">{format(new Date(lead.moveDate), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${getStatusColor(lead.status)}`}>
                    {lead.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:text-blue-800">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && (
          <p className="text-center py-8 text-gray-500">No leads found</p>
        )}
      </div>

      {/* Create Lead Modal */}
      {showModal && (
        <LeadModal
          enums={enums}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateLead}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <div className="card text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colors[color] || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function LeadModal({ enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'WEBSITE',
    moveType: 'LOCAL',
    moveDate: '',
    originAddress: '',
    originCity: '',
    originState: '',
    originZip: '',
    originPropertyType: 'APARTMENT',
    originBedrooms: 2,
    destAddress: '',
    destCity: '',
    destState: '',
    destZip: '',
    destPropertyType: 'APARTMENT',
    destBedrooms: 2,
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">New Lead</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="select"
              >
                {enums?.leadSources?.map((source) => (
                  <option key={source} value={source}>{source.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Move Type</label>
              <select
                value={formData.moveType}
                onChange={(e) => setFormData({ ...formData, moveType: e.target.value })}
                className="select"
              >
                {enums?.moveTypes?.map((type) => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Move Date</label>
              <input
                type="date"
                value={formData.moveDate}
                onChange={(e) => setFormData({ ...formData, moveDate: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Origin</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.originAddress}
                  onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })}
                  className="input"
                />
              </div>
              <input
                type="text"
                placeholder="City"
                value={formData.originCity}
                onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                className="input"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="State"
                  value={formData.originState}
                  onChange={(e) => setFormData({ ...formData, originState: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={formData.originZip}
                  onChange={(e) => setFormData({ ...formData, originZip: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Destination</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.destAddress}
                  onChange={(e) => setFormData({ ...formData, destAddress: e.target.value })}
                  className="input"
                />
              </div>
              <input
                type="text"
                placeholder="City"
                value={formData.destCity}
                onChange={(e) => setFormData({ ...formData, destCity: e.target.value })}
                className="input"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="State"
                  value={formData.destState}
                  onChange={(e) => setFormData({ ...formData, destState: e.target.value })}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={formData.destZip}
                  onChange={(e) => setFormData({ ...formData, destZip: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
