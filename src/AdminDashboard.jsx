
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
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '15px',
}

function cleanDoctorName(name = '') {
  return name.replace(/^(Dr\.?\s*)+/i, '').trim()
}

function AdminDashboard() {
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingDoctor, setEditingDoctor] = useState(null)

  const [editDoctorForm, setEditDoctorForm] = useState({
    full_name: '',
    specialty: '',
    bio: '',
  })

  const [slotForm, setSlotForm] = useState({
    doctor: '',
    date: '',
    start_time: '',
    end_time: '',
  })

  const [doctorForm, setDoctorForm] = useState({
    full_name: '',
    specialty: '',
    bio: '',
    is_active: true,
  })

  async function loadAdminData() {
    try {
      const [appointmentResponse, doctorResponse, slotResponse] =
        await Promise.all([
          api.get('appointments/'),
          api.get('doctors/'),
          api.get('slots/'),
        ])

      setAppointments(
        appointmentResponse.data.results || appointmentResponse.data
      )

      setDoctors(doctorResponse.data.results || doctorResponse.data)

      setSlots(slotResponse.data.results || slotResponse.data)
    } catch (err) {
      if (err.response?.status === 401) {
        logoutUser()
        navigate('/login', { replace: true })
      } else {
        setError('Unable to load admin information. Please refresh.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response = await api.get('me/')

        if (!response.data.is_staff) {
          navigate('/dashboard', { replace: true })
          return
        }

        await loadAdminData()
      } catch {
        logoutUser()
        navigate('/login', { replace: true })
      }
    }

    if (!localStorage.getItem('pikiOraToken')) {
      navigate('/login', { replace: true })
    } else {
      checkAdmin()
    }
  }, [navigate])

  async function handleCreateSlot(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (slotForm.end_time <= slotForm.start_time) {
      setError('End time must be later than start time.')
      return
    }

    try {
      await api.post('slots/', {
        ...slotForm,
        doctor: Number(slotForm.doctor),
      })

      setSuccess('Appointment slot created successfully!')

      setSlotForm({
        doctor: '',
        date: '',
        start_time: '',
        end_time: '',
      })

      await loadAdminData()
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data || 'Unable to create slot.')
      )
    }
  }

  async function handleCreateDoctor(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.post('doctors/', {
        ...doctorForm,
        full_name: cleanDoctorName(doctorForm.full_name),
      })

      setSuccess('Doctor added successfully!')

      setDoctorForm({
        full_name: '',
        specialty: '',
        bio: '',
        is_active: true,
      })

      await loadAdminData()
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data || 'Unable to add doctor.')
      )
    }
  }

  function startEditDoctor(doctor) {
    setEditingDoctor(doctor.id)

    setEditDoctorForm({
      full_name: cleanDoctorName(doctor.full_name),
      specialty: doctor.specialty,
      bio: doctor.bio || '',
    })

    setError('')
    setSuccess('')
  }

  function cancelEditDoctor() {
    setEditingDoctor(null)
    setEditDoctorForm({
      full_name: '',
      specialty: '',
      bio: '',
    })
  }

  async function saveDoctorChanges(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.patch(`doctors/${editingDoctor}/`, {
        ...editDoctorForm,
        full_name: cleanDoctorName(editDoctorForm.full_name),
      })

      setSuccess('Doctor details updated successfully!')

      cancelEditDoctor()
      await loadAdminData()
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data || 'Unable to update doctor.')
      )
    }
  }

  async function toggleDoctor(doctor) {
    setError('')
    setSuccess('')

    try {
      await api.patch(`doctors/${doctor.id}/`, {
        is_active: !doctor.is_active,
      })

      setSuccess(
        doctor.is_active
          ? 'Doctor deactivated successfully.'
          : 'Doctor activated successfully.'
      )

      await loadAdminData()
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data || 'Unable to update doctor.')
      )
    }
  }

  function handleLogout() {
    logoutUser()
    navigate('/login', { replace: true })
  }

  if (loading) return <p>Loading admin dashboard...</p>

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
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1>Piki Ora Admin Dashboard</h1>
          <p>Manage your medical centre.</p>
        </div>

        <button onClick={handleLogout}>Log out</button>
      </header>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '20px',
          margin: '50px 0',
        }}
      >
        <div>
          <h2>{doctors.length}</h2>
          <p>Total doctors</p>
        </div>

        <div>
          <h2>{slots.length}</h2>
          <p>Total appointment slots</p>
        </div>

        <div>
          <h2>{appointments.length}</h2>
          <p>Total appointments</p>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2>Add New Doctor</h2>

        <form onSubmit={handleCreateDoctor}>
          <label>Full Name</label>
          <input
            style={inputStyle}
            value={doctorForm.full_name}
            onChange={e =>
              setDoctorForm({
                ...doctorForm,
                full_name: e.target.value,
              })
            }
            required
          />

          <label>Specialty</label>
          <input
            style={inputStyle}
            value={doctorForm.specialty}
            onChange={e =>
              setDoctorForm({
                ...doctorForm,
                specialty: e.target.value,
              })
            }
            required
          />

          <label>Biography</label>
          <textarea
            style={inputStyle}
            value={doctorForm.bio}
            onChange={e =>
              setDoctorForm({
                ...doctorForm,
                bio: e.target.value,
              })
            }
            rows="3"
          />

          <button type="submit" style={buttonStyle}>
            Add Doctor
          </button>
        </form>
      </section>

      <section style={sectionStyle}>
        <h2>Create Appointment Slot</h2>

        <form onSubmit={handleCreateSlot}>
          <label>Choose Doctor</label>
          <select
            style={inputStyle}
            value={slotForm.doctor}
            onChange={e =>
              setSlotForm({
                ...slotForm,
                doctor: e.target.value,
              })
            }
            required
          >
            <option value="">Select a doctor</option>

            {doctors.filter(d => d.is_active).map(doctor => (
              <option key={doctor.id} value={doctor.id}>
                {cleanDoctorName(doctor.full_name)} - {doctor.specialty}
              </option>
            ))}
          </select>

          <label>Date</label>
          <input
            type="date"
            style={inputStyle}
            min={new Date().toLocaleDateString('en-CA')}
            value={slotForm.date}
            onChange={e =>
              setSlotForm({
                ...slotForm,
                date: e.target.value,
              })
            }
            required
          />

          <label>Start Time</label>
          <input
            type="time"
            style={inputStyle}
            value={slotForm.start_time}
            onChange={e =>
              setSlotForm({
                ...slotForm,
                start_time: e.target.value,
              })
            }
            required
          />

          <label>End Time</label>
          <input
            type="time"
            style={inputStyle}
            value={slotForm.end_time}
            onChange={e =>
              setSlotForm({
                ...slotForm,
                end_time: e.target.value,
              })
            }
            required
          />

          <button type="submit" style={buttonStyle}>
            Create Appointment Slot
          </button>
        </form>
      </section>

      <section style={sectionStyle}>
        <h2>Doctors</h2>

        {doctors.map(doctor => (
          <div key={doctor.id} style={rowStyle}>
            <div style={{ flex: 1 }}>
              {editingDoctor === doctor.id ? (
                <form onSubmit={saveDoctorChanges}>
                  <label>Doctor Name</label>
                  <input
                    style={inputStyle}
                    value={editDoctorForm.full_name}
                    onChange={e =>
                      setEditDoctorForm({
                        ...editDoctorForm,
                        full_name: e.target.value,
                      })
                    }
                    required
                  />

                  <label>Specialty</label>
                  <input
                    style={inputStyle}
                    value={editDoctorForm.specialty}
                    onChange={e =>
                      setEditDoctorForm({
                        ...editDoctorForm,
                        specialty: e.target.value,
                      })
                    }
                    required
                  />

                  <label>Biography</label>
                  <textarea
                    style={inputStyle}
                    value={editDoctorForm.bio}
                    onChange={e =>
                      setEditDoctorForm({
                        ...editDoctorForm,
                        bio: e.target.value,
                      })
                    }
                    rows="3"
                  />

                  <button type="submit" style={buttonStyle}>
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditDoctor}
                    style={{
                      marginLeft: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <strong>
                    Dr. {cleanDoctorName(doctor.full_name)}
                  </strong>

                  <p>
                    {doctor.specialty} |{' '}
                    {doctor.is_active ? 'Active' : 'Inactive'}
                  </p>

                  <button
                    onClick={() => startEditDoctor(doctor)}
                    style={{ marginRight: '10px' }}
                  >
                    Edit
                  </button>

                  <button onClick={() => toggleDoctor(doctor)}>
                    {doctor.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2>Appointment Slots</h2>

        {slots.map(slot => (
          <p key={slot.id}>
            Dr. {cleanDoctorName(slot.doctor_name)} | {slot.date} |{' '}
            {slot.start_time} - {slot.end_time}
          </p>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2>All Appointments</h2>

        {appointments.map(appointment => (
          <article key={appointment.id} style={rowStyle}>
            <div>
              <strong>Appointment #{appointment.id}</strong>
              <p>Patient: {appointment.patient_username}</p>
              <p>Slot ID: {appointment.slot}</p>
              <p>Status: {appointment.status}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}

export default AdminDashboard
