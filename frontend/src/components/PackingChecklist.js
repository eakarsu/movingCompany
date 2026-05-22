import { useEffect, useState } from 'react';

export default function PackingChecklist() {
  const [step, setStep] = useState(1);
  const [presets, setPresets] = useState(null);
  const [houseSize, setHouseSize] = useState('TWO_BR');
  const [rooms, setRooms] = useState([]);
  const [itemsByRoom, setItemsByRoom] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/packing-checklist/presets', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setPresets(d))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!presets) return;
    const p = presets.houseSizes.find((x) => x.key === houseSize);
    if (p) setRooms(p.rooms);
  }, [houseSize, presets]);

  const toggleRoom = (room) => {
    setRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const addItem = (room, item) => {
    if (!item.trim()) return;
    setItemsByRoom((prev) => ({
      ...prev,
      [room]: [...(prev[room] || []), item.trim()],
    }));
  };

  const removeItem = (room, idx) => {
    setItemsByRoom((prev) => ({
      ...prev,
      [room]: (prev[room] || []).filter((_, i) => i !== idx),
    }));
  };

  const buildChecklist = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch('/api/custom-views/packing-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ houseSize, rooms, itemsByRoom }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setResult(data);
      setStep(5);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setResult(null);
    setItemsByRoom({});
  };

  if (!presets && !error) {
    return <div className="p-4 text-gray-500">Loading packing wizard…</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Packing Checklist Wizard</h2>
        <div className="text-xs text-gray-500">Step {step} of 5</div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Step 1: house size */}
      {step === 1 && presets && (
        <div>
          <p className="text-sm text-gray-600 mb-2">1. Pick your house size:</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {presets.houseSizes.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setHouseSize(p.key)}
                className={`px-3 py-2 rounded border text-sm ${
                  houseSize === p.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next: rooms
            </button>
          </div>
        </div>
      )}

      {/* Step 2: rooms */}
      {step === 2 && presets && (
        <div>
          <p className="text-sm text-gray-600 mb-2">2. Confirm or adjust the rooms to pack:</p>
          <div className="flex flex-wrap gap-2">
            {presets.houseSizes
              .find((x) => x.key === houseSize)
              .rooms.concat(
                Object.keys(presets.defaultItemsByRoom).filter(
                  (r) => !presets.houseSizes.find((x) => x.key === houseSize).rooms.includes(r)
                )
              )
              .map((r) => (
                <label
                  key={r}
                  className={`px-3 py-1 rounded border text-sm cursor-pointer ${
                    rooms.includes(r)
                      ? 'bg-blue-50 border-blue-400 text-blue-800'
                      : 'bg-white text-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={rooms.includes(r)}
                    onChange={() => toggleRoom(r)}
                    className="mr-1"
                  />
                  {r}
                </label>
              ))}
          </div>
          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2 border rounded">
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={!rooms.length}
            >
              Next: items
            </button>
          </div>
        </div>
      )}

      {/* Step 3: items per room */}
      {step === 3 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">3. Add any custom items per room (optional):</p>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {rooms.map((r) => (
              <RoomItemEditor
                key={r}
                room={r}
                items={itemsByRoom[r] || []}
                onAdd={(v) => addItem(r, v)}
                onRemove={(i) => removeItem(r, i)}
              />
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2 border rounded">
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next: review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: review & generate */}
      {step === 4 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">4. Review and generate your checklist:</p>
          <div className="bg-gray-50 rounded p-3 text-sm">
            <p><strong>House size:</strong> {houseSize.replace(/_/g, ' ')}</p>
            <p><strong>Rooms:</strong> {rooms.join(', ')}</p>
            <p>
              <strong>Custom items:</strong>{' '}
              {Object.values(itemsByRoom).reduce((s, a) => s + (a?.length || 0), 0)} added
            </p>
          </div>
          <div className="mt-4 flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="px-4 py-2 border rounded">
              Back
            </button>
            <button
              type="button"
              onClick={buildChecklist}
              disabled={busy}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {busy ? 'Building…' : 'Generate checklist'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: printable checklist */}
      {step === 5 && result && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">5. Printable checklist & supply totals:</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Print
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-3 py-1 border rounded text-sm"
              >
                Start over
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            <Stat label="Boxes" value={result.summary.totalBoxes} />
            <Stat label="Tape rolls" value={result.summary.totalTapeRolls} />
            <Stat label="Bubble rolls" value={result.summary.bubbleWrapRolls} />
            <Stat label="Paper (lbs)" value={result.summary.packingPaperLbs} />
            <Stat label="Markers" value={result.summary.markers} />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.checklist.map((c) => (
              <div key={c.room} className="border rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-800">{c.room}</p>
                  <span className="text-xs text-gray-500">
                    {c.boxesNeeded} boxes • {c.packingPaperLbs} lbs paper
                  </span>
                </div>
                <ul className="text-sm text-gray-700 list-disc list-inside">
                  {c.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomItemEditor({ room, items, onAdd, onRemove }) {
  const [val, setVal] = useState('');
  return (
    <div className="border rounded p-2">
      <p className="font-semibold text-sm text-gray-800 mb-1">{room}</p>
      <div className="flex gap-2 mb-1">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Add item (e.g., Vintage lamp)"
          className="flex-1 border rounded px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            onAdd(val);
            setVal('');
          }}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="text-xs text-gray-600">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between">
              <span>• {it}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-red-600 hover:underline ml-2"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border rounded p-2 text-center bg-gray-50">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
  );
}
