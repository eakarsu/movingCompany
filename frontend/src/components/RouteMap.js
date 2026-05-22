import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Fix the default Leaflet marker icon paths (Vite breaks them by default).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_COLORS = {
  IN_TRANSIT: '#2563eb',
  LOADING:    '#f59e0b',
  SCHEDULED:  '#64748b',
  COMPLETED:  '#16a34a',
  DELAYED:    '#dc2626',
};

export default function RouteMap() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/route-map', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setMoves(data.moves || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Loading route map…</div>;
  if (error)   return <div className="p-4 text-red-600">Error loading map: {error}</div>;
  if (!moves.length) return <div className="p-4 text-gray-500">No active moves.</div>;

  const center = [42.3601, -71.0589]; // Boston region

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Active Move Routes</h2>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded" style={{ background: c }} />
              <span className="text-gray-600">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 480, width: '100%' }}>
        <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {moves.map((m) => {
            const color = STATUS_COLORS[m.status] || '#475569';
            return (
              <span key={m.id}>
                <Polyline positions={m.polyline} pathOptions={{ color, weight: 4 }}>
                  <Tooltip>{m.id} — {m.customer} ({m.status})</Tooltip>
                </Polyline>
                <Marker position={[m.origin.lat, m.origin.lng]}>
                  <Popup>
                    <strong>{m.id}</strong><br />
                    Pickup: {m.origin.label}<br />
                    Customer: {m.customer}
                  </Popup>
                </Marker>
                <Marker position={[m.destination.lat, m.destination.lng]}>
                  <Popup>
                    <strong>{m.id}</strong><br />
                    Drop-off: {m.destination.label}<br />
                    Truck: {m.truck} — {m.distanceMiles} mi
                  </Popup>
                </Marker>
              </span>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
