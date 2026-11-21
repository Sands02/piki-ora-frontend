import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, logoutUser } from './api'

const inputStyle = {
  width: '100%',
  maxWidth: '450px',
  padding: '12px',
  margin: '8px 0 20px',
  border: '1px solid #ccc',
  borderRadius: '6px',
  display: 'block',
}

const buttonStyle = {
  padding: '12px 22px',
  background: '#20483f',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
}

const smallButtonStyle = {
  padding: '8px 14px',
  background: 'white',
  color: '#20483f',
  border: '1px solid #c9d6d0',
  borderRadius: '6px',
  cursor: 'pointer',
  marginRight: '8px',
  marginTop: '8px',
}

const dangerButtonStyle = {
  ...smallButtonStyle,
  background: '#fff0ef',
  color: '#a83232',
  border: '1px solid #f3c9c6',
}

const sectionStyle = {
  border: '1px solid #ddd',
  borderRadius: '10px',
  padding: '25px',
  marginBottom: '30px',
}

const rowStyle = {
  border: '1px solid #eee',
  borderRadius: '8px',
  padding: '15px',
  marginBottom: '12px',
}

const mutedStyle = {
  margin: '4px 0',
  color: '#5b6b64',
}

const emptyDoctorForm = { full_name: '', specialty: '', bio: '', is_active: true }
const emptySlotForm = { doctor: '', date: '', start_time: '', end_time: '' }

