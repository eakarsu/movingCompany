import FormattedAIReport from "../components/FormattedAIReport";
import PromptExamples from "../components/PromptExamples";
// // === Batch 10 Gaps & Frontend Mounts ===
// Batch 10 frontend page: "Vision-based damage assessment (claim photos → severity score → reserve)" (cfs) — movingCompany
import React, { useEffect, useState } from 'react';

const SLUG = "vision-based-damage-assessment-claim-photos";
const LABEL = "Vision-based damage assessment (claim photos → severity score → reserve)";
const SECTION = "cfs";
const API_PATH = "/api/cf-vision-based-damage-assessment-claim-photos";

export default function CfVisionBasedDamageAssessmentClaimPhotos() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadHistory() {
    try {
      const resp = await fetch(API_PATH + '/history');
      if (!resp.ok) return;
      const json = await resp.json();
      setHistory(json.items || []);
    } catch (_e) { /* ignore */ }
  }

  useEffect(() => { loadHistory(); }, []);

  async function run(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const resp = await fetch(API_PATH + '/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!resp.ok) {
        setError('Request failed: ' + resp.status);
      } else {
        const json = await resp.json();
        setResult(json);
        loadHistory();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 880, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{LABEL}</h1>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{SECTION} · slug: {SLUG}</div>
      <form onSubmit={run} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PromptExamples label={LABEL} setPrompt={setPrompt} disabled={loading} />
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={'Describe what you want: ' + LABEL}
          rows={5}
          style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', alignSelf: 'flex-start' }}
        >
          {loading ? 'Running…' : 'Run'}
        </button>
      </form>
      {error && <div style={{ marginTop: 12, color: '#b91c1c' }}>{error}</div>}
      {result !== null && <FormattedAIReport response={result.result ?? result} title={LABEL} />}
      <h2 style={{ marginTop: 28, fontSize: 16, fontWeight: 600 }}>Recent runs</h2>
      <ul style={{ marginTop: 10, paddingLeft: 18 }}>
        {history.length === 0 && <li style={{ color: '#94a3b8' }}>No history yet</li>}
        {history.map(item => (
          <li key={item.id} style={{ marginBottom: 8 }}>
            <details><summary><span style={{ color: '#475569' }}>{String(item.createdAt)}</span> · Saved report</summary><FormattedAIReport response={item.result} title={LABEL} /></details>
          </li>
        ))}
      </ul>
    </div>
  );
}
