import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getJob, updateJobStatus, assignCrew, assignTruck, addJobNote, createInvoice, sendBookingConfirmation, getCrew, getTrucks, getEnums } from '../api';
import { format } from 'date-fns';

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [crew, setCrew] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [showTruckModal, setShowTruckModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [jobRes, crewRes, trucksRes, enumsRes] = await Promise.all([
        getJob(id),
        getCrew({ isActive: true }),
        getTrucks({ isActive: true }),
        getEnums(),
      ]);
      setJob(jobRes.data);
      setCrew(crewRes.data);
      setTrucks(trucksRes.data);
      setEnums(enumsRes.data);
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateJobStatus(id, { status });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAssignCrew = async (crewMemberId, role) => {
    try {
      await assignCrew(id, { crewMemberId, role });
      setShowCrewModal(false);
      loadData();
    } catch (error) {
      console.error('Error assigning crew:', error);
    }
  };

  const handleAssignTruck = async (truckId) => {
    try {
      await assignTruck(id, { truckId });
      setShowTruckModal(false);
      loadData();
    } catch (error) {
      console.error('Error assigning truck:', error);
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      await addJobNote(id, { content: note });
      setNote('');
      loadData();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      await createInvoice({ jobId: id });
      loadData();
    } catch (error) {
      console.error('Error creating invoice:', error);
    }
  };

  const handleSendConfirmation = async () => {
    try {
      await sendBookingConfirmation({ jobId: id });
      alert('Confirmation sent!');
    } catch (error) {
      console.error('Error sending confirmation:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: 'badge-blue',
      CONFIRMED: 'badge-green',
      IN_PROGRESS: 'badge-yellow',
      LOADING: 'badge-yellow',
      IN_TRANSIT: 'badge-purple',
      UNLOADING: 'badge-yellow',
      COMPLETED: 'badge-green',
      CANCELLED: 'badge-red',
    };
    return colors[status] || 'badge-gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return <p className="text-center py-8 text-gray-500">Job not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{job.jobNumber}</h1>
          <p className="text-gray-500">
            {job.lead?.firstName} {job.lead?.lastName} | {format(new Date(job.moveDate), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`badge ${getStatusColor(job.status)}`}>{job.status?.replace(/_/g, ' ')}</span>
          <select
            value={job.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="select w-40"
          >
            {enums?.jobStatuses?.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowCrewModal(true)} className="btn-secondary">Assign Crew</button>
        <button onClick={() => setShowTruckModal(true)} className="btn-secondary">Assign Truck</button>
        <button onClick={handleSendConfirmation} className="btn-secondary">Send Confirmation</button>
        {job.status === 'COMPLETED' && !job.invoice && (
          <button onClick={handleCreateInvoice} className="btn-primary">Create Invoice</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Locations */}
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold mb-2">Origin</h3>
              <p>{job.originAddress}</p>
              <p>{job.originCity}, {job.originState} {job.originZip}</p>
              {job.originNotes && <p className="text-sm text-gray-500 mt-2">{job.originNotes}</p>}
            </div>
            <div className="card">
              <h3 className="font-semibold mb-2">Destination</h3>
              <p>{job.destAddress}</p>
              <p>{job.destCity}, {job.destState} {job.destZip}</p>
              {job.destNotes && <p className="text-sm text-gray-500 mt-2">{job.destNotes}</p>}
            </div>
          </div>

          {/* Crew Assignments */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Crew ({job.crewAssignments?.length || 0}/{job.crewSize})</h2>
            {job.crewAssignments?.length > 0 ? (
              <div className="space-y-2">
                {job.crewAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{assignment.crewMember?.firstName} {assignment.crewMember?.lastName}</p>
                      <span className="badge badge-gray">{assignment.role}</span>
                    </div>
                    {assignment.confirmedAt && <span className="text-green-600 text-sm">Confirmed</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No crew assigned</p>
            )}
          </div>

          {/* Trucks */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Trucks ({job.truckAssignments?.length || 0}/{job.trucksNeeded})</h2>
            {job.truckAssignments?.length > 0 ? (
              <div className="space-y-2">
                {job.truckAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{assignment.truck?.name}</p>
                      <p className="text-sm text-gray-500">{assignment.truck?.licensePlate}</p>
                    </div>
                    <span className="badge badge-blue">{assignment.truck?.type?.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No trucks assigned</p>
            )}
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="input flex-1"
              />
              <button onClick={handleAddNote} className="btn-primary">Add</button>
            </div>
            {job.jobNotes?.length > 0 ? (
              <div className="space-y-2">
                {job.jobNotes.map((n) => (
                  <div key={n.id} className="p-3 bg-gray-50 rounded-lg">
                    <p>{n.content}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {n.createdBy} - {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No notes yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Job Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Quote Total</p>
                <p className="font-bold text-xl">${job.quote?.total?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Required Crew</p>
                <p className="font-medium">{job.crewSize} people</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Trucks Needed</p>
                <p className="font-medium">{job.trucksNeeded}</p>
              </div>
              {job.equipmentNeeds && (
                <div>
                  <p className="text-sm text-gray-500">Equipment</p>
                  <p className="font-medium">{job.equipmentNeeds}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Contact</h2>
            <p className="font-medium">{job.lead?.firstName} {job.lead?.lastName}</p>
            <p className="text-gray-600">{job.lead?.email}</p>
            <p className="text-gray-600">{job.lead?.phone}</p>
          </div>

          {job.invoice && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Invoice</h2>
              <p className="font-medium">{job.invoice.invoiceNumber}</p>
              <p className="text-gray-600">Total: ${job.invoice.total?.toLocaleString()}</p>
              <span className={`badge ${job.invoice.status === 'PAID' ? 'badge-green' : 'badge-yellow'}`}>
                {job.invoice.status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCrewModal && (
        <CrewModal
          crew={crew}
          assigned={job.crewAssignments?.map(a => a.crewMemberId) || []}
          enums={enums}
          onClose={() => setShowCrewModal(false)}
          onSubmit={handleAssignCrew}
        />
      )}
      {showTruckModal && (
        <TruckModal
          trucks={trucks}
          assigned={job.truckAssignments?.map(a => a.truckId) || []}
          onClose={() => setShowTruckModal(false)}
          onSubmit={handleAssignTruck}
        />
      )}
    </div>
  );
}

function CrewModal({ crew, assigned, enums, onClose, onSubmit }) {
  const [selected, setSelected] = useState('');
  const [role, setRole] = useState('MOVER');

  const available = crew.filter(c => !assigned.includes(c.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Assign Crew Member</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Crew Member</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="select"
            >
              <option value="">Select crew member</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} - {c.role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role for this job</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="select"
            >
              {enums?.crewRoles?.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => onSubmit(selected, role)}
              disabled={!selected}
              className="btn-primary"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TruckModal({ trucks, assigned, onClose, onSubmit }) {
  const [selected, setSelected] = useState('');

  const available = trucks.filter(t => !assigned.includes(t.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Assign Truck</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Truck</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="select"
            >
              <option value="">Select truck</option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} - {t.licensePlate} ({t.type?.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => onSubmit(selected)}
              disabled={!selected}
              className="btn-primary"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
