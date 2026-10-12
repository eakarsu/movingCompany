import FormattedAIReport from "../components/FormattedAIReport";

import FullAIExamples, { useFullAIExamples } from "../components/FullAIExamples.jsx";
import { useState, useEffect } from 'react';
import { getVolumeEstimate, generateQuote, optimizeCrew, planRoute, generateReviewResponse, generateCommunication, getEnums } from '../api';

export default function AITools() {
  const [activeTab, setActiveTab] = useState('volume');
  const [enums, setEnums] = useState(null);

  useEffect(() => {
    const loadEnums = async () => {
      try {
        const response = await getEnums();
        setEnums(response.data);
      } catch (error) {
        console.error('Error loading enums:', error);
      }
    };
    loadEnums();
  }, []);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <TabButton active={activeTab === 'volume'} onClick={() => setActiveTab('volume')}>
          Volume Estimator
        </TabButton>
        <TabButton active={activeTab === 'quote'} onClick={() => setActiveTab('quote')}>
          Quote Generator
        </TabButton>
        <TabButton active={activeTab === 'crew'} onClick={() => setActiveTab('crew')}>
          Crew Optimizer
        </TabButton>
        <TabButton active={activeTab === 'route'} onClick={() => setActiveTab('route')}>
          Route Planner
        </TabButton>
        <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')}>
          Review Response
        </TabButton>
        <TabButton active={activeTab === 'communication'} onClick={() => setActiveTab('communication')}>
          Communication
        </TabButton>
      </div>

      {activeTab === 'volume' && <VolumeEstimator enums={enums} />}
      {activeTab === 'quote' && <QuoteGenerator enums={enums} />}
      {activeTab === 'crew' && <CrewOptimizer />}
      {activeTab === 'route' && <RoutePlanner />}
      {activeTab === 'review' && <ReviewResponse />}
      {activeTab === 'communication' && <CommunicationGenerator enums={enums} />}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >
      {children}
    </button>
  );
}

