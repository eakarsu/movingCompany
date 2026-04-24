import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';
import { showToast } from '../components/Toast';
import { validateForm, validators } from '../utils/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm({ email }, {
      email: [validators.required, validators.email],
    });
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await forgotPassword({ email });
      setSent(true);
      showToast.success('If that email is registered, a reset link has been sent.');
    } catch (err) {
      showToast.error('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Reset Password</h2>
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">
              Check your email for a password reset link.
            </p>
            <Link to="/login" className="text-blue-600 hover:text-blue-700">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Enter your email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
