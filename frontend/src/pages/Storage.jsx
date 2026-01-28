import { useState, useEffect } from 'react';
import { getStorageUnits, createStorageUnit, updateStorageUnit, getStorageReservations, createStorageReservation, endStorageReservation, getStorageStats, getEnums } from '../api';
import { format } from 'date-fns';

export default function Storage() {
  const [units, setUnits] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [activeTab, setActiveTab] = useState('units');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [unitsRes, reservationsRes, statsRes, enumsRes] = await Promise.all([
        getStorageUnits(),
        getStorageReservations(),
        getStorageStats(),
        getEnums(),
      ]);
      setUnits(unitsRes.data);
      setReservations(reservationsRes.data);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
    } catch (error) {
      console.error('Error loading storage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUnit = async (data) => {
    try {
      if (selectedUnit) {
        await updateStorageUnit(selectedUnit.id, data);
      } else {
        await createStorageUnit(data);
      }
      setShowUnitModal(false);
      setSelectedUnit(null);
      loadData();
    } catch (error) {
      console.error('Error saving unit:', error);
    }
  };

  const handleCreateReservation = async (data) => {
    try {
      await createStorageReservation(data);
      setShowReservationModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  const handleEndReservation = async (id) => {
    if (!confirm('End this reservation?')) return;
    try {
      await endStorageReservation(id);
      loadData();
    } catch (error) {
      console.error('Error ending reservation:', error);
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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Units</p>
          <p className="text-2xl font-bold">{stats?.totalUnits || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Occupied</p>
          <p className="text-2xl font-bold text-yellow-600">{stats?.occupiedUnits || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Available</p>
          <p className="text-2xl font-bold text-green-600">{stats?.availableUnits || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Occupancy</p>
          <p className="text-2xl font-bold">{stats?.occupancyRate || 0}%</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Monthly Revenue</p>
          <p className="text-2xl font-bold text-green-600">${stats?.monthlyRevenue?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2 ${activeTab === 'units' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Units
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2 ${activeTab === 'reservations' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Reservations
        </button>
      </div>

      {activeTab === 'units' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowUnitModal(true)} className="btn-primary">
              + Add Unit
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`card cursor-pointer ${unit.isOccupied ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}
                onClick={() => {
                  if (!unit.isOccupied) {
                    setSelectedUnit(unit);
                    setShowReservationModal(true);
                  }
                }}
              >
                <h3 className="font-bold text-lg">{unit.unitNumber}</h3>
                <p className="text-sm text-gray-600">{unit.size}</p>
                <p className="text-sm font-medium">${unit.monthlyRate}/mo</p>
                <span className={`badge mt-2 ${unit.isOccupied ? 'badge-yellow' : 'badge-green'}`}>
                  {unit.isOccupied ? 'Occupied' : 'Available'}
                </span>
                {unit.climate && <span className="badge badge-blue mt-1">Climate</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'reservations' && (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 table-header">Unit</th>
                <th className="px-6 py-3 table-header">Customer</th>
                <th className="px-6 py-3 table-header">Start Date</th>
                <th className="px-6 py-3 table-header">Monthly Rate</th>
                <th className="px-6 py-3 table-header">Status</th>
                <th className="px-6 py-3 table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{res.unit?.unitNumber}</td>
                  <td className="px-6 py-4">
                    <p>{res.customerName}</p>
                    <p className="text-sm text-gray-500">{res.customerPhone}</p>
                  </td>
                  <td className="px-6 py-4">{format(new Date(res.startDate), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-4">${res.monthlyRate}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${res.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {res.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleEndReservation(res.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUnitModal && (
        <UnitModal
          unit={selectedUnit}
          enums={enums}
          onClose={() => {
            setShowUnitModal(false);
            setSelectedUnit(null);
          }}
          onSubmit={handleSaveUnit}
        />
      )}

      {showReservationModal && (
        <ReservationModal
          unit={selectedUnit}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedUnit(null);
          }}
          onSubmit={handleCreateReservation}
        />
      )}
    </div>
  );
}

function UnitModal({ unit, enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    unitNumber: unit?.unitNumber || '',
    size: unit?.size || (enums?.storageSizes?.[2] || '10x10'),
    capacity: unit?.capacity || 800,
    monthlyRate: unit?.monthlyRate || 175,
    climate: unit?.climate || false,
    floor: unit?.floor || 1,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">{unit ? 'Edit' : 'Add'} Storage Unit</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unit Number</label>
              <input
                type="text"
                value={formData.unitNumber}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="select"
              >
                {enums?.storageSizes?.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Capacity (cu ft)</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Rate</label>
              <input
                type="number"
                value={formData.monthlyRate}
                onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) })}
                className="input"
              />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.climate}
              onChange={(e) => setFormData({ ...formData, climate: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm font-medium">Climate Controlled</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReservationModal({ unit, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    unitId: unit?.id || '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    startDate: new Date().toISOString().split('T')[0],
    monthlyRate: unit?.monthlyRate || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">New Reservation - {unit?.unitNumber}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Rate</label>
            <input
              type="number"
              value={formData.monthlyRate}
              onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) })}
              className="input"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Reservation</button>
          </div>
        </form>
      </div>
    </div>
  );
}
