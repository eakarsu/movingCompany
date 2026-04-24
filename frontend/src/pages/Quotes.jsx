import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getQuotes, getEnums, getLeads, createQuote, getRates, bulkDeleteQuotes, bulkUpdateQuotes } from '../api';
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
  { key: 'quoteNumber', label: 'Quote Number' },
  { label: 'Client Name', accessor: (row) => `${row.lead?.firstName || ''} ${row.lead?.lastName || ''}`.trim() },
  { label: 'Move Type', accessor: (row) => row.type?.replace(/_/g, ' ') || '' },
  { label: 'Total', accessor: (row) => row.total != null ? `$${row.total.toLocaleString()}` : '' },
  { key: 'status', label: 'Status' },
  { label: 'Created Date', accessor: (row) => format(new Date(row.createdAt), 'MMM d, yyyy') },
];

const bulkUpdateOptions = [
  { label: 'Set Status: Draft', value: 'status:DRAFT' },
  { label: 'Set Status: Sent', value: 'status:SENT' },
  { label: 'Set Status: Accepted', value: 'status:ACCEPTED' },
  { label: 'Set Status: Rejected', value: 'status:REJECTED' },
];

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [leads, setLeads] = useState([]);
  const [enums, setEnums] = useState(null);
  const [rates, setRates] = useState(null);
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
      const [quotesRes, enumsRes, leadsRes, ratesRes] = await Promise.all([
        getQuotes({ ...filter, page, sortBy, sortOrder }),
        getEnums(),
        getLeads({ status: 'QUALIFIED' }),
        getRates(),
      ]);
      const data = quotesRes.data;
      setQuotes(data.data || data.quotes || data);
      setPagination(data.pagination || null);
      setEnums(enumsRes.data);
      setLeads(leadsRes.data.data || leadsRes.data.leads || []);
      setRates(ratesRes.data);
      setSelectedIds([]);
    } catch (error) {
      showToast.error('Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [filter, page, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateQuote = async (data) => {
    try {
      const response = await createQuote(data);
      showToast.success('Quote created successfully');
      setShowModal(false);
      navigate(`/quotes/${response.data.id}`);
    } catch (error) {
      showToast.error('Failed to create quote');
    }
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Selected Quotes',
      message: `Are you sure you want to delete ${selectedIds.length} quote(s)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await bulkDeleteQuotes(selectedIds);
        showToast.success(`${selectedIds.length} quote(s) deleted`);
        loadData();
      } catch (error) {
        showToast.error('Failed to delete quotes');
      }
    }
  };

  const handleBulkUpdate = async (data) => {
    try {
      await bulkUpdateQuotes(selectedIds, data);
      showToast.success(`${selectedIds.length} quote(s) updated`);
      loadData();
    } catch (error) {
      showToast.error('Failed to update quotes');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === quotes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(quotes.map((q) => q.id));
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
      ACCEPTED: 'badge-green',
      REJECTED: 'badge-red',
      EXPIRED: 'badge-gray',
    };
    return colors[status] || 'badge-gray';
  };

  if (loading && !quotes.length) {
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
            {enums?.quoteStatuses?.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(quotes, exportColumns, 'quotes')} className="btn-secondary text-sm">
            CSV
          </button>
          <button onClick={() => exportToPDF(quotes, exportColumns, 'quotes', 'Quotes Report')} className="btn-secondary text-sm">
            PDF
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            + New Quote
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

      {/* Quotes Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <SelectCheckbox
                  checked={selectedIds.length === quotes.length && quotes.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < quotes.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3"><SortHeader label="Quote #" field="quoteNumber" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3"><SortHeader label="Customer" field="lead.firstName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3 table-header hidden md:table-cell">Type</th>
              <th className="px-4 py-3 hidden sm:table-cell"><SortHeader label="Total" field="total" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3"><SortHeader label="Status" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3 hidden lg:table-cell"><SortHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} /></th>
              <th className="px-4 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <SelectCheckbox
                    checked={selectedIds.includes(quote.id)}
                    onChange={() => toggleSelect(quote.id)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-sm">{quote.quoteNumber}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{quote.lead?.firstName} {quote.lead?.lastName}</p>
                    <p className="text-xs text-gray-500">{quote.lead?.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm">{quote.type?.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="font-bold text-sm">${quote.total?.toLocaleString()}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusColor(quote.status)} text-xs`}>{quote.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                  {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/quotes/${quote.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotes.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-500">No quotes found</p>
        )}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Create Quote Modal */}
      {showModal && (
        <QuoteModal
          leads={leads}
          enums={enums}
          rates={rates}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateQuote}
        />
      )}
    </div>
  );
}

