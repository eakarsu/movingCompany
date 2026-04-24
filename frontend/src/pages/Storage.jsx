import { useState, useEffect, useCallback } from 'react';
import { getStorageUnits, createStorageUnit, updateStorageUnit, getStorageReservations, createStorageReservation, endStorageReservation, getStorageStats, getEnums } from '../api';
import { format } from 'date-fns';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';
import { validateForm, validators } from '../utils/validation';

const unitExportColumns = [
  { key: 'unitNumber', label: 'Unit Number' },
  { key: 'size', label: 'Size' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'monthlyRate', label: 'Monthly Rate' },
  { label: 'Climate', accessor: (r) => r.climate ? 'Yes' : 'No' },
  { label: 'Status', accessor: (r) => r.isOccupied ? 'Occupied' : 'Available' },
];

const reservationExportColumns = [
  { label: 'Unit', accessor: (r) => r.unit?.unitNumber || '' },
  { key: 'customerName', label: 'Customer' },
  { key: 'customerPhone', label: 'Phone' },
  { key: 'monthlyRate', label: 'Rate' },
  { key: 'status', label: 'Status' },
  { label: 'Start Date', accessor: (r) => format(new Date(r.startDate), 'MMM d, yyyy') },
];

export default function Storage() {
  const [units, setUnits] = useState([]);
  const [unitsPagination, setUnitsPagination] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [resPagination, setResPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [activeTab, setActiveTab] = useState('units');
  const [unitsPage, setUnitsPage] = useState(1);
  const [resPage, setResPage] = useState(1);
  const [unitsSortBy, setUnitsSortBy] = useState('unitNumber');
  const [unitsSortOrder, setUnitsSortOrder] = useState('asc');
  const [resSortBy, setResSortBy] = useState('createdAt');
  const [resSortOrder, setResSortOrder] = useState('desc');
  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [unitsRes, reservationsRes, statsRes, enumsRes] = await Promise.all([
        getStorageUnits({ page: unitsPage, sortBy: unitsSortBy, sortOrder: unitsSortOrder }),
        getStorageReservations({ page: resPage, sortBy: resSortBy, sortOrder: resSortOrder }),
        getStorageStats(),
        getEnums(),
      ]);
      const ud = unitsRes.data;
      setUnits(ud.data || ud);
      setUnitsPagination(ud.pagination || null);
      const rd = reservationsRes.data;
      setReservations(rd.data || rd);
      setResPagination(rd.pagination || null);
      setStats(statsRes.data);
      setEnums(enumsRes.data);
    } catch (error) {
      showToast.error('Failed to load storage data');
    } finally {
      setLoading(false);
    }
  }, [unitsPage, resPage, unitsSortBy, unitsSortOrder, resSortBy, resSortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveUnit = async (data) => {
    try {
      if (selectedUnit) {
        await updateStorageUnit(selectedUnit.id, data);
        showToast.success('Unit updated');
      } else {
        await createStorageUnit(data);
        showToast.success('Unit created');
      }
      setShowUnitModal(false);
      setSelectedUnit(null);
      loadData();
    } catch (error) {
      showToast.error('Failed to save unit');
    }
  };

  const handleCreateReservation = async (data) => {
    try {
      await createStorageReservation(data);
      showToast.success('Reservation created');
      setShowReservationModal(false);
      loadData();
    } catch (error) {
      showToast.error('Failed to create reservation');
    }
  };

  const handleEndReservation = async (id) => {
    const confirmed = await confirm({
      title: 'End Reservation',
      message: 'Are you sure you want to end this reservation?',
      confirmLabel: 'End Reservation',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await endStorageReservation(id);
      showToast.success('Reservation ended');
      loadData();
    } catch (error) {
      showToast.error('Failed to end reservation');
    }
  };

  if (loading && !units.length) {
    return <TableSkeleton rows={6} cols={5} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Total Units</p>
          <p className="text-lg sm:text-2xl font-bold">{stats?.totalUnits || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Occupied</p>
          <p className="text-lg sm:text-2xl font-bold text-yellow-600">{stats?.occupiedUnits || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Available</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{stats?.availableUnits || 0}</p>
        </div>
        <div className="card text-center py-3 sm:py-6">
          <p className="text-xs sm:text-sm text-gray-500">Occupancy</p>
          <p className="text-lg sm:text-2xl font-bold">{stats?.occupancyRate || 0}%</p>
        </div>
        <div className="card text-center py-3 sm:py-6 col-span-2 sm:col-span-1">
          <p className="text-xs sm:text-sm text-gray-500">Monthly Revenue</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">${stats?.monthlyRevenue?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2 text-sm sm:text-base ${activeTab === 'units' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Units
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2 text-sm sm:text-base ${activeTab === 'reservations' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Reservations
        </button>
      </div>

      {activeTab === 'units' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="flex gap-2">
              <button onClick={() => exportToCSV(units, unitExportColumns, 'storage_units')} className="btn-secondary text-sm">CSV</button>
              <button onClick={() => exportToPDF(units, unitExportColumns, 'storage_units', 'Storage Units')} className="btn-secondary text-sm">PDF</button>
            </div>
            <button onClick={() => setShowUnitModal(true)} className="btn-primary text-sm">
              + Add Unit
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {units.map((unit) => (
              <div
                key={unit.id}
                className={`card cursor-pointer p-3 sm:p-6 ${unit.isOccupied ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}
                onClick={() => {
                  if (!unit.isOccupied) {
                    setSelectedUnit(unit);
                    setShowReservationModal(true);
                  }
                }}
              >
                <h3 className="font-bold text-sm sm:text-lg">{unit.unitNumber}</h3>
                <p className="text-xs sm:text-sm text-gray-600">{unit.size}</p>
                <p className="text-xs sm:text-sm font-medium">${unit.monthlyRate}/mo</p>
                <span className={`badge mt-2 text-xs ${unit.isOccupied ? 'badge-yellow' : 'badge-green'}`}>
                  {unit.isOccupied ? 'Occupied' : 'Available'}
                </span>
                {unit.climate && <span className="badge badge-blue mt-1 text-xs">Climate</span>}
              </div>
            ))}
          </div>
          <Pagination pagination={unitsPagination} onPageChange={setUnitsPage} />
        </>
      )}

      {activeTab === 'reservations' && (
        <>
          <div className="flex justify-end gap-2">
            <button onClick={() => exportToCSV(reservations, reservationExportColumns, 'reservations')} className="btn-secondary text-sm">CSV</button>
            <button onClick={() => exportToPDF(reservations, reservationExportColumns, 'reservations', 'Reservations')} className="btn-secondary text-sm">PDF</button>
          </div>
          <div className="card overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3"><SortHeader label="Unit" field="unitId" currentSort={resSortBy} currentOrder={resSortOrder} onSort={(f, o) => { setResSortBy(f); setResSortOrder(o); }} /></th>
                  <th className="px-4 py-3 table-header">Customer</th>
                  <th className="px-4 py-3 hidden sm:table-cell"><SortHeader label="Start Date" field="startDate" currentSort={resSortBy} currentOrder={resSortOrder} onSort={(f, o) => { setResSortBy(f); setResSortOrder(o); }} /></th>
                  <th className="px-4 py-3 hidden md:table-cell table-header">Rate</th>
                  <th className="px-4 py-3 table-header">Status</th>
                  <th className="px-4 py-3 table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-sm">{res.unit?.unitNumber}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{res.customerName}</p>
                      <p className="text-xs text-gray-500">{res.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm hidden sm:table-cell">{format(new Date(res.startDate), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">${res.monthlyRate}</td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${res.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {res.status === 'ACTIVE' && (
                        <button onClick={() => handleEndReservation(res.id)} className="text-red-600 hover:text-red-800 text-sm">
                          End
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={resPagination} onPageChange={setResPage} />
        </>
      )}

      {showUnitModal && (
        <UnitModal
          unit={selectedUnit}
          enums={enums}
          onClose={() => { setShowUnitModal(false); setSelectedUnit(null); }}
          onSubmit={handleSaveUnit}
        />
      )}

      {showReservationModal && (
        <ReservationModal
          unit={selectedUnit}
          onClose={() => { setShowReservationModal(false); setSelectedUnit(null); }}
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
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: ve } = validateForm(formData, {
      unitNumber: [validators.required],
      monthlyRate: [validators.required, validators.positiveNumber],
    });
    if (!isValid) { setErrors(ve); return; }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">{unit ? 'Edit' : 'Add'} Storage Unit</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unit Number *</label>
              <input type="text" value={formData.unitNumber} onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })} className={`input ${errors.unitNumber ? 'border-red-500' : ''}`} />
              {errors.unitNumber && <p className="text-red-500 text-xs mt-1">{errors.unitNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Size</label>
              <select value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} className="select">
                {enums?.storageSizes?.map((size) => (<option key={size} value={size}>{size}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Capacity (cu ft)</label>
              <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Rate *</label>
              <input type="number" value={formData.monthlyRate} onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) })} className={`input ${errors.monthlyRate ? 'border-red-500' : ''}`} />
              {errors.monthlyRate && <p className="text-red-500 text-xs mt-1">{errors.monthlyRate}</p>}
            </div>
          </div>
          <div className="flex items-center">
            <input type="checkbox" checked={formData.climate} onChange={(e) => setFormData({ ...formData, climate: e.target.checked })} className="mr-2" />
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
    customerName: '', customerPhone: '', customerEmail: '',
    startDate: new Date().toISOString().split('T')[0],
    monthlyRate: unit?.monthlyRate || 0,
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: ve } = validateForm(formData, {
      customerName: [validators.required],
      customerPhone: [validators.required, validators.phone],
      customerEmail: [validators.required, validators.email],
      startDate: [validators.required, validators.date],
    });
    if (!isValid) { setErrors(ve); return; }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">New Reservation - {unit?.unitNumber}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name *</label>
            <input type="text" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className={`input ${errors.customerName ? 'border-red-500' : ''}`} />
            {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input type="tel" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} className={`input ${errors.customerPhone ? 'border-red-500' : ''}`} />
            {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} className={`input ${errors.customerEmail ? 'border-red-500' : ''}`} />
            {errors.customerEmail && <p className="text-red-500 text-xs mt-1">{errors.customerEmail}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date *</label>
            <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={`input ${errors.startDate ? 'border-red-500' : ''}`} />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Rate</label>
            <input type="number" value={formData.monthlyRate} onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) })} className="input" />
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
