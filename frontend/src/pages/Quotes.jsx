import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getQuotes, getEnums, getLeads, createQuote, getRates } from '../api';
import { format } from 'date-fns';

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [enums, setEnums] = useState(null);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '' });
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      const [quotesRes, enumsRes, leadsRes, ratesRes] = await Promise.all([
        getQuotes(filter),
        getEnums(),
        getLeads({ status: 'QUALIFIED' }),
        getRates(),
      ]);
      setQuotes(quotesRes.data);
      setEnums(enumsRes.data);
      setLeads(leadsRes.data.leads || []);
      setRates(ratesRes.data);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async (data) => {
    try {
      const response = await createQuote(data);
      setShowModal(false);
      navigate(`/quotes/${response.data.id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
    }
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
          {enums?.quoteStatuses?.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New Quote
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 table-header">Quote #</th>
              <th className="px-6 py-3 table-header">Customer</th>
              <th className="px-6 py-3 table-header">Type</th>
              <th className="px-6 py-3 table-header">Total</th>
              <th className="px-6 py-3 table-header">Status</th>
              <th className="px-6 py-3 table-header">Created</th>
              <th className="px-6 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{quote.quoteNumber}</td>
                <td className="px-6 py-4">
                  <p>{quote.lead?.firstName} {quote.lead?.lastName}</p>
                  <p className="text-sm text-gray-500">{quote.lead?.email}</p>
                </td>
                <td className="px-6 py-4">{quote.type?.replace(/_/g, ' ')}</td>
                <td className="px-6 py-4 font-bold">${quote.total?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${getStatusColor(quote.status)}`}>{quote.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {format(new Date(quote.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <Link to={`/quotes/${quote.id}`} className="text-blue-600 hover:text-blue-800">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotes.length === 0 && (
          <p className="text-center py-8 text-gray-500">No quotes found</p>
        )}
      </div>

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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">New Quote</h2>
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

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium mb-1">Valid Days</label>
                  <input
                    type="number"
                    value={formData.validDays}
                    onChange={(e) => setFormData({ ...formData, validDays: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Est. Hours</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                    className="input"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Crew Size</label>
                  <input
                    type="number"
                    value={formData.crewSize}
                    onChange={(e) => setFormData({ ...formData, crewSize: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Labor Rate ($/hr)</label>
                  <input
                    type="number"
                    value={formData.laborRate}
                    onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) })}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