function VolumeEstimator({ enums }) {
  const fullAIExamples = useFullAIExamples();

  const [formData, setFormData] = useState({
    propertyType: 'APARTMENT',
    bedrooms: 2,
    rooms: [],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const addRoom = () => {
    setFormData({
      ...formData,
      rooms: [...formData.rooms, { type: enums?.roomTypes?.[0]?.value || 'living_room', itemDensity: 'medium' }],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await getVolumeEstimate(formData);
      setResult(response.data);
    } catch (error) {
      console.error('Error estimating volume:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">AI Volume Estimator</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-full-ai-workspace="VolumeEstimator"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} beforeFill={() => { if (!formData.rooms.length) addRoom(); }} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property Type</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                className="select" data-full-ai-field={fullAIExamples.bind({ current: formData.propertyType, change: (e) => setFormData({ ...formData, propertyType: e.target.value }), label: "formData.propertyType", manual: false, json: false, sample: 'APARTMENT' }, "p1-3372", undefined)}
              >
                {enums?.propertyTypes?.map((type) => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bedrooms</label>
              <input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                className="input"
                min="1"
                max="10" data-full-ai-field={fullAIExamples.bind({ current: formData.bedrooms, change: (e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) }), label: "formData.bedrooms", manual: false, json: false, sample: 2 }, "p1-3886", undefined)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Rooms</label>
              <button type="button" onClick={addRoom} className="text-blue-600 text-sm">
                + Add Room
              </button>
            </div>
            {formData.rooms.map((room, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={room.type}
                  onChange={(e) => {
                    const newRooms = [...formData.rooms];
                    newRooms[index].type = e.target.value;
                    setFormData({ ...formData, rooms: newRooms });
                  }}
                  className="select flex-1" data-full-ai-field={fullAIExamples.bind({ current: room.type, change: (e) => {
                    const newRooms = [...formData.rooms];
                    newRooms[index].type = e.target.value;
                    setFormData({ ...formData, rooms: newRooms });
                  }, label: "room.type", manual: false, json: false }, "p1-4639", [index].join(":"))}
                >
                  {enums?.roomTypes?.map((roomType) => (
                    <option key={roomType.value} value={roomType.value}>{roomType.label}</option>
                  ))}
                </select>
                <select
                  value={room.itemDensity}
                  onChange={(e) => {
                    const newRooms = [...formData.rooms];
                    newRooms[index].itemDensity = e.target.value;
                    setFormData({ ...formData, rooms: newRooms });
                  }}
                  className="select w-32" data-full-ai-field={fullAIExamples.bind({ current: room.itemDensity, change: (e) => {
                    const newRooms = [...formData.rooms];
                    newRooms[index].itemDensity = e.target.value;
                    setFormData({ ...formData, rooms: newRooms });
                  }, label: "room.itemDensity", manual: false, json: false }, "p1-5206", [index].join(":"))}
                >
                  {enums?.itemDensities?.map((density) => (
                    <option key={density.value} value={density.value}>{density.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Estimating...' : 'Estimate Volume'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Estimate Results</h2>
          <FormattedAIReport response={result} />
          <div className="space-y-4">
            <div className="text-center py-6 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500">Estimated Volume</p>
              <p className="text-4xl font-bold text-blue-600">{result.estimatedVolume} cu ft</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Estimated Weight</p>
                <p className="text-xl font-bold">{result.estimatedWeight?.toLocaleString()} lbs</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Confidence</p>
                <p className="text-xl font-bold">{(result.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuoteGenerator({ enums }) {
  const fullAIExamples = useFullAIExamples();

  const [formData, setFormData] = useState({
    volume: 500,
    moveType: 'LOCAL',
    distance: 20,
    floors: 1,
    hasElevator: false,
    packingNeeded: false,
    specialItems: [],
    moveDate: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await generateQuote(formData);
      setResult(response.data);
    } catch (error) {
      console.error('Error generating quote:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">AI Quote Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-full-ai-workspace="QuoteGenerator"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Volume (cu ft)</label>
              <input
                type="number"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: parseInt(e.target.value) })}
                className="input" data-full-ai-field={fullAIExamples.bind({ current: formData.volume, change: (e) => setFormData({ ...formData, volume: parseInt(e.target.value) }), label: "formData.volume", manual: false, json: false, sample: 500 }, "p1-8149", undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Move Type</label>
              <select
                value={formData.moveType}
                onChange={(e) => setFormData({ ...formData, moveType: e.target.value })}
                className="select" data-full-ai-field={fullAIExamples.bind({ current: formData.moveType, change: (e) => setFormData({ ...formData, moveType: e.target.value }), label: "formData.moveType", manual: false, json: false, sample: 'LOCAL' }, "p1-8507", undefined)}
              >
                {enums?.moveTypes?.map((type) => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Distance (miles)</label>
              <input
                type="number"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: parseInt(e.target.value) })}
                className="input" data-full-ai-field={fullAIExamples.bind({ current: formData.distance, change: (e) => setFormData({ ...formData, distance: parseInt(e.target.value) }), label: "formData.distance", manual: false, json: false, sample: 20 }, "p1-9085", undefined)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Floors</label>
              <input
                type="number"
                value={formData.floors}
                onChange={(e) => setFormData({ ...formData, floors: parseInt(e.target.value) })}
                className="input"
                min="1" data-full-ai-field={fullAIExamples.bind({ current: formData.floors, change: (e) => setFormData({ ...formData, floors: parseInt(e.target.value) }), label: "formData.floors", manual: false, json: false, sample: 1 }, "p1-9444", undefined)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hasElevator}
                onChange={(e) => setFormData({ ...formData, hasElevator: e.target.checked })}
                className="mr-2" data-full-ai-field={fullAIExamples.bind({ current: formData.hasElevator, change: (e) => setFormData({ ...formData, hasElevator: e.target.checked }), label: "formData.hasElevator", manual: false, json: false, sample: false }, "p1-9832", undefined)}
              />
              Has Elevator
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.packingNeeded}
                onChange={(e) => setFormData({ ...formData, packingNeeded: e.target.checked })}
                className="mr-2" data-full-ai-field={fullAIExamples.bind({ current: formData.packingNeeded, change: (e) => setFormData({ ...formData, packingNeeded: e.target.checked }), label: "formData.packingNeeded", manual: false, json: false, sample: false }, "p1-10174", undefined)}
              />
              Packing Needed
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Move Date</label>
            <input
              type="date"
              value={formData.moveDate}
              onChange={(e) => setFormData({ ...formData, moveDate: e.target.value })}
              className="input" data-full-ai-field={fullAIExamples.bind({ current: formData.moveDate, change: (e) => setFormData({ ...formData, moveDate: e.target.value }), label: "formData.moveDate", manual: false, json: false, sample: '' }, "p1-10583", undefined)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Generating...' : 'Generate Quote'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Generated Quote</h2>
          <FormattedAIReport response={result} />
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span>Labor ({result.quote?.estimatedHours} hrs x {result.quote?.crewSize} crew x ${result.quote?.laborRate})</span>
              <span className="font-medium">${result.quote?.laborTotal}</span>
            </div>
            {result.quote?.travelTotal > 0 && (
              <div className="flex justify-between border-b pb-2">
                <span>Travel</span>
                <span className="font-medium">${result.quote?.travelTotal}</span>
              </div>
            )}
            {result.quote?.packingTotal > 0 && (
              <div className="flex justify-between border-b pb-2">
                <span>Packing</span>
                <span className="font-medium">${result.quote?.packingTotal}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2">
              <span>Total</span>
              <span className="text-blue-600">${result.quote?.total}</span>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p><strong>Crew Size:</strong> {result.quote?.crewSize} people</p>
              <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CrewOptimizer() {
  const fullAIExamples = useFullAIExamples();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    requiredCrewSize: 3,
    requiredSkills: [],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await optimizeCrew(formData);
      setResult(response.data);
    } catch (error) {
      console.error('Error optimizing crew:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">AI Crew Optimizer</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-full-ai-workspace="CrewOptimizer"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input" data-full-ai-field={fullAIExamples.bind({ current: formData.date, change: (e) => setFormData({ ...formData, date: e.target.value }), label: "formData.date", manual: false, json: false, sample: new Date().toISOString().split('T')[0] }, "p1-13436", undefined)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Required Crew Size</label>
            <input
              type="number"
              value={formData.requiredCrewSize}
              onChange={(e) => setFormData({ ...formData, requiredCrewSize: parseInt(e.target.value) })}
              className="input"
              min="1" data-full-ai-field={fullAIExamples.bind({ current: formData.requiredCrewSize, change: (e) => setFormData({ ...formData, requiredCrewSize: parseInt(e.target.value) }), label: "formData.requiredCrewSize", manual: false, json: false, sample: 3 }, "p1-13769", undefined)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Optimizing...' : 'Find Optimal Crew'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recommended Crew</h2>
          <FormattedAIReport response={result} />
          <p className="text-sm text-gray-500 mb-4">
            {result.totalAvailable} available | Confidence: {(result.confidence * 100).toFixed(0)}%
          </p>
          <div className="space-y-2">
            {result.recommendedCrew?.map((crew) => (
              <div key={crew.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{crew.firstName} {crew.lastName}</p>
                  <span className="badge badge-gray">{crew.role}</span>
                </div>
                <span className="text-sm text-gray-500">Score: {crew.optimizationScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoutePlanner() {
  const fullAIExamples = useFullAIExamples();

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    stops: [],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await planRoute(formData);
      setResult(response.data);
    } catch (error) {
      console.error('Error planning route:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">AI Route Planner</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-full-ai-workspace="RoutePlanner"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div>
            <label className="block text-sm font-medium mb-1">Origin Address</label>
            <input
              type="text"
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              className="input"
              placeholder="123 Main St, City, State" data-full-ai-field={fullAIExamples.bind({ current: formData.origin, change: (e) => setFormData({ ...formData, origin: e.target.value }), label: "formData.origin", manual: false, json: false, sample: '' }, "p1-15995", undefined)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Destination Address</label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              className="input"
              placeholder="456 Oak Ave, City, State" data-full-ai-field={fullAIExamples.bind({ current: formData.destination, change: (e) => setFormData({ ...formData, destination: e.target.value }), label: "formData.destination", manual: false, json: false, sample: '' }, "p1-16386", undefined)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Planning...' : 'Plan Route'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Route Details</h2>
          <FormattedAIReport response={result} />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500">Distance</p>
              <p className="text-2xl font-bold text-blue-600">{result.estimatedDistance} mi</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-500">Drive Time</p>
              <p className="text-2xl font-bold text-green-600">{result.estimatedDriveTime} min</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Suggested Departure:</strong> {result.suggestedDepartureTime}</p>
            <p><strong>Traffic:</strong> {result.trafficCondition}</p>
            <p><strong>Est. Fuel:</strong> {result.fuelEstimate} gallons</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewResponse() {
  const fullAIExamples = useFullAIExamples();

  const [formData, setFormData] = useState({
    customerName: '',
    rating: 5,
    reviewText: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await generateReviewResponse(formData);
      setResult(response.data);
    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">AI Review Response Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-full-ai-workspace="ReviewResponse"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="input" data-full-ai-field={fullAIExamples.bind({ current: formData.customerName, change: (e) => setFormData({ ...formData, customerName: e.target.value }), label: "formData.customerName", manual: false, json: false, sample: '' }, "p1-18805", undefined)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating })}
                  className={`w-10 h-10 rounded-lg ${formData.rating >= rating ? 'bg-yellow-400' : 'bg-gray-200'}`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Review Text</label>
            <textarea
              value={formData.reviewText}
              onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
              className="input"
              rows={4}
              placeholder="Paste the customer's review here..." data-full-ai-field={fullAIExamples.bind({ current: formData.reviewText, change: (e) => setFormData({ ...formData, reviewText: e.target.value }), label: "formData.reviewText", manual: false, json: false, sample: '' }, "p1-19729", undefined)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Generating...' : 'Generate Response'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Suggested Response</h2>
          <FormattedAIReport response={result} />
          <div className="mb-4">
            <span className={`badge ${result.tone === 'grateful' ? 'badge-green' : result.tone === 'apologetic' ? 'badge-red' : 'badge-yellow'}`}>
              {result.tone}
            </span>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
            {result.suggestedResponse}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(result.suggestedResponse)}
            className="mt-4 btn-secondary w-full"
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}

function CommunicationGenerator({ enums }) {
  const fullAIExamples = useFullAIExamples();

  const [formData, setFormData] = useState({
    type: 'reminder',
    customerName: '',
    jobDetails: {
      moveDate: '',
      origin: '',
      destination: '',
    },
    context: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await generateCommunication(formData);
      setResult(response.data);
    } catch (error) {
      console.error('Error generating communication:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">AI Communication Generator</h2>
        <form onSubmit={handleSubmit} className="space-y-4" data-full-ai-workspace="CommunicationGenerator"><FullAIExamples controller={fullAIExamples} disabled={Boolean(loading)} />
          <div>
            <label className="block text-sm font-medium mb-1">Message Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="select" data-full-ai-field={fullAIExamples.bind({ current: formData.type, change: (e) => setFormData({ ...formData, type: e.target.value }), label: "formData.type", manual: false, json: false, sample: 'reminder' }, "p1-22003", undefined)}
            >
              {enums?.communicationMessageTypes?.map((msgType) => (
                <option key={msgType.value} value={msgType.value}>{msgType.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="input" data-full-ai-field={fullAIExamples.bind({ current: formData.customerName, change: (e) => setFormData({ ...formData, customerName: e.target.value }), label: "formData.customerName", manual: false, json: false, sample: '' }, "p1-22505", undefined)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Move Date</label>
            <input
              type="date"
              value={formData.jobDetails.moveDate}
              onChange={(e) => setFormData({
                ...formData,
                jobDetails: { ...formData.jobDetails, moveDate: e.target.value }
              })}
              className="input" data-full-ai-field={fullAIExamples.bind({ current: formData.jobDetails.moveDate, change: (e) => setFormData({
                ...formData,
                jobDetails: { ...formData.jobDetails, moveDate: e.target.value }
              }), label: "formData.jobDetails.moveDate", manual: false, json: false, sample: '' }, "p1-22845", undefined)}
            />
          </div>
          {formData.type === 'status_update' && (
            <div>
              <label className="block text-sm font-medium mb-1">Update Message</label>
              <textarea
                value={formData.context}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                className="input"
                rows={3}
                placeholder="E.g., The crew is on their way!" data-full-ai-field={fullAIExamples.bind({ current: formData.context, change: (e) => setFormData({ ...formData, context: e.target.value }), label: "formData.context", manual: false, json: false, sample: '' }, "p1-23335", undefined)}
              />
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Generating...' : 'Generate Message'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Generated Message</h2>
          <FormattedAIReport response={result} />
          <div className="mb-4">
            <span className="badge badge-blue">{result.suggestedChannel}</span>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
            {result.generatedMessage}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(result.generatedMessage)}
            className="mt-4 btn-secondary w-full"
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}
