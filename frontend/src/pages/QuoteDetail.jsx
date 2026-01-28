import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuote, updateQuote, sendQuote, acceptQuote, convertLead } from '../api';
import { format } from 'date-fns';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadQuote();
  }, [id]);

  const loadQuote = async () => {
    try {
      const response = await getQuote(id);
      setQuote(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateQuote(id, formData);
      setEditing(false);
      loadQuote();
    } catch (error) {
      console.error('Error saving quote:', error);
    }
  };

  const handleSend = async () => {
    try {
      await sendQuote(id);
      loadQuote();
    } catch (error) {
      console.error('Error sending quote:', error);
    }
  };

  const handleAccept = async () => {
    try {
      await acceptQuote(id);
      loadQuote();
    } catch (error) {
      console.error('Error accepting quote:', error);
    }
  };

  const handleConvert = async () => {
    try {
      const response = await convertLead(quote.leadId, { quoteId: id });
      navigate(`/jobs/${response.data.id}`);
    } catch (error) {
      console.error('Error converting:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quote) {
    return <p className="text-center py-8 text-gray-500">Quote not found</p>;
  }

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'badge-gray',
      SENT: 'badge-blue',
      VIEWED: 'badge-yellow',
      ACCEPTED: 'badge-green',
      REJECTED: 'badge-red',
    };
    return colors[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
          <p className="text-gray-500">
            {quote.lead?.firstName} {quote.lead?.lastName} | {quote.type?.replace(/_/g, ' ')}
          </p>
        </div>
        <span className={`badge ${getStatusColor(quote.status)}`}>{quote.status}</span>
      </div>

      <div className="flex gap-2">
        {quote.status === 'DRAFT' && (
          <>
            <button onClick={() => setEditing(!editing)} className="btn-secondary">
              {editing ? 'Cancel' : 'Edit'}
            </button>
            {editing && (
              <button onClick={handleSave} className="btn-primary">Save</button>
            )}
            <button onClick={handleSend} className="btn-primary">Send Quote</button>
          </>
        )}
        {quote.status === 'SENT' && (
          <button onClick={handleAccept} className="btn-success">Mark as Accepted</button>
        )}
        {quote.status === 'ACCEPTED' && (
          <button onClick={handleConvert} className="btn-success">Convert to Job</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quote Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Estimated Hours</p>
                {editing ? (
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                    className="input"
                    step="0.5"
                  />
                ) : (
                  <p className="font-medium">{quote.estimatedHours} hrs</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Crew Size</p>
                {editing ? (
                  <input
                    type="number"
                    value={formData.crewSize}
                    onChange={(e) => setFormData({ ...formData, crewSize: parseInt(e.target.value) })}
                    className="input"
                  />
                ) : (
                  <p className="font-medium">{quote.crewSize} people</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Labor Rate</p>
                <p className="font-medium">${quote.laborRate}/hr</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Labor Total</p>
                <p className="font-medium">${quote.laborTotal?.toLocaleString()}</p>
              </div>
            </div>

            {quote.travelHours > 0 && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Travel Hours</p>
                    <p className="font-medium">{quote.travelHours} hrs</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Travel Total</p>
                    <p className="font-medium">${quote.travelTotal?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {quote.packingHours > 0 && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Packing Hours</p>
                    <p className="font-medium">{quote.packingHours} hrs</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Packing Total</p>
                    <p className="font-medium">${quote.packingTotal?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${quote.subtotal?.toLocaleString()}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-${quote.discount?.toLocaleString()}</span>
              </div>
            )}
            {quote.taxes > 0 && (
              <div className="flex justify-between">
                <span>Taxes</span>
                <span>${quote.taxes?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total</span>
              <span>${quote.total?.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-gray-500">Valid Until</p>
            <p className="font-medium">{format(new Date(quote.validUntil), 'MMM d, yyyy')}</p>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-500">Insurance</p>
            <p className="font-medium">{quote.insuranceOption?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}
    </div>
  );
}
