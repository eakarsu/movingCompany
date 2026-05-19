import { useState } from 'react';
import { preMoveAnalyze, damageAssess, marketRatePricing, predictiveCrewScheduling, multiVendorLogistics } from '../api';

export default function AIAdvanced() {
  const [activeTab, setActiveTab] = useState('preMove');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <TabButton active={activeTab === 'preMove'} onClick={() => setActiveTab('preMove')}>
          Pre-Move Analysis
        </TabButton>
        <TabButton active={activeTab === 'damage'} onClick={() => setActiveTab('damage')}>
          Damage Assessment
        </TabButton>
        <TabButton active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')}>
          Market Rate Pricing
        </TabButton>
        <TabButton active={activeTab === 'crew'} onClick={() => setActiveTab('crew')}>
          Predictive Crew Scheduling
        </TabButton>
        <TabButton active={activeTab === 'vendors'} onClick={() => setActiveTab('vendors')}>
          Multi-Vendor Logistics
        </TabButton>
      </div>

      {activeTab === 'preMove' && <PreMoveAnalyzer />}
      {activeTab === 'damage' && <DamageAssessor />}
      {activeTab === 'pricing' && <MarketRatePricing />}
      {activeTab === 'crew' && <PredictiveCrewScheduling />}
      {activeTab === 'vendors' && <MultiVendorLogistics />}
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

function ResultBlock({ result }) {
  if (!result) return null;
  return (
    <pre className="text-sm whitespace-pre-wrap p-4 bg-gray-50 rounded-lg overflow-x-auto">
      {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
    </pre>
  );
}

function PreMoveAnalyzer() {
  const [questionnaire, setQuestionnaire] = useState(JSON.stringify({
    propertyType: 'house',
    bedrooms: 3,
    hasStairs: true,
    hasElevator: false,
    fragileItems: ['piano', 'artwork'],
    accessNotes: 'tight street, no truck parking',
    moveDate: '',
  }, null, 2));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(questionnaire);
      } catch (e) {
        setError('Questionnaire must be valid JSON');
        setLoading(false);
        return;
      }
      const res = await preMoveAnalyze({ questionnaire: parsed });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Pre-Move Questionnaire</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Questionnaire (JSON)</label>
            <textarea
              value={questionnaire}
              onChange={(e) => setQuestionnaire(e.target.value)}
              className="input font-mono text-sm"
              rows={14}
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Analyzing...' : 'Analyze Pre-Move'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Analysis</h2>
          {result.summary && <p className="mb-3">{result.summary}</p>}
          {result.estimatedComplexity && (
            <div className="mb-3">
              <span className="badge badge-blue">Complexity: {result.estimatedComplexity}</span>
            </div>
          )}
          {Array.isArray(result.concerns) && result.concerns.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Concerns</h3>
              <ul className="list-disc list-inside text-sm">{result.concerns.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {Array.isArray(result.specialHandling) && result.specialHandling.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Special Handling</h3>
              <ul className="list-disc list-inside text-sm">{result.specialHandling.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {Array.isArray(result.recommendedAddOns) && result.recommendedAddOns.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Recommended Add-Ons</h3>
              <ul className="list-disc list-inside text-sm">
                {result.recommendedAddOns.map((a, i) => <li key={i}><strong>{a.name}:</strong> {a.reason}</li>)}
              </ul>
            </div>
          )}
          {result.rawAnalysis && <ResultBlock result={result.rawAnalysis} />}
        </div>
      )}
    </div>
  );
}

function DamageAssessor() {
  const [form, setForm] = useState({ description: '', itemType: '', photoDescription: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await damageAssess(form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Damage Assessment</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Item Type</label>
            <input
              type="text"
              value={form.itemType}
              onChange={(e) => setForm({ ...form, itemType: e.target.value })}
              className="input"
              placeholder="e.g., wooden dresser, flat-screen TV"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              rows={4}
              placeholder="Describe the damage as the customer reported it..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Photo Description (optional)</label>
            <textarea
              value={form.photoDescription}
              onChange={(e) => setForm({ ...form, photoDescription: e.target.value })}
              className="input"
              rows={3}
              placeholder="What is visible in the photos? (until vision-model integration)"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Assessing...' : 'Assess Damage'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Assessment</h2>
          {result.damageType && <p className="mb-2"><strong>Type:</strong> {result.damageType}</p>}
          {result.severity && (
            <div className="mb-3">
              <span className={`badge ${result.severity === 'minor' ? 'badge-green' : result.severity === 'major' || result.severity === 'total' ? 'badge-red' : 'badge-yellow'}`}>
                Severity: {result.severity}
              </span>
            </div>
          )}
          {result.estimatedCost && (
            <p className="mb-2"><strong>Estimated Cost:</strong> ${result.estimatedCost.low ?? '?'} – ${result.estimatedCost.high ?? '?'} {result.estimatedCost.currency || ''}</p>
          )}
          {result.recommendedClaimStatus && (
            <p className="mb-2"><strong>Recommended Claim Status:</strong> {result.recommendedClaimStatus}</p>
          )}
          {Array.isArray(result.repairOptions) && result.repairOptions.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Repair Options</h3>
              <ul className="list-disc list-inside text-sm">{result.repairOptions.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {Array.isArray(result.evidenceGaps) && result.evidenceGaps.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Evidence Gaps</h3>
              <ul className="list-disc list-inside text-sm">{result.evidenceGaps.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {result.rawAnalysis && <ResultBlock result={result.rawAnalysis} />}
        </div>
      )}
    </div>
  );
}

function PredictiveCrewScheduling() {
  const [upcomingJobs, setUpcomingJobs] = useState(JSON.stringify([
    { date: '2026-05-12', volumeCft: 800, requiredCrew: 3 },
    { date: '2026-05-13', volumeCft: 1400, requiredCrew: 4 },
  ], null, 2));
  const [crewRoster, setCrewRoster] = useState(JSON.stringify([
    { id: 'c1', role: 'CREW_LEAD', maxHoursPerWeek: 40 },
    { id: 'c2', role: 'DRIVER', maxHoursPerWeek: 40 },
    { id: 'c3', role: 'MOVER', maxHoursPerWeek: 32 },
  ], null, 2));
  const [horizonDays, setHorizonDays] = useState(14);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      let jobs, roster;
      try { jobs = JSON.parse(upcomingJobs); } catch { setError('upcomingJobs must be valid JSON array'); setLoading(false); return; }
      try { roster = JSON.parse(crewRoster); } catch { setError('crewRoster must be valid JSON array'); setLoading(false); return; }
      const res = await predictiveCrewScheduling({ upcomingJobs: jobs, crewRoster: roster, horizonDays: Number(horizonDays) || 14 });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Predictive Crew Scheduling</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Upcoming Jobs (JSON)</label>
            <textarea value={upcomingJobs} onChange={(e) => setUpcomingJobs(e.target.value)} className="input font-mono text-sm" rows={8} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Crew Roster (JSON)</label>
            <textarea value={crewRoster} onChange={(e) => setCrewRoster(e.target.value)} className="input font-mono text-sm" rows={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Horizon (days)</label>
            <input type="number" value={horizonDays} onChange={(e) => setHorizonDays(e.target.value)} className="input" />
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Forecasting...' : 'Generate Forecast'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Forecast</h2>
          {result.summary && <p className="mb-3">{result.summary}</p>}
          {result.hiringSignal && (
            <p className="mb-3"><strong>Hiring Recommended:</strong> {result.hiringSignal.recommended ? 'Yes' : 'No'} – {result.hiringSignal.rationale}</p>
          )}
          {Array.isArray(result.coverageGaps) && result.coverageGaps.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Coverage Gaps</h3>
              <ul className="list-disc list-inside text-sm">{result.coverageGaps.map((g, i) => <li key={i}>{g.date}: short by {g.shortBy} – {g.mitigation}</li>)}</ul>
            </div>
          )}
          <ResultBlock result={result.dailyForecast || result.rawAnalysis || result} />
        </div>
      )}
    </div>
  );
}

function MultiVendorLogistics() {
  const [jobBrief, setJobBrief] = useState(JSON.stringify({
    origin: 'Boston, MA',
    destination: 'Austin, TX',
    volumeCft: 1800,
    specialItems: ['piano', 'art crate'],
    deliveryWindow: '5-day',
  }, null, 2));
  const [vendors, setVendors] = useState(JSON.stringify([
    { id: 'v1', name: 'LongHaul Co', capabilities: ['long-haul'], leadTimeHours: 48 },
    { id: 'v2', name: 'PianoSpec', capabilities: ['piano-handling'], leadTimeHours: 24 },
  ], null, 2));
  const [slaHours, setSlaHours] = useState(120);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      let brief, v;
      try { brief = JSON.parse(jobBrief); } catch { setError('jobBrief must be valid JSON'); setLoading(false); return; }
      try { v = JSON.parse(vendors); } catch { setError('vendors must be valid JSON array'); setLoading(false); return; }
      const res = await multiVendorLogistics({ jobBrief: brief, vendors: v, slaHours: Number(slaHours) || undefined });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Multi-Vendor Logistics</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Job Brief (JSON)</label>
            <textarea value={jobBrief} onChange={(e) => setJobBrief(e.target.value)} className="input font-mono text-sm" rows={7} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Available Vendors (JSON)</label>
            <textarea value={vendors} onChange={(e) => setVendors(e.target.value)} className="input font-mono text-sm" rows={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SLA Hours</label>
            <input type="number" value={slaHours} onChange={(e) => setSlaHours(e.target.value)} className="input" />
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Coordinating...' : 'Plan Vendor Mix'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Vendor Mix Plan</h2>
          {result.summary && <p className="mb-3">{result.summary}</p>}
          {result.slaForecast && (
            <p className="mb-3"><strong>Meets SLA:</strong> {result.slaForecast.meetsSla ? 'Yes' : 'No'} – {result.slaForecast.expectedHours}h. {result.slaForecast.notes}</p>
          )}
          {Array.isArray(result.recommendedVendorMix) && result.recommendedVendorMix.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Recommended Vendor Mix</h3>
              <ul className="list-disc list-inside text-sm">{result.recommendedVendorMix.map((m, i) => <li key={i}><strong>{m.vendorId}</strong> ({m.role}): {m.scopeOfWork} — {m.rationale}</li>)}</ul>
            </div>
          )}
          {Array.isArray(result.riskMatrix) && result.riskMatrix.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Risks</h3>
              <ul className="list-disc list-inside text-sm">{result.riskMatrix.map((r, i) => <li key={i}>{r.risk} (L:{r.likelihood}/I:{r.impact}) — {r.mitigation}</li>)}</ul>
            </div>
          )}
          <ResultBlock result={result.handoffPlan || result.rawAnalysis || result} />
        </div>
      )}
    </div>
  );
}

