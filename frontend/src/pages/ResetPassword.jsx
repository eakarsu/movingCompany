import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api';
import { showToast } from '../components/Toast';
import { validateForm, validators } from '../utils/validation';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm(formData, {
      newPassword: [validators.required, validators.password],
      confirmPassword: [validators.required],
    });
    if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }
    if (!isValid || validationErrors.confirmPassword) {
      setErrors(validationErrors);
      return;
    }
    if (!token) {
      showToast.error('Invalid reset link');
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await resetPassword({ token, newPassword: formData.newPassword });
      showToast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      showToast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Link</h2>
          <p className="text-gray-600 mb-4">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Set New Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className={`input ${errors.newPassword ? 'border-red-500' : ''}`}
              placeholder="Enter new password"
            />
            {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`input ${errors.confirmPassword ? 'border-red-500' : ''}`}
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          <div className="text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
