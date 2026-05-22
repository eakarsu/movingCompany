import { useEffect, useState } from 'react';

const empty = { job: '', building: '', window: '', elevator: '', certificate: '', status: 'blocked' };

export default function ElevatorReservationWindow() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, blocked: 0 });
  const [form, setForm] = useState(empty);
  const load = async () => { const r = await fetch('/api/elevator-reservation-window'); const d = await r.json(); setRows(d.rows || []); setSummary(d.summary || { total: 0, blocked: 0 }); };
  useEffect(() => { load(); }, []);
  const submit = async e => { e.preventDefault(); await fetch('/api/elevator-reservation-window', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) }); setForm(empty); load(); };
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Elevator Reservation Window</h1><p className="text-gray-600">Building move windows, freight elevator holds, and COI status.</p>
    <div className="grid grid-cols-2 gap-4">{['total','blocked'].map(k=><div key={k} className="bg-white p-4 rounded shadow"><div className="text-sm text-gray-500">{k}</div><div className="text-2xl font-bold">{summary[k]}</div></div>)}</div>
    <form onSubmit={submit} className="grid gap-3 bg-white rounded shadow p-4 md:grid-cols-3">{['job','building','window','elevator','certificate'].map(f=><input key={f} className="border rounded p-2" placeholder={f} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}/>) }<select className="border rounded p-2" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>blocked</option><option>confirmed</option><option>requested</option></select><button className="bg-blue-600 text-white rounded px-4 py-2">Add Window</button></form>
    <table className="w-full bg-white rounded shadow"><thead><tr>{['Job','Building','Window','Elevator','Certificate','Status'].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t"><td className="p-3">{r.job}</td><td>{r.building}</td><td>{r.window}</td><td>{r.elevator}</td><td>{r.certificate}</td><td>{r.status}</td></tr>)}</tbody></table>
  </div>;
}