function MarketRatePricing() {
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    distanceMiles: '',
    volumeCft: '',
    weightLbs: '',
    season: 'summer',
    services: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        origin: form.origin,
        destination: form.destination,
        distanceMiles: form.distanceMiles ? Number(form.distanceMiles) : undefined,
        volumeCft: form.volumeCft ? Number(form.volumeCft) : undefined,
        weightLbs: form.weightLbs ? Number(form.weightLbs) : undefined,
        season: form.season,
        services: form.services
          ? form.services.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const res = await marketRatePricing(payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Market Rate Pricing</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Origin *</label>
              <input
                type="text"
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Destination *</label>
              <input
                type="text"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Distance (mi)</label>
              <input
                type="number"
                value={form.distanceMiles}
                onChange={(e) => setForm({ ...form, distanceMiles: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Volume (cu ft)</label>
              <input
                type="number"
                value={form.volumeCft}
                onChange={(e) => setForm({ ...form, volumeCft: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight (lbs)</label>
              <input
                type="number"
                value={form.weightLbs}
                onChange={(e) => setForm({ ...form, weightLbs: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Season</label>
            <select
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              className="select"
            >
              <option value="winter">Winter</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Services (comma separated)</label>
            <input
              type="text"
              value={form.services}
              onChange={(e) => setForm({ ...form, services: e.target.value })}
              className="input"
              placeholder="e.g., packing, storage, hoisting"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Calculating...' : 'Suggest Pricing'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pricing Suggestion</h2>
          {result.suggestedPriceBand && (
            <div className="text-center py-6 bg-blue-50 rounded-lg mb-4">
              <p className="text-sm text-gray-500">Suggested Price Band</p>
              <p className="text-3xl font-bold text-blue-600">
                ${result.suggestedPriceBand.low} – ${result.suggestedPriceBand.high}
              </p>
              <p className="text-xs text-gray-500">{result.suggestedPriceBand.currency || 'USD'}</p>
            </div>
          )}
          {result.competitiveNotes && <p className="text-sm mb-3">{result.competitiveNotes}</p>}
          {Array.isArray(result.pricingDrivers) && result.pricingDrivers.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Pricing Drivers</h3>
              <ul className="list-disc list-inside text-sm">{result.pricingDrivers.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {Array.isArray(result.discountTriggers) && result.discountTriggers.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Discount Triggers</h3>
              <ul className="list-disc list-inside text-sm">{result.discountTriggers.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {Array.isArray(result.upchargeTriggers) && result.upchargeTriggers.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium mb-1">Upcharge Triggers</h3>
              <ul className="list-disc list-inside text-sm">{result.upchargeTriggers.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {result.rawAnalysis && <ResultBlock result={result.rawAnalysis} />}
        </div>
      )}
    </div>
  );
}
