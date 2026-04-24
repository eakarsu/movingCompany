import { useState, useEffect, useCallback } from 'react';
import { getEquipment, createEquipment, updateEquipment, deleteEquipment, bulkDeleteEquipment, bulkUpdateEquipment, getEnums } from '../api';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import BulkActions, { SelectCheckbox } from '../components/BulkActions';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';
import { validateForm, validators } from '../utils/validation';

export default function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [equipmentRes, enumsRes] = await Promise.all([
        getEquipment({ page, sortBy, sortOrder }),
        getEnums(),
      ]);
      const data = equipmentRes.data;
      setEquipment(data.data || data);
      setPagination(data.pagination || null);
      setEnums(enumsRes.data);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error loading equipment:', error);
      showToast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSave = async (data) => {
    try {
      if (editingItem) {
        await updateEquipment(editingItem.id, data);
        showToast.success('Equipment updated successfully');
      } else {
        await createEquipment(data);
        showToast.success('Equipment created successfully');
      }
      setShowModal(false);
      setEditingItem(null);
      loadData();
    } catch (error) {
      console.error('Error saving equipment:', error);
      showToast.error('Failed to save equipment');
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: 'Delete Equipment',
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteEquipment(item.id);
      showToast.success('Equipment deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      showToast.error('Failed to delete equipment');
    }
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Bulk Delete Equipment',
      message: `Are you sure you want to delete ${selectedIds.length} equipment item(s)? This action cannot be undone.`,
      confirmText: 'Delete All',
      danger: true,
    });
    if (!ok) return;
    try {
      await bulkDeleteEquipment(selectedIds);
      showToast.success(`${selectedIds.length} equipment item(s) deleted successfully`);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Error bulk deleting equipment:', error);
      showToast.error('Failed to delete equipment items');
    }
  };

  const handleBulkUpdate = async (field, value) => {
    try {
      await bulkUpdateEquipment(selectedIds, { [field]: value });
      showToast.success(`${selectedIds.length} equipment item(s) updated successfully`);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Error bulk updating equipment:', error);
      showToast.error('Failed to update equipment items');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(equipment.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const exportColumns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Type', accessor: (item) => item.type?.replace(/_/g, ' ') },
    { header: 'Quantity', accessor: 'quantity' },
    { header: 'Available', accessor: 'available' },
    { header: 'Condition', accessor: 'condition' },
  ];

  const handleExportCSV = () => {
    exportToCSV(equipment, exportColumns, 'equipment');
    showToast.success('CSV exported successfully');
  };

  const handleExportPDF = () => {
    exportToPDF(equipment, exportColumns, 'Equipment Report');
    showToast.success('PDF exported successfully');
  };

  const bulkUpdateOptions = [
    {
      label: 'Set Type',
      field: 'type',
      options: (enums?.equipmentTypes || []).map((type) => ({
        label: type.replace(/_/g, ' '),
        value: type,
      })),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button onClick={handleExportCSV} className="btn-secondary">
          Export CSV
        </button>
        <button onClick={handleExportPDF} className="btn-secondary">
          Export PDF
        </button>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Add Equipment
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <BulkActions
          selectedCount={selectedIds.length}
          onDelete={handleBulkDelete}
          onUpdate={handleBulkUpdate}
          updateOptions={bulkUpdateOptions}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <SelectCheckbox
                    checked={equipment.length > 0 && selectedIds.length === equipment.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < equipment.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th className="px-6 py-3 table-header">
                  <SortHeader
                    label="Name"
                    field="name"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3 table-header">
                  <SortHeader
                    label="Type"
                    field="type"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3 table-header hidden sm:table-cell">
                  <SortHeader
                    label="Total"
                    field="quantity"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3 table-header hidden sm:table-cell">
                  <SortHeader
                    label="Available"
                    field="available"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3 table-header hidden md:table-cell">
                  <SortHeader
                    label="Condition"
                    field="condition"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3 table-header hidden lg:table-cell">Location</th>
                <th className="px-6 py-3 table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <SelectCheckbox
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="badge badge-gray">{item.type?.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">{item.quantity}</td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className={item.available <= 2 ? 'text-red-600 font-bold' : ''}>
                      {item.available}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-gray-500">
                    {item.condition || '-'}
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell text-gray-500">
                    {item.location || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {equipment.length === 0 && (
          <p className="text-center py-8 text-gray-500">No equipment found</p>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />
      )}

      {showModal && (
        <EquipmentModal
          item={editingItem}
          enums={enums}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}

function EquipmentModal({ item, enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    type: item?.type || 'DOLLY',
    quantity: item?.quantity || 1,
    location: item?.location || '',
    condition: item?.condition || '',
  });
  const [errors, setErrors] = useState({});

  const validationRules = {
    name: [validators.required('Name is required'), validators.minLength(2, 'Name must be at least 2 characters')],
    type: [validators.required('Type is required')],
    quantity: [validators.required('Quantity is required'), validators.min(1, 'Quantity must be at least 1')],
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">{item ? 'Edit' : 'Add'} Equipment</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`input ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`select ${errors.type ? 'border-red-500' : ''}`}
              >
                {enums?.equipmentTypes?.map((type) => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || '' })}
                className={`input ${errors.quantity ? 'border-red-500' : ''}`}
                min="1"
              />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Condition</label>
              <input
                type="text"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="input"
              />
            </div>
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
