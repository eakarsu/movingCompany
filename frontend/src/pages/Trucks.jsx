import { useState, useEffect, useCallback } from 'react';
import { getTrucks, createTruck, updateTruck, deleteTruck, getEnums, bulkDeleteTrucks, bulkUpdateTrucks } from '../api';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import BulkActions, { SelectCheckbox } from '../components/BulkActions';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';
import { validateForm, validators } from '../utils/validation';

const exportColumns = [
  { key: 'name', label: 'Name' },
  { label: 'Type', accessor: (row) => row.type?.replace(/_/g, ' ') || '' },
  { key: 'licensePlate', label: 'License Plate' },
  { label: 'Capacity', accessor: (row) => `${row.capacity} cu ft` },
  { label: 'Mileage', accessor: (row) => row.currentMileage ? row.currentMileage.toLocaleString() : '' },
  { label: 'Status', accessor: (row) => row.isActive ? 'Active' : 'Inactive' },
];

const bulkUpdateOptions = [
  { label: 'Set Status: Available', value: 'status:AVAILABLE' },
  { label: 'Set Status: In Use', value: 'status:IN_USE' },
  { label: 'Set Status: Maintenance', value: 'status:MAINTENANCE' },
  { label: 'Set Active: Yes', value: 'isActive:true' },
  { label: 'Set Active: No', value: 'isActive:false' },
];

export default function Trucks() {
  const [trucks, setTrucks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [trucksRes, enumsRes] = await Promise.all([
        getTrucks({ page, sortBy, sortOrder }),
        getEnums(),
      ]);
      const data = trucksRes.data;
      setTrucks(data.data || data);
      setPagination(data.pagination || null);
      setEnums(enumsRes.data);
      setSelectedIds([]);
    } catch (error) {
      showToast.error('Failed to load trucks');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (data) => {
    try {
      if (editingTruck) {
        await updateTruck(editingTruck.id, data);
        showToast.success('Truck updated successfully');
      } else {
        await createTruck(data);
        showToast.success('Truck created successfully');
      }
      setShowModal(false);
      setEditingTruck(null);
      loadData();
    } catch (error) {
      showToast.error(editingTruck ? 'Failed to update truck' : 'Failed to create truck');
    }
  };

  const handleDelete = async (truck) => {
    const confirmed = await confirm({
      title: 'Delete Truck',
      message: `Are you sure you want to delete "${truck.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await deleteTruck(truck.id);
        showToast.success('Truck deleted successfully');
        loadData();
      } catch (error) {
        showToast.error('Failed to delete truck');
      }
    }
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Selected Trucks',
      message: `Are you sure you want to delete ${selectedIds.length} truck(s)? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await bulkDeleteTrucks(selectedIds);
        showToast.success(`${selectedIds.length} truck(s) deleted`);
        loadData();
      } catch (error) {
        showToast.error('Failed to delete trucks');
      }
    }
  };

  const handleBulkUpdate = async (data) => {
    try {
      // Convert string booleans to actual booleans for isActive
      const processedData = { ...data };
      if (processedData.isActive !== undefined) {
        processedData.isActive = processedData.isActive === 'true';
      }
      await bulkUpdateTrucks(selectedIds, processedData);
      showToast.success(`${selectedIds.length} truck(s) updated`);
      loadData();
    } catch (error) {
      showToast.error('Failed to update trucks');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === trucks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(trucks.map((t) => t.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (loading && !trucks.length) {
    return <TableSkeleton rows={8} cols={7} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-end">
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(trucks, exportColumns, 'trucks')} className="btn-secondary text-sm">
            CSV
          </button>
          <button onClick={() => exportToPDF(trucks, exportColumns, 'trucks', 'Trucks Report')} className="btn-secondary text-sm">
            PDF
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
            + Add Truck
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onUpdate={handleBulkUpdate}
        updateOptions={bulkUpdateOptions}
      />

      {/* Trucks Table */}
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <SelectCheckbox
                  checked={selectedIds.length === trucks.length && trucks.length > 0}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < trucks.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader label="Name" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 hidden sm:table-cell">
                <SortHeader label="Type" field="type" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3">
                <SortHeader label="License Plate" field="licensePlate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 hidden md:table-cell">
                <SortHeader label="Capacity" field="capacity" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 hidden lg:table-cell">
                <SortHeader label="Mileage" field="currentMileage" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 table-header">Status</th>
              <th className="px-4 py-3 table-header">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trucks.map((truck) => (
              <tr key={truck.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <SelectCheckbox
                    checked={selectedIds.includes(truck.id)}
                    onChange={() => toggleSelect(truck.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{truck.name}</p>
                    {truck.make && (
                      <p className="text-xs text-gray-500">{truck.year} {truck.make} {truck.model}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="badge badge-gray text-xs">{truck.type?.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3 text-sm">{truck.licensePlate}</td>
                <td className="px-4 py-3 hidden md:table-cell text-sm">
                  <div>
                    <p>{truck.capacity} cu ft</p>
                    <p className="text-xs text-gray-500">{truck.maxWeight?.toLocaleString()} lbs max</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-500">
                  {truck.currentMileage ? `${truck.currentMileage.toLocaleString()} mi` : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${truck.isActive ? 'badge-green' : 'badge-red'} text-xs`}>
                    {truck.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingTruck(truck);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(truck)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {trucks.length === 0 && !loading && (
          <p className="text-center py-8 text-gray-500">No trucks found</p>
        )}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Truck Modal */}
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
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm(formData, {
      name: [validators.required, validators.minLength(2)],
      licensePlate: [validators.required, validators.minLength(2)],
      capacity: [validators.required, validators.positiveNumber],
      maxWeight: [validators.required, validators.positiveNumber],
    });
    if (!isValid) {
      setErrors(validationErrors);
      showToast.error('Please fix the form errors before submitting');
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">{truck ? 'Edit' : 'Add'} Truck</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">License Plate *</label>
              <input
                type="text"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                className={`input ${errors.licensePlate ? 'border-red-500' : ''}`}
              />
              {errors.licensePlate && <p className="text-red-500 text-xs mt-1">{errors.licensePlate}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">VIN</label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              className="input"
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Capacity (cu ft) *</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) })}
                className={`input ${errors.capacity ? 'border-red-500' : ''}`}
              />
              {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Weight (lbs) *</label>
              <input
                type="number"
                value={formData.maxWeight}
                onChange={(e) => setFormData({ ...formData, maxWeight: parseFloat(e.target.value) })}
                className={`input ${errors.maxWeight ? 'border-red-500' : ''}`}
              />
              {errors.maxWeight && <p className="text-red-500 text-xs mt-1">{errors.maxWeight}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-1">Current Mileage</label>
            <input
              type="number"
              value={formData.currentMileage}
              onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) || 0 })}
              className="input"
            />
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
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
