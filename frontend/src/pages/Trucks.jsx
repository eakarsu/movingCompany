import { useState, useEffect } from 'react';
import { getTrucks, createTruck, updateTruck, getEnums } from '../api';

export default function Trucks() {
  const [trucks, setTrucks] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [trucksRes, enumsRes] = await Promise.all([
        getTrucks(),
        getEnums(),
      ]);
      setTrucks(trucksRes.data);
      setEnums(enumsRes.data);
    } catch (error) {
      console.error('Error loading trucks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingTruck) {
        await updateTruck(editingTruck.id, data);
      } else {
        await createTruck(data);
      }
      setShowModal(false);
      setEditingTruck(null);
      loadData();
    } catch (error) {
      console.error('Error saving truck:', error);
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
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Add Truck
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trucks.map((truck) => (
          <div key={truck.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{truck.name}</h3>
                <p className="text-gray-500">{truck.licensePlate}</p>
              </div>
              <span className={`badge ${truck.isActive ? 'badge-green' : 'badge-red'}`}>
                {truck.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Type:</span> {truck.type?.replace(/_/g, ' ')}</p>
              <p><span className="font-medium">Capacity:</span> {truck.capacity} cu ft</p>
              <p><span className="font-medium">Max Weight:</span> {truck.maxWeight?.toLocaleString()} lbs</p>
              {truck.currentMileage && (
                <p><span className="font-medium">Mileage:</span> {truck.currentMileage?.toLocaleString()} mi</p>
              )}
            </div>
            {truck.make && (
              <p className="mt-2 text-sm text-gray-500">
                {truck.year} {truck.make} {truck.model}
              </p>
            )}
            <button
              onClick={() => {
                setEditingTruck(truck);
                setShowModal(true);
              }}
              className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {trucks.length === 0 && (
        <p className="text-center py-8 text-gray-500">No trucks found</p>
      )}

      {showModal && (
        <TruckModal
          truck={editingTruck}
          enums={enums}
          onClose={() => {
            setShowModal(false);
            setEditingTruck(null);
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}

function TruckModal({ truck, enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: truck?.name || '',
    licensePlate: truck?.licensePlate || '',
    vin: truck?.vin || '',
    type: truck?.type || 'BOX_TRUCK_26',
    capacity: truck?.capacity || 1700,
    maxWeight: truck?.maxWeight || 10000,
    year: truck?.year || new Date().getFullYear(),
    make: truck?.make || '',
    model: truck?.model || '',
    currentMileage: truck?.currentMileage || 0,
    isActive: truck?.isActive ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">{truck ? 'Edit' : 'Add'} Truck</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">License Plate</label>
              <input
                type="text"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="select"
            >
              {enums?.truckTypes?.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
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
              <label className="block text-sm font-medium mb-1">Max Weight (lbs)</label>
              <input
                type="number"
                value={formData.maxWeight}
                onChange={(e) => setFormData({ ...formData, maxWeight: parseFloat(e.target.value) })}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            <label className="text-sm font-medium">Active</label>
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