function QuoteModal({ leads, enums, rates, onClose, onSubmit }) {
  const [selectedLead, setSelectedLead] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    leadId: '',
    type: 'NON_BINDING',
    estimatedHours: 4,
    crewSize: 2,
    laborRate: rates?.laborRate || 50,
    travelHours: 1,
    travelRate: rates?.travelRate || 35,
    packingHours: 0,
    packingRate: rates?.packingRate || 40,
    packingMaterials: 0,
    insuranceOption: 'BASIC',
    insuranceFee: 0,
    discount: 0,
    validDays: 30,
    notes: '',
  });

  const handleLeadSelect = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    setSelectedLead(lead);
    setFormData({
      ...formData,
      leadId,
      estimatedHours: lead?.estimatedVolume ? Math.ceil(lead.estimatedVolume / 150) : 4,
      crewSize: lead?.estimatedVolume > 500 ? 3 : 2,
    });
    if (errors.leadId) {
      setErrors((prev) => ({ ...prev, leadId: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm(formData, {
      leadId: [validators.required],
      estimatedHours: [validators.required],
      crewSize: [validators.required],
      laborRate: [validators.required],
      validDays: [validators.required],
    });
    if (!isValid) {
      setErrors(validationErrors);
      showToast.error('Please fix the form errors');
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">New Quote</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Lead *</label>
            <select
              value={formData.leadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className={`select ${errors.leadId ? 'border-red-500' : ''}`}
            >
              <option value="">Select a lead...</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.firstName} {lead.lastName} - {lead.originCity} to {lead.destCity}
                </option>
              ))}
            </select>
            {errors.leadId && <p className="text-red-500 text-xs mt-1">{errors.leadId}</p>}
            {leads.length === 0 && (
              <p className="text-sm text-yellow-600 mt-1">No qualified leads available. Qualify a lead first.</p>
            )}
          </div>

          {selectedLead && (
            <>
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p><strong>Move:</strong> {selectedLead.originCity} → {selectedLead.destCity}</p>
                <p><strong>Type:</strong> {selectedLead.moveType?.replace(/_/g, ' ')}</p>
                {selectedLead.moveDate && (
                  <p><strong>Date:</strong> {format(new Date(selectedLead.moveDate), 'MMM d, yyyy')}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quote Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="select"
                  >
                    {enums?.quoteTypes?.map((type) => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valid Days *</label>
                  <input
                    type="number"
                    value={formData.validDays}
                    onChange={(e) => setFormData({ ...formData, validDays: parseInt(e.target.value) })}
                    className={`input ${errors.validDays ? 'border-red-500' : ''}`}
                  />
                  {errors.validDays && <p className="text-red-500 text-xs mt-1">{errors.validDays}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Est. Hours *</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                    className={`input ${errors.estimatedHours ? 'border-red-500' : ''}`}
                    step="0.5"
                  />
                  {errors.estimatedHours && <p className="text-red-500 text-xs mt-1">{errors.estimatedHours}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Crew Size *</label>
                  <input
                    type="number"
                    value={formData.crewSize}
                    onChange={(e) => setFormData({ ...formData, crewSize: parseInt(e.target.value) })}
                    className={`input ${errors.crewSize ? 'border-red-500' : ''}`}
                  />
                  {errors.crewSize && <p className="text-red-500 text-xs mt-1">{errors.crewSize}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Labor Rate ($/hr) *</label>
                  <input
                    type="number"
                    value={formData.laborRate}
                    onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) })}
                    className={`input ${errors.laborRate ? 'border-red-500' : ''}`}
                  />
                  {errors.laborRate && <p className="text-red-500 text-xs mt-1">{errors.laborRate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Travel Hours</label>
                  <input
                    type="number"
                    value={formData.travelHours}
                    onChange={(e) => setFormData({ ...formData, travelHours: parseFloat(e.target.value) })}
                    className="input"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Travel Rate ($/hr)</label>
                  <input
                    type="number"
                    value={formData.travelRate}
                    onChange={(e) => setFormData({ ...formData, travelRate: parseFloat(e.target.value) })}
                    className="input"
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
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!formData.leadId}>
              Create Quote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
