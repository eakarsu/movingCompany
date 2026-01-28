import { useState, useEffect } from 'react';
import { getCrew, createCrewMember, updateCrewMember, getEnums } from '../api';

export default function Crew() {
  const [crew, setCrew] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [crewRes, enumsRes] = await Promise.all([
        getCrew(),
        getEnums(),
      ]);
      setCrew(crewRes.data);
      setEnums(enumsRes.data);
    } catch (error) {
      console.error('Error loading crew:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingMember) {
        await updateCrewMember(editingMember.id, data);
      } else {
        await createCrewMember(data);
      }
      setShowModal(false);
      setEditingMember(null);
      loadData();
    } catch (error) {
      console.error('Error saving crew member:', error);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + Add Crew Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {crew.map((member) => (
          <div key={member.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{member.firstName} {member.lastName}</h3>
                <span className={`badge ${getRoleColor(member.role)}`}>{member.role}</span>
              </div>
              <span className={`badge ${member.isActive ? 'badge-green' : 'badge-red'}`}>
                {member.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>{member.phone}</p>
              {member.email && <p>{member.email}</p>}
              <p className="font-medium">${member.hourlyRate}/hr</p>
            </div>
            {member.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {member.skills.map((skill, i) => (
                  <span key={i} className="badge badge-gray text-xs">{skill}</span>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setEditingMember(member);
                setShowModal(true);
              }}
              className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {crew.length === 0 && (
        <p className="text-center py-8 text-gray-500">No crew members found</p>
      )}

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">{member ? 'Edit' : 'Add'} Crew Member</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
                className="input"
                step="0.5"
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
