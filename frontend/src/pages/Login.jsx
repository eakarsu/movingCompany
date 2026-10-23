import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/legal-documents" replace />;

  const submitLogin = async (loginEmail, loginPassword) => {
    setError('');
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate('/legal-documents', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitLogin(email, password);
  };

  const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;

  const handleDemoFill = async () => {
    if (demoEmail && demoPassword) { setEmail(demoEmail); setPassword(demoPassword); return; }
    try {
      const res = await fetch('/api/auth/demo-credentials', { cache: 'no-store' });
      if (res.ok) { const data = await res.json(); if (data.email && data.password) { setEmail(data.email); setPassword(data.password); return; } }
    } catch { /* fallback below */ }
    setError('Demo credentials are not configured for this environment.');
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-8">
            <p className="text-xs font-semibold tracking-[0.25em] text-blue-600 uppercase">Moving Company</p>
            <h1 className="text-3xl font-bold text-slate-950 mt-2">Claim document control</h1>
            <p className="text-gray-600 mt-2">Authorized operators only</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="username"
                placeholder="you@company.example"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
                type="button"
                onClick={handleDemoFill}
                aria-label="Fill demo credentials"
                style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
              >
                Fill demo credentials
              </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-gray-500">Accounts are provisioned by an administrator. Session changes revoke prior tokens.</p>
        </div>
      </div>
    </div>
  );
}
