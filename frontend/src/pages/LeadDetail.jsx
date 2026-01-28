import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLead, updateLead, qualifyLead, convertLead, addFollowUp, createSurvey, createQuote, getEnums, getUsers, getRates } from '../api';
import { format } from 'date-fns';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [enums, setEnums] = useState(null);
  const [users, setUsers] = useState([]);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [leadRes, enumsRes, usersRes, ratesRes] = await Promise.all([
        getLead(id),
        getEnums(),
        getUsers(),
        getRates(),
      ]);
      setLead(leadRes.data);
      setEnums(enumsRes.data);
      setUsers(usersRes.data);
      setRates(ratesRes.data);
    } catch (error) {
      console.error('Error loading lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateLead(id, { status });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleQualify = async (score) => {
    try {
      await qualifyLead(id, { qualificationScore: score });
      loadData();
    } catch (error) {
      console.error('Error qualifying lead:', error);
    }
  };

  const handleConvert = async (quoteId) => {
    try {
      const response = await convertLead(id, { quoteId });
      navigate(`/jobs/${response.data.id}`);
    } catch (error) {
      console.error('Error converting lead:', error);
    }
  };

  const handleAddFollowUp = async (data) => {
    try {
      await addFollowUp(id, data);
      setShowFollowUpModal(false);
      loadData();
    } catch (error) {
      console.error('Error adding follow-up:', error);
    }
  };

  const handleScheduleSurvey = async (data) => {
    try {
      await createSurvey({ leadId: id, ...data });
      setShowSurveyModal(false);
      loadData();
    } catch (error) {
      console.error('Error scheduling survey:', error);
    }
  };

  const handleCreateQuote = async (data) => {
    try {
      const response = await createQuote({ leadId: id, ...data });
      setShowQuoteModal(false);
      navigate(`/quotes/${response.data.id}`);
    } catch (error) {
      console.error('Error creating quote:', error);
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

  if (!lead) {
    return <p className="text-center py-8 text-gray-500">Lead not found</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{lead.firstName} {lead.lastName}</h1>
          <p className="text-gray-500">{lead.email} | {lead.phone}</p>
        </div>
        <div className="flex gap-2">
          <span className={`badge ${getStatusColor(lead.status)}`}>{lead.status?.replace(/_/g, ' ')}</span>
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="select w-40"
          >
            {enums?.leadStatuses?.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowFollowUpModal(true)} className="btn-secondary">
          Add Follow-up
        </button>
        <button onClick={() => setShowSurveyModal(true)} className="btn-secondary">
          Schedule Survey
        </button>
        <button onClick={() => setShowQuoteModal(true)} className="btn-primary">
          Create Quote
        </button>
        {lead.status === 'QUOTED' && lead.quotes?.length > 0 && (
          <button
            onClick={() => handleConvert(lead.quotes[0].id)}
            className="btn-success"
          >
            Convert to Job
          </button>
        )}
        {lead.status === 'NEW' && (
          <button onClick={() => handleQualify(80)} className="btn-secondary">
            Qualify Lead
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Move Details */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Move Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Move Type</p>
                <p className="font-medium">{lead.moveType?.replace(/_/g, ' ') || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Move Date</p>
                <p className="font-medium">
                  {lead.moveDate ? format(new Date(lead.moveDate), 'MMM d, yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estimated Volume</p>
                <p className="font-medium">{lead.estimatedVolume ? `${lead.estimatedVolume} cu ft` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="font-medium">{lead.source?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          </div>

          {/* Origin & Destination */}
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-2">Origin</h3>
              <p>{lead.originAddress}</p>
              <p>{lead.originCity}, {lead.originState} {lead.originZip}</p>
              <p className="text-sm text-gray-500 mt-2">
                {lead.originPropertyType?.replace(/_/g, ' ')} | {lead.originBedrooms} BR
              </p>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-2">Destination</h3>
              <p>{lead.destAddress}</p>
              <p>{lead.destCity}, {lead.destState} {lead.destZip}</p>
              <p className="text-sm text-gray-500 mt-2">
                {lead.destPropertyType?.replace(/_/g, ' ')} | {lead.destBedrooms} BR
              </p>
            </div>
          </div>

          {/* Quotes */}
          {lead.quotes?.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Quotes</h2>
              <div className="space-y-2">
                {lead.quotes.map((quote) => (
                  <Link
                    key={quote.id}
                    to={`/quotes/${quote.id}`}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <p className="font-medium">{quote.quoteNumber}</p>
                      <p className="text-sm text-gray-500">{quote.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${quote.total?.toLocaleString()}</p>
                      <span className={`badge ${quote.status === 'ACCEPTED' ? 'badge-green' : 'badge-gray'}`}>
                        {quote.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-2">Notes</h2>
              <p className="whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Follow-ups */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Follow-ups</h2>
            {lead.followUps?.length > 0 ? (
              <div className="space-y-2">
                {lead.followUps.map((followUp) => (
                  <div key={followUp.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="badge badge-gray">{followUp.type}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(followUp.scheduledAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {followUp.notes && <p className="text-sm mt-1">{followUp.notes}</p>}
                    {followUp.completedAt && (
                      <p className="text-sm text-green-600 mt-1">Completed</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No follow-ups scheduled</p>
            )}
          </div>

          {/* Surveys */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Surveys</h2>
            {lead.surveys?.length > 0 ? (
              <div className="space-y-2">
                {lead.surveys.map((survey) => (
                  <div key={survey.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="badge badge-blue">{survey.type}</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(survey.scheduledAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {survey.completedAt ? (
                      <p className="text-sm text-green-600 mt-1">
                        Completed - {survey.totalVolume} cu ft
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-600 mt-1">Pending</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No surveys scheduled</p>
            )}
          </div>

          {/* Assignment */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Assignment</h2>
            {lead.assignedTo ? (
              <p>{lead.assignedTo.firstName} {lead.assignedTo.lastName}</p>
            ) : (
              <p className="text-gray-500">Unassigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFollowUpModal && (
        <FollowUpModal
          onClose={() => setShowFollowUpModal(false)}
          onSubmit={handleAddFollowUp}
        />
      )}
      {showSurveyModal && (
        <SurveyModal
          enums={enums}
          onClose={() => setShowSurveyModal(false)}
          onSubmit={handleScheduleSurvey}
        />
      )}
      {showQuoteModal && (
        <QuoteModal
          enums={enums}
          rates={rates}
          lead={lead}
          onClose={() => setShowQuoteModal(false)}
          onSubmit={handleCreateQuote}
        />
      )}
    </div>
  );
}

function FollowUpModal({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    type: 'CALL',
    scheduledAt: '',
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
          <h2 className="text-xl font-semibold">Add Follow-up</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="select"
            >
              <option value="CALL">Call</option>
              <option value="EMAIL">Email</option>
              <option value="TEXT">Text</option>
              <option value="IN_PERSON">In Person</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scheduled At</label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="input"
              required
            />
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
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add Follow-up</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SurveyModal({ enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    type: 'VIRTUAL',
    scheduledAt: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Schedule Survey</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="select"
            >
              {enums?.surveyTypes?.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Scheduled At</label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              className="input"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Schedule Survey</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuoteModal({ enums, rates, lead, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    type: 'NON_BINDING',
    estimatedHours: lead.estimatedVolume ? Math.ceil(lead.estimatedVolume / 150) : 4,
    crewSize: lead.estimatedVolume > 500 ? 3 : 2,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Create Quote</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <label className="block text-sm font-medium mb-1">Hours</label>
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
              <label className="block text-sm font-medium mb-1">Labor Rate</label>
              <input
                type="number"
                value={formData.laborRate}
                onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) })}
                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Quote</button>
          </div>
        </form>
      </div>
    </div>
  );
}
