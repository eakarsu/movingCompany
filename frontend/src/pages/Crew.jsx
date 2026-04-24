import { useState, useEffect, useCallback } from 'react';
import { getCrew, createCrewMember, updateCrewMember, deleteCrewMember, bulkDeleteCrew, bulkUpdateCrew, getEnums } from '../api';
import { showToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import SortHeader from '../components/SortHeader';
import BulkActions, { SelectCheckbox } from '../components/BulkActions';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV, exportToPDF } from '../utils/export';
import { validateForm, validators } from '../utils/validation';

const exportColumns = [
  { header: 'Name', accessor: (row) => `${row.firstName} ${row.lastName}` },
  { header: 'Email', accessor: 'email' },
  { header: 'Phone', accessor: 'phone' },
  { header: 'Role', accessor: 'role' },
  { header: 'Status', accessor: (row) => (row.isActive ? 'Active' : 'Inactive') },
];

const bulkUpdateOptions = [
  {
    label: 'Set Role',
    field: 'role',
    options: [
      { label: 'Driver', value: 'DRIVER' },
      { label: 'Mover', value: 'MOVER' },
      { label: 'Packer', value: 'PACKER' },
      { label: 'Crew Lead', value: 'CREW_LEAD' },
    ],
  },
  {
    label: 'Set Active',
    field: 'isActive',
    options: [
      { label: 'Active', value: true },
      { label: 'Inactive', value: false },
    ],
  },
];

export default function Crew() {
  const [crew, setCrew] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const confirm = useConfirm();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [crewRes, enumsRes] = await Promise.all([
        getCrew({ page, sortBy, sortOrder }),
        getEnums(),
      ]);
      const data = crewRes.data;
      setCrew(data.data || data);
      setPagination(data.pagination || null);
      setEnums(enumsRes.data);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error loading crew:', error);
      showToast.error('Failed to load crew members');
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
      if (editingMember) {
        await updateCrewMember(editingMember.id, data);
        showToast.success('Crew member updated successfully');
      } else {
        await createCrewMember(data);
        showToast.success('Crew member created successfully');
      }
      setShowModal(false);
      setEditingMember(null);
      loadData();
    } catch (error) {
      console.error('Error saving crew member:', error);
      showToast.error('Failed to save crew member');
    }
  };

  const handleDelete = async (member) => {
    const ok = await confirm({
      title: 'Delete Crew Member',
      message: `Are you sure you want to delete ${member.firstName} ${member.lastName}? This action cannot be undone.`,
    });
    if (!ok) return;
    try {
      await deleteCrewMember(member.id);
      showToast.success('Crew member deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting crew member:', error);
      showToast.error('Failed to delete crew member');
    }
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Bulk Delete',
      message: `Are you sure you want to delete ${selectedIds.length} crew member(s)? This action cannot be undone.`,
    });
    if (!ok) return;
    try {
      await bulkDeleteCrew(selectedIds);
      showToast.success(`${selectedIds.length} crew member(s) deleted successfully`);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      showToast.error('Failed to delete crew members');
    }
  };

  const handleBulkUpdate = async (field, value) => {
    const ok = await confirm({
      title: 'Bulk Update',
      message: `Are you sure you want to update ${selectedIds.length} crew member(s)?`,
    });
    if (!ok) return;
    try {
      await bulkUpdateCrew(selectedIds, { [field]: value });
      showToast.success(`${selectedIds.length} crew member(s) updated successfully`);
      setSelectedIds([]);
      loadData();
    } catch (error) {
      console.error('Error bulk updating:', error);
      showToast.error('Failed to update crew members');
    }
  };

  const handleExportCSV = () => {
    try {
      exportToCSV(crew, exportColumns, 'crew');
      showToast.success('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showToast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(crew, exportColumns, 'Crew Members');
      showToast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast.error('Failed to export PDF');
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(crew.map((m) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      DRIVER: 'badge-blue',
      CREW_LEAD: 'badge-purple',
      MOVER: 'badge-green',
      PACKER: 'badge-yellow',
    };
    return colors[role] || 'badge-gray';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <div className="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
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
          + Add Crew Member
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <BulkActions
          selectedCount={selectedIds.length}
          onDelete={handleBulkDelete}
          onUpdate={handleBulkUpdate}
          updateOptions={bulkUpdateOptions}
        />
      )}

      {/* Table View */}
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-3 w-10">
                <SelectCheckbox
                  checked={crew.length > 0 && selectedIds.length === crew.length}
                  indeterminate={selectedIds.length > 0 && selectedIds.length < crew.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <SortHeader
                label="Name"
                field="firstName"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortHeader
                label="Phone"
                field="phone"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <SortHeader
                label="Email"
                field="email"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortHeader
                label="Role"
                field="role"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortHeader
                label="Rate"
                field="hourlyRate"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="hidden lg:table-cell"
              />
              <SortHeader
                label="Status"
                field="isActive"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <th className="p-3 text-sm font-medium text-gray-600">Skills</th>
              <th className="p-3 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {crew.map((member) => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <SelectCheckbox
                    checked={selectedIds.includes(member.id)}
                    onChange={(e) => handleSelectOne(member.id, e.target.checked)}
                  />
                </td>
                <td className="p-3 font-medium">
                  {member.firstName} {member.lastName}
                </td>
                <td className="p-3 hidden sm:table-cell">{member.phone}</td>
                <td className="p-3 hidden md:table-cell">{member.email || '-'}</td>
                <td className="p-3">
                  <span className={`badge ${getRoleColor(member.role)}`}>{member.role}</span>
                </td>
                <td className="p-3 hidden lg:table-cell">${member.hourlyRate}/hr</td>
                <td className="p-3 hidden sm:table-cell">
                  <span className={`badge ${member.isActive ? 'badge-green' : 'badge-red'}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-3">
                  {member.skills?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill, i) => (
                        <span key={i} className="badge badge-gray text-xs">{skill}</span>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingMember(member);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member)}
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

        {crew.length === 0 && (
          <p className="text-center py-8 text-gray-500">No crew members found</p>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <CrewModal
          member={editingMember}
          enums={enums}
          onClose={() => {
            setShowModal(false);
            setEditingMember(null);
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}

function CrewModal({ member, enums, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role: member?.role || 'MOVER',
    hourlyRate: member?.hourlyRate || 18,
    isActive: member?.isActive ?? true,
    skills: member?.skills || [],
  });
  const [errors, setErrors] = useState({});

  const validationRules = {
    firstName: [validators.required('First name is required')],
    lastName: [validators.required('Last name is required')],
    phone: [
      validators.required('Phone number is required'),
      validators.phone('Please enter a valid phone number'),
    ],
    email: [validators.email('Please enter a valid email address')],
    hourlyRate: [validators.required('Hourly rate is required')],
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast.error('Please fix the form errors before submitting');
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">{member ? 'Edit' : 'Add'} Crew Member</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={`input ${errors.firstName ? 'border-red-500' : ''}`}
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={`input ${errors.lastName ? 'border-red-500' : ''}`}
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`input ${errors.phone ? 'border-red-500' : ''}`}
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`input ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="select"
              >
                {enums?.crewRoles?.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate</label>
              <input
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                className={`input ${errors.hourlyRate ? 'border-red-500' : ''}`}
                step="0.5"
              />
              {errors.hourlyRate && (
                <p className="text-red-500 text-xs mt-1">{errors.hourlyRate}</p>
              )}
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