// "2026-11-23" -> "Mon, 23 Nov 2026" (built from parts so the day never shifts with time zones)
function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// "14:30:00" -> "2:30 pm"
function formatTime(value) {
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours >= 12 ? 'pm' : 'am'
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function describeSlot(item) {
  return `Dr. ${item.doctor_name}, ${formatDate(item.date)}, ${formatTime(item.start_time)} – ${formatTime(item.end_time)}`
}

// Turns a Django REST Framework error response into one readable sentence.
function getErrorMessage(err, fallback) {
  const data = err.response?.data
  if (!data || typeof data === 'string') return fallback
  if (Array.isArray(data)) return data.join(' ')

  const first = data.detail || data.non_field_errors || Object.values(data)[0]
  if (!first) return fallback
  return Array.isArray(first) ? first.join(' ') : String(first)
}

// True if the slot has not started yet.
function isFutureSlot(slot) {
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
  const nowTime = new Date().toTimeString().slice(0, 8) // HH:MM:SS
  return slot.date > today || (slot.date === today && slot.start_time > nowTime)
}

// Loads everything the dashboard needs. Kept outside the component because it doesn't use state.
async function fetchAdminData() {
  const [appointmentResponse, doctorResponse, slotResponse, patientResponse] =
    await Promise.all([
      api.get('appointments/'),
      api.get('doctors/'),
      api.get('slots/'),
      api.get('patients/'),
    ])

  return {
    appointments: appointmentResponse.data,
    doctors: doctorResponse.data,
    slots: slotResponse.data,
    patients: patientResponse.data,
  }
}

function AdminDashboard() {
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [slots, setSlots] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [doctorForm, setDoctorForm] = useState(emptyDoctorForm)
  const [slotForm, setSlotForm] = useState(emptySlotForm)

  const [editingDoctor, setEditingDoctor] = useState(null)
  const [editDoctorForm, setEditDoctorForm] = useState({ full_name: '', specialty: '', bio: '' })

  const [appointmentFilter, setAppointmentFilter] = useState('confirmed')
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [appointmentForm, setAppointmentForm] = useState({ slot: '', reason: '' })

  const [editingPatient, setEditingPatient] = useState(null)
  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    is_active: true,
  })

  function goToLogin() {
    logoutUser()
    navigate('/login', { replace: true })
  }

  function showData(data) {
    setAppointments(data.appointments)
    setDoctors(data.doctors)
    setSlots(data.slots)
    setPatients(data.patients)
  }

  // First load: check this is a staff account, then load the data.
  useEffect(() => {
    let ignore = false

    async function init() {
      if (!localStorage.getItem('pikiOraToken')) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const me = await api.get('me/')

        if (!me.data.is_staff) {
          navigate('/dashboard', { replace: true })
          return
        }

        const data = await fetchAdminData()

        if (!ignore) {
          showData(data)
          setLoading(false)
        }
      } catch (err) {
        if (err.response?.status === 401) {
          logoutUser()
          navigate('/login', { replace: true })
        } else if (!ignore) {
          setError('Unable to load admin information. Please refresh the page.')
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      ignore = true
    }
  }, [navigate])

  // Runs one change (add, edit, delete...), shows the result, then reloads the data.
  async function runAction(action, successMessage) {
    setError('')
    setSuccess('')

    try {
      await action()
      setSuccess(successMessage)
      showData(await fetchAdminData())
      return true
    } catch (err) {
      if (err.response?.status === 401) {
        goToLogin()
      } else {
        setError(getErrorMessage(err, 'Something went wrong. Please try again.'))
      }
      return false
    }
  }

  // ---------- Doctors ----------

  async function handleCreateDoctor(event) {
    event.preventDefault()
    const ok = await runAction(() => api.post('doctors/', doctorForm), 'Doctor added.')
    if (ok) setDoctorForm(emptyDoctorForm)
  }

  function startEditDoctor(doctor) {
    setEditingDoctor(doctor.id)
    setEditDoctorForm({
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      bio: doctor.bio || '',
    })
  }

  async function saveDoctorChanges(event) {
    event.preventDefault()
    const ok = await runAction(
      () => api.patch(`doctors/${editingDoctor}/`, editDoctorForm),
      'Doctor details updated.'
    )
    if (ok) setEditingDoctor(null)
  }

  function toggleDoctor(doctor) {
    runAction(
      () => api.patch(`doctors/${doctor.id}/`, { is_active: !doctor.is_active }),
      doctor.is_active
        ? `Dr. ${doctor.full_name} is no longer accepting appointments.`
        : `Dr. ${doctor.full_name} is accepting appointments again.`
    )
  }

  function deleteDoctor(doctor) {
    const confirmed = window.confirm(
      `Delete Dr. ${doctor.full_name}? This also deletes their appointment slots and appointments. ` +
        'To keep the history, choose "Stop appointments" instead.'
    )
    if (!confirmed) return
    runAction(() => api.delete(`doctors/${doctor.id}/`), `Dr. ${doctor.full_name} has been deleted.`)
  }

  // ---------- Appointment slots ----------

  async function handleCreateSlot(event) {
    event.preventDefault()
    const ok = await runAction(
      () => api.post('slots/', { ...slotForm, doctor: Number(slotForm.doctor) }),
      'Appointment slot created.'
    )
    if (ok) setSlotForm(emptySlotForm)
  }

  function deleteSlot(slot, isBooked) {
    const warning = isBooked
      ? 'This slot is booked. Deleting it also deletes the patient\'s appointment. Continue?'
      : 'Delete this appointment slot?'
    if (!window.confirm(warning)) return
    runAction(() => api.delete(`slots/${slot.id}/`), 'Appointment slot deleted.')
  }

  // ---------- Appointments ----------

  function startEditAppointment(appointment) {
    setEditingAppointment(appointment.id)
    setAppointmentForm({ slot: String(appointment.slot), reason: appointment.reason || '' })
  }

  async function saveAppointmentChanges(event) {
    event.preventDefault()
    const ok = await runAction(
      () =>
        api.patch(`appointments/${editingAppointment}/`, {
          slot: Number(appointmentForm.slot),
          reason: appointmentForm.reason,
        }),
      'Appointment updated.'
    )
    if (ok) setEditingAppointment(null)
  }

  function cancelAppointment(appointment) {
    if (!window.confirm(`Cancel ${appointment.patient_username}'s appointment with ${describeSlot(appointment)}?`)) return
    runAction(() => api.post(`appointments/${appointment.id}/cancel/`), 'Appointment cancelled.')
  }

  // ---------- Patients ----------

  function startEditPatient(patient) {
    setEditingPatient(patient.id)
    setPatientForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email,
      is_active: patient.is_active,
    })
  }

  async function savePatientChanges(event) {
    event.preventDefault()
    const ok = await runAction(
      () => api.patch(`patients/${editingPatient}/`, patientForm),
      'Patient account updated.'
    )
    if (ok) setEditingPatient(null)
  }

  function togglePatient(patient) {
    runAction(
      () => api.patch(`patients/${patient.id}/`, { is_active: !patient.is_active }),
      patient.is_active
        ? `${patient.username} has been blocked from logging in.`
        : `${patient.username} can log in again.`
    )
  }

  function deletePatient(patient) {
    const confirmed = window.confirm(
      `Delete the account "${patient.username}"? Their appointments will be deleted too. This cannot be undone.`
    )
    if (!confirmed) return
    runAction(() => api.delete(`patients/${patient.id}/`), `Patient account "${patient.username}" deleted.`)
  }

  if (loading) return <p style={{ padding: '40px' }}>Loading admin dashboard...</p>

  // Values worked out from the loaded data
  const bookedSlotIds = new Set(
    appointments.filter((a) => a.status === 'confirmed').map((a) => a.slot)
  )
  const activeDoctorIds = new Set(doctors.filter((d) => d.is_active).map((d) => d.id))
  const upcomingSlots = slots.filter(isFutureSlot)
  const freeSlots = upcomingSlots.filter(
    (slot) => !bookedSlotIds.has(slot.id) && activeDoctorIds.has(slot.doctor)
  )
  const confirmedCount = appointments.filter((a) => a.status === 'confirmed').length
  const shownAppointments =
    appointmentFilter === 'all'
      ? appointments
      : appointments.filter((a) => a.status === appointmentFilter)

  return (
    <main
      style={{
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '20px',
        color: '#20483f',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <h1>Piki Ora Admin Dashboard</h1>
          <p>Manage your medical centre.</p>
        </div>

        <button onClick={goToLogin} style={buttonStyle}>
          Log out
        </button>
      </header>

      {error && <p style={{ color: '#a83232' }}>{error}</p>}
      {success && <p style={{ color: '#237c63' }}>{success}</p>}

      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '20px',
          margin: '40px 0',
        }}
      >
        <div>
          <h2>{doctors.length}</h2>
          <p>Doctors</p>
        </div>
        <div>
          <h2>{upcomingSlots.length}</h2>
          <p>Upcoming slots ({freeSlots.length} free)</p>
        </div>
        <div>
          <h2>{confirmedCount}</h2>
          <p>Confirmed appointments</p>
        </div>
        <div>
          <h2>{patients.length}</h2>
          <p>Patients</p>
        </div>
      </section>

      {/* ---------- Add doctor ---------- */}
      <section style={sectionStyle}>
        <h2>Add New Doctor</h2>

        <form onSubmit={handleCreateDoctor}>
          <label htmlFor="new-doctor-name">Full name (without "Dr.")</label>
          <input
            id="new-doctor-name"
            style={inputStyle}
            value={doctorForm.full_name}
            onChange={(e) => setDoctorForm({ ...doctorForm, full_name: e.target.value })}
            required
          />

          <label htmlFor="new-doctor-specialty">Specialty</label>
          <input
            id="new-doctor-specialty"
            style={inputStyle}
            value={doctorForm.specialty}
            onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
            required
          />

          <label htmlFor="new-doctor-bio">Biography</label>
          <textarea
            id="new-doctor-bio"
            style={inputStyle}
            value={doctorForm.bio}
            onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
            rows="3"
          />

          <button type="submit" style={buttonStyle}>
            Add Doctor
          </button>
        </form>
      </section>

      {/* ---------- Create slot ---------- */}
      <section style={sectionStyle}>
        <h2>Create Appointment Slot</h2>

        <form onSubmit={handleCreateSlot}>
          <label htmlFor="slot-doctor">Doctor</label>
          <select
            id="slot-doctor"
            style={inputStyle}
            value={slotForm.doctor}
            onChange={(e) => setSlotForm({ ...slotForm, doctor: e.target.value })}
            required
          >
            <option value="">Select a doctor</option>
            {doctors
              .filter((d) => d.is_active)
              .map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.full_name} – {doctor.specialty}
                </option>
              ))}
          </select>

          <label htmlFor="slot-date">Date</label>
          <input
            id="slot-date"
            type="date"
            style={inputStyle}
            min={new Date().toLocaleDateString('en-CA')}
            value={slotForm.date}
            onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
            required
          />

          <label htmlFor="slot-start">Start time</label>
          <input
            id="slot-start"
            type="time"
            style={inputStyle}
            value={slotForm.start_time}
            onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
            required
          />

          <label htmlFor="slot-end">End time</label>
          <input
            id="slot-end"
            type="time"
            style={inputStyle}
            value={slotForm.end_time}
            onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
            required
          />

          <button type="submit" style={buttonStyle}>
            Create Appointment Slot
          </button>
        </form>
      </section>

      {/* ---------- Doctors ---------- */}
      <section style={sectionStyle}>
        <h2>Doctors</h2>

        {doctors.length === 0 && <p>No doctors yet.</p>}

        {doctors.map((doctor) => (
          <div key={doctor.id} style={rowStyle}>
            {editingDoctor === doctor.id ? (
              <form onSubmit={saveDoctorChanges}>
                <label htmlFor={`doctor-name-${doctor.id}`}>Full name (without "Dr.")</label>
                <input
                  id={`doctor-name-${doctor.id}`}
                  style={inputStyle}
                  value={editDoctorForm.full_name}
                  onChange={(e) => setEditDoctorForm({ ...editDoctorForm, full_name: e.target.value })}
                  required
                />

                <label htmlFor={`doctor-specialty-${doctor.id}`}>Specialty</label>
                <input
                  id={`doctor-specialty-${doctor.id}`}
                  style={inputStyle}
                  value={editDoctorForm.specialty}
                  onChange={(e) => setEditDoctorForm({ ...editDoctorForm, specialty: e.target.value })}
                  required
                />

                <label htmlFor={`doctor-bio-${doctor.id}`}>Biography</label>
                <textarea
                  id={`doctor-bio-${doctor.id}`}
                  style={inputStyle}
                  value={editDoctorForm.bio}
                  onChange={(e) => setEditDoctorForm({ ...editDoctorForm, bio: e.target.value })}
                  rows="3"
                />

                <button type="submit" style={buttonStyle}>
                  Save Changes
                </button>{' '}
                <button type="button" onClick={() => setEditingDoctor(null)} style={smallButtonStyle}>
                  Back
                </button>
              </form>
            ) : (
              <>
                <strong>Dr. {doctor.full_name}</strong>
                <p style={mutedStyle}>
                  {doctor.specialty} · {doctor.is_active ? 'Accepting appointments' : 'Not accepting appointments'}
                </p>

                <button onClick={() => startEditDoctor(doctor)} style={smallButtonStyle}>
                  Edit
                </button>
                <button onClick={() => toggleDoctor(doctor)} style={smallButtonStyle}>
                  {doctor.is_active ? 'Stop appointments' : 'Allow appointments'}
                </button>
                <button onClick={() => deleteDoctor(doctor)} style={dangerButtonStyle}>
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </section>

      {/* ---------- Slots ---------- */}
      <section style={sectionStyle}>
        <h2>Upcoming Appointment Slots</h2>

        {upcomingSlots.length === 0 && <p>No upcoming slots. Create one above.</p>}

        {upcomingSlots.map((slot) => {
          const isBooked = bookedSlotIds.has(slot.id)
          return (
            <div
              key={slot.id}
              style={{ ...rowStyle, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
            >
              <span>
                {describeSlot(slot)} · <strong>{isBooked ? 'Booked' : 'Free'}</strong>
              </span>
              <button onClick={() => deleteSlot(slot, isBooked)} style={dangerButtonStyle}>
                Delete
              </button>
            </div>
          )
        })}
      </section>

      {/* ---------- Appointments ---------- */}
      <section style={sectionStyle}>
        <h2>All Appointments</h2>

        <label htmlFor="appointment-filter">Show </label>
        <select
          id="appointment-filter"
          value={appointmentFilter}
          onChange={(e) => setAppointmentFilter(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '16px' }}
        >
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>

        {shownAppointments.length === 0 && <p>No appointments to show.</p>}

        {shownAppointments.map((appointment) => (
          <article key={appointment.id} style={rowStyle}>
            {editingAppointment === appointment.id ? (
              <form onSubmit={saveAppointmentChanges}>
                <p style={mutedStyle}>Patient: {appointment.patient_username}</p>

                <label htmlFor={`appointment-slot-${appointment.id}`}>Appointment time</label>
                <select
                  id={`appointment-slot-${appointment.id}`}
                  style={inputStyle}
                  value={appointmentForm.slot}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, slot: e.target.value })}
                >
                  <option value={appointment.slot}>Keep current time: {describeSlot(appointment)}</option>
                  {freeSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {describeSlot(slot)}
                    </option>
                  ))}
                </select>

                <label htmlFor={`appointment-reason-${appointment.id}`}>Reason for visit</label>
                <textarea
                  id={`appointment-reason-${appointment.id}`}
                  style={inputStyle}
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                  rows="3"
                />

                <button type="submit" style={buttonStyle}>
                  Save Changes
                </button>{' '}
                <button type="button" onClick={() => setEditingAppointment(null)} style={smallButtonStyle}>
                  Back
                </button>
              </form>
            ) : (
              <>
                <strong>{describeSlot(appointment)}</strong>
                <p style={mutedStyle}>Patient: {appointment.patient_username}</p>
                <p style={mutedStyle}>Reason: {appointment.reason || 'Not specified'}</p>
                <p style={mutedStyle}>
                  Status: {appointment.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                  {appointment.status === 'confirmed' && !appointment.is_upcoming && ' (past)'}
                </p>

                {appointment.status === 'confirmed' && (
                  <>
                    <button onClick={() => startEditAppointment(appointment)} style={smallButtonStyle}>
                      Edit
                    </button>
                    <button onClick={() => cancelAppointment(appointment)} style={dangerButtonStyle}>
                      Cancel appointment
                    </button>
                  </>
                )}
              </>
            )}
          </article>
        ))}
      </section>

      {/* ---------- Patients ---------- */}
      <section style={sectionStyle}>
        <h2>Patient Accounts</h2>

        {patients.length === 0 && <p>No patients have registered yet.</p>}

        {patients.map((patient) => {
          const upcomingCount = appointments.filter(
            (a) => a.patient === patient.id && a.is_upcoming
          ).length

          return (
            <div key={patient.id} style={rowStyle}>
              {editingPatient === patient.id ? (
                <form onSubmit={savePatientChanges}>
                  <p style={mutedStyle}>Username: {patient.username}</p>

                  <label htmlFor={`patient-first-${patient.id}`}>First name</label>
                  <input
                    id={`patient-first-${patient.id}`}
                    style={inputStyle}
                    value={patientForm.first_name}
                    onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}
                  />

                  <label htmlFor={`patient-last-${patient.id}`}>Last name</label>
                  <input
                    id={`patient-last-${patient.id}`}
                    style={inputStyle}
                    value={patientForm.last_name}
                    onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}
                  />

                  <label htmlFor={`patient-email-${patient.id}`}>Email</label>
                  <input
                    id={`patient-email-${patient.id}`}
                    type="email"
                    style={inputStyle}
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                  />

                  <label style={{ display: 'block', marginBottom: '20px' }}>
                    <input
                      type="checkbox"
                      checked={patientForm.is_active}
                      onChange={(e) => setPatientForm({ ...patientForm, is_active: e.target.checked })}
                    />{' '}
                    Account active (untick to stop this patient logging in)
                  </label>

                  <button type="submit" style={buttonStyle}>
                    Save Changes
                  </button>{' '}
                  <button type="button" onClick={() => setEditingPatient(null)} style={smallButtonStyle}>
                    Back
                  </button>
                </form>
              ) : (
                <>
                  <strong>
                    {patient.first_name || patient.last_name
                      ? `${patient.first_name} ${patient.last_name}`.trim()
                      : patient.username}
                  </strong>
                  <p style={mutedStyle}>
                    Username: {patient.username} · {patient.email || 'No email'}
                  </p>
                  <p style={mutedStyle}>
                    {patient.is_active ? 'Active' : 'Blocked'} · {upcomingCount} upcoming appointment
                    {upcomingCount === 1 ? '' : 's'}
                  </p>

                  <button onClick={() => startEditPatient(patient)} style={smallButtonStyle}>
                    Edit
                  </button>
                  <button onClick={() => togglePatient(patient)} style={smallButtonStyle}>
                    {patient.is_active ? 'Block' : 'Unblock'}
                  </button>
                  <button onClick={() => deletePatient(patient)} style={dangerButtonStyle}>
                    Delete
                  </button>
                </>
              )}
            </div>
          )
        })}
      </section>
    </main>
  )
}

export default AdminDashboard