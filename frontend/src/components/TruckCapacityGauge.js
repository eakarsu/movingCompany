import { useEffect, useState } from 'react';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';

function statusColor(pct) {
  if (pct >= 95) return '#dc2626';
  if (pct >= 80) return '#f59e0b';
  if (pct < 40)  return '#0ea5e9';
  return '#16a34a';
}

export default function TruckCapacityGauge() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/truck-capacity', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setTrucks(d.trucks || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Loading truck capacity…</div>;
  if (error)   return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Truck Capacity Utilization</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trucks.map((t) => {
          const fill = statusColor(t.utilizationPct);
          const data = [{ name: t.id, value: t.utilizationPct, fill }];
          return (
            <div key={t.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="font-semibold text-gray-800">{t.id}</p>
                  <p className="text-xs text-gray-500">{t.plate} • {t.driver}</p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: fill }}
                >
                  {t.status}
                </span>
              </div>

              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="100%"
                    barSize={18}
                    data={data}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      background={{ fill: '#e5e7eb' }}
                      dataKey="value"
                      cornerRadius={9}
                    />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: '22px', fontWeight: 700, fill: '#0f172a' }}
                    >
                      {t.utilizationPct}%
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-gray-600 text-center">
                {t.usedCuFt} / {t.capacityCuFt} cu ft used
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
