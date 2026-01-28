import { useState, useEffect } from 'react';
import { getSettings, updateSettings, getRates, updateRates, getUsers, updateUser } from '../api';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [rates, setRates] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('company');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, ratesRes, usersRes] = await Promise.all([
        getSettings(),
        getRates(),
        getUsers(),
      ]);
      setSettings(settingsRes.data);
      setRates(ratesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      alert('Settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRates = async () => {
    setSaving(true);
    try {
      await updateRates(rates);
      alert('Rates saved!');
    } catch (error) {
      console.error('Error saving rates:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserActive = async (user) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      loadData();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 ${activeTab === 'company' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Company
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 ${activeTab === 'rates' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Rates
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Users
        </button>
      </div>

      {activeTab === 'company' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold mb-6">Company Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={settings?.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                value={settings?.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  value={settings?.city || ''}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={settings?.state || ''}
                  onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP</label>
                <input
                  type="text"
                  value={settings?.zip || ''}
                  onChange={(e) => setSettings({ ...settings, zip: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={settings?.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={settings?.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                value={settings?.website || ''}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="input"
              />
            </div>
            <button onClick={handleSaveSettings} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="card max-w-md">
          <h2 className="text-lg font-semibold mb-6">Pricing Rates</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Labor Rate ($/hr per person)</label>
              <input
                type="number"
                value={rates?.laborRate || 0}
                onChange={(e) => setRates({ ...rates, laborRate: parseFloat(e.target.value) })}
                className="input"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Travel Rate ($/hr per person)</label>
              <input
                type="number"
                value={rates?.travelRate || 0}
                onChange={(e) => setRates({ ...rates, travelRate: parseFloat(e.target.value) })}
                className="input"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Packing Rate ($/hr per person)</label>
              <input
                type="number"
                value={rates?.packingRate || 0}
                onChange={(e) => setRates({ ...rates, packingRate: parseFloat(e.target.value) })}
                className="input"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Hours</label>
              <input
                type="number"
                value={rates?.minHours || 0}
                onChange={(e) => setRates({ ...rates, minHours: parseFloat(e.target.value) })}
                className="input"
                step="0.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={rates?.taxRate || 0}
                onChange={(e) => setRates({ ...rates, taxRate: parseFloat(e.target.value) })}
                className="input"
                step="0.01"
              />
            </div>
            <button onClick={handleSaveRates} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Rates'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-6">User Management</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 table-header">Name</th>
                <th className="px-6 py-3 table-header">Email</th>
                <th className="px-6 py-3 table-header">Role</th>
                <th className="px-6 py-3 table-header">Status</th>
                <th className="px-6 py-3 table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{user.firstName} {user.lastName}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="badge badge-gray">{user.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${user.isActive ? 'badge-green' : 'badge-red'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleUserActive(user)}
                      className={user.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
