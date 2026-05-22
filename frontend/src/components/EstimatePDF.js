import { useEffect, useState } from 'react';

export default function EstimatePDF() {
  const [clients, setClients] = useState([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/estimate-pdf/clients', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setClients(d.clients || []);
        if (d.clients && d.clients.length) setSelected(d.clients[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const generate = async () => {
    if (!selected) return;
    setBusy(true);
    setMsg('');
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/custom-views/estimate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId: selected }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const c = clients.find((x) => x.id === selected);
      a.download = `estimate-${c ? c.moveId : 'move'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg(`Estimate PDF generated for ${c?.name || selected}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Moving Estimate PDF</h2>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-700 rounded">
          {msg}
        </div>
      )}

      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select client / move
      </label>
      <select
        className="w-full border rounded px-3 py-2 mb-3 text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.moveId} ({c.moveDate})
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={generate}
        disabled={busy || !selected}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? 'Generating…' : 'Generate & download PDF'}
      </button>

      <p className="text-xs text-gray-500 mt-3">
        PDF includes rooms, weight estimate, services, and itemized total cost.
      </p>
    </div>
  );
}
