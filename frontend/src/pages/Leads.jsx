import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLeads, createLead, getLeadStats, getEnums, bulkDeleteLeads, bulkUpdateLeads } from '../api';
import { format } from 'date-fns';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import BulkActions, { SelectCheckbox } from '../components/BulkActions';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';
import { validateForm, validators } from '../utils/validation';

const exportColumns = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'originCity', label: 'From' },
  { key: 'destCity', label: 'To' },
  { label: 'Move Date', accessor: (row) => row.moveDate ? format(new Date(row.moveDate), 'MMM d, yyyy') : '' },
  { label: 'Created', accessor: (row) => format(new Date(row.createdAt), 'MMM d, yyyy') },
];

const bulkUpdateOptions = [
  { label: 'Set Status: Contacted', value: 'status:CONTACTED' },
  { label: 'Set Status: Qualified', value: 'status:QUALIFIED' },
  { label: 'Set Status: Lost', value: 'status:LOST' },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', source: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, statsRes, enumsRes] = await Promise.all([
        getLeads({ ...filter, page, sortBy, sortOrder }),
        getLeadStats(),
        getEnums(),
      ]);
      const leadsData = leadsRes.data;
      setLeads(leadsData.data || leadsData.leads || leadsData);
      setPagination(leadsData.pagination || null);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
      setSelectedIds([]);
    } catch (error) {
      showToast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filter, page, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateLead = async (data) => {
    try {
      const response = await createLead(data);
      showToast.success('Lead created successfully');
      navigate(`/leads/${response.data.id}`);
    } catch (error) {
      showToast.error('Failed to create lead');
    }
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Selected Leads',
      message: `Are you sure you want to delete ${selectedIds.length} lead(s)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await bulkDeleteLeads(selectedIds);
        showToast.success(`${selectedIds.length} lead(s) deleted`);
        loadData();
      } catch (error) {
        showToast.error('Failed to delete leads');
      }
    }
  };

  const handleBulkUpdate = async (data) => {
    try {
      await bulkUpdateLeads(selectedIds, data);
      showToast.success(`${selectedIds.length} lead(s) updated`);
      loadData();
    } catch (error) {
      showToast.error('Failed to update leads');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
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

  if (loading && !leads.length) {
    return <TableSkeleton rows={8} cols={6} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard label="Total" value={stats?.totalLeads || 0} />
        <StatCard label="New" value={stats?.newLeads || 0} color="blue" />
        <StatCard label="Qualified" value={stats?.qualifiedLeads || 0} color="green" />
        <StatCard label="Quoted" value={stats?.quotedLeads || 0} color="yellow" />
        <StatCard label="Won" value={stats?.wonLeads || 0} color="green" />
        <StatCard label="Conversion" value={`${stats?.conversionRate || 0}%`} />
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
            {enums?.leadStatuses?.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={filter.source}
            onChange={(e) => { setFilter({ ...filter, source: e.target.value }); setPage(1); }}
            className="select w-full sm:w-40"
          >
            <option value="">All Sources</option>
            {enums?.leadSources?.map((source) => (
              <option key={source} value={source}>{source.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(leads, exportColumns, 'leads')} className="btn-secondary text-sm">
            CSV
          </button>
          <button onClick={() => exportToPDF(leads, exportColumns, 'leads', 'Leads Report')} className="btn-secondary text-sm">
            PDF
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            + New Lead
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

      {/* Leads Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <SelectCheckbox
                  checked={selectedIds.length === leads.length && leads.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < leads.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3"><SortHeader label="Contact" field="firstName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3 table-header hidden sm:table-cell">Source</th>
              <th className="px-4 py-3 table-header hidden md:table-cell">Move Details</th>
              <th className="px-4 py-3"><SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3 hidden lg:table-cell"><SortHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <SelectCheckbox
                    checked={selectedIds.includes(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                    <p className="text-xs text-gray-500 sm:hidden">{lead.phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="badge badge-gray text-xs">{lead.source?.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-sm">
                    <p>{lead.originCity} → {lead.destCity}</p>
                    {lead.moveDate && (
                      <p className="text-gray-500 text-xs">{format(new Date(lead.moveDate), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusColor(lead.status)} text-xs`}>
                    {lead.status?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                  {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-500">No leads found</p>
        )}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={setPage} />

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
    <div className="card text-center py-3 sm:py-6">
      <p className="text-xs sm:text-sm text-gray-500">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold ${colors[color] || 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function LeadModal({ enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    source: 'WEBSITE', moveType: 'LOCAL', moveDate: '',
    originAddress: '', originCity: '', originState: '', originZip: '',
    originPropertyType: 'APARTMENT', originBedrooms: 2,
    destAddress: '', destCity: '', destState: '', destZip: '',
    destPropertyType: 'APARTMENT', destBedrooms: 2, notes: '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm(formData, {
      firstName: [validators.required],
      lastName: [validators.required],
      email: [validators.required, validators.email],
      phone: [validators.required, validators.phone],
    });
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  const Field = ({ label, field, type = 'text', required, ...props }) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label} {required && '*'}</label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
        className={`input ${errors[field] ? 'border-red-500' : ''}`}
        {...props}
      />
      {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">New Lead</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name" field="firstName" required />
            <Field label="Last Name" field="lastName" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" field="email" type="email" required />
            <Field label="Phone" field="phone" type="tel" required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source</label>
              <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="select">
                {enums?.leadSources?.map((source) => (
                  <option key={source} value={source}>{source.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Move Type</label>
              <select value={formData.moveType} onChange={(e) => setFormData({ ...formData, moveType: e.target.value })} className="select">
                {enums?.moveTypes?.map((type) => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <Field label="Move Date" field="moveDate" type="date" />
          </div>
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Origin</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <input type="text" placeholder="Address" value={formData.originAddress} onChange={(e) => setFormData({ ...formData, originAddress: e.target.value })} className="input" />
              </div>
              <input type="text" placeholder="City" value={formData.originCity} onChange={(e) => setFormData({ ...formData, originCity: e.target.value })} className="input" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="State" value={formData.originState} onChange={(e) => setFormData({ ...formData, originState: e.target.value })} className="input" />
                <input type="text" placeholder="ZIP" value={formData.originZip} onChange={(e) => setFormData({ ...formData, originZip: e.target.value })} className="input" />
              </div>
            </div>
          </div>
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-2">Destination</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <input type="text" placeholder="Address" value={formData.destAddress} onChange={(e) => setFormData({ ...formData, destAddress: e.target.value })} className="input" />
              </div>
              <input type="text" placeholder="City" value={formData.destCity} onChange={(e) => setFormData({ ...formData, destCity: e.target.value })} className="input" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="State" value={formData.destState} onChange={(e) => setFormData({ ...formData, destState: e.target.value })} className="input" />
                <input type="text" placeholder="ZIP" value={formData.destZip} onChange={(e) => setFormData({ ...formData, destZip: e.target.value })} className="input" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}
