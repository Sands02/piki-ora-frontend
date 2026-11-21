import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, logoutUser } from './api'
import './Dashboard.css'

const editButtonStyle = {
  background: '#e8f5ed',
  color: '#237c63',
  border: 'none',
  padding: '10px 15px',
  borderRadius: '6px',
  cursor: 'pointer',
  marginRight: '8px',
}

const secondaryButtonStyle = {
  background: 'white',
  color: '#254b3e',
  border: '1px solid #dce5df',
}

// "2026-11-23" -> "Mon 23 Nov 2026" (built from parts so the day never shifts with time zones)
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
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function describeSlot(item) {
  return `Dr. ${item.doctor_name}, ${formatDate(item.date)}, ${formatTime(item.start_time)} – ${formatTime(item.end_time)}`
}

// Turns a Django REST Framework error response into one readable sentence.
function getErrorMessage(err, fallback) {
  const data = err.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return fallback
  if (Array.isArray(data)) return data.join(' ')

  const first = data.detail || data.slot || data.non_field_errors || Object.values(data)[0]
  if (!first) return fallback
  return Array.isArray(first) ? first.join(' ') : String(first)
}

// Loads the slots and appointments. Kept outside the component because it doesn't use state.
async function fetchDashboardData() {
  const [slotResponse, appointmentResponse] = await Promise.all([
    api.get('slots/'),
    api.get('appointments/'),
  ])
  return { slots: slotResponse.data, appointments: appointmentResponse.data }
}

function Dashboard() {
  const navigate = useNavigate()

  const [slots, setSlots] = useState([])
  const [appointments, setAppointments] = useState([])
  const [reason, setReason] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // The appointment being edited, and the form values for it
  const [editingId, setEditingId] = useState(null)
  const [editSlot, setEditSlot] = useState('')
  const [editReason, setEditReason] = useState('')

  function goToLogin() {
    logoutUser()
    navigate('/login', { replace: true })
  }

  // First load: check the login, send staff to their dashboard, then load the data.
  useEffect(() => {
    let ignore = false

    async function init() {
      if (!localStorage.getItem('pikiOraToken')) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const me = await api.get('me/')

        if (me.data.is_staff) {
          navigate('/admin-dashboard', { replace: true })
          return
        }

        const data = await fetchDashboardData()

        if (!ignore) {
          setSlots(data.slots)
          setAppointments(data.appointments)
          setLoading(false)
        }
      } catch (err) {
        // 401 means the token is missing, expired or the account was blocked.
        if (err.response?.status === 401) {
          logoutUser()
          navigate('/login', { replace: true })
        } else if (!ignore) {
          setError('Unable to load your dashboard. Please refresh the page.')
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      ignore = true
    }
  }, [navigate])

  // Reloads the data after booking, editing or cancelling.
  async function refresh() {
    try {
      const data = await fetchDashboardData()
      setSlots(data.slots)
      setAppointments(data.appointments)
    } catch (err) {
      if (err.response?.status === 401) {
        goToLogin()
      } else {
        setError('Unable to refresh your appointments. Please reload the page.')
      }
    }
  }

  async function handleBooking(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!selectedSlot) {
      setError('Please select an appointment slot.')
      return
    }

    try {
      const response = await api.post('appointments/', {
        slot: Number(selectedSlot),
        reason,
      })

      setMessage(`Your appointment is confirmed: ${describeSlot(response.data)}.`)
      setReason('')
      setSelectedSlot('')
      await refresh()
    } catch (err) {
      if (err.response?.status === 401) return goToLogin()
      setError(getErrorMessage(err, 'Unable to book this appointment. Please try another slot.'))
      await refresh()
    }
  }

  function startEdit(appointment) {
    setEditingId(appointment.id)
    setEditSlot(String(appointment.slot))
    setEditReason(appointment.reason || '')
    setMessage('')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditSlot('')
    setEditReason('')
  }

  async function saveEdit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const response = await api.patch(`appointments/${editingId}/`, {
        slot: Number(editSlot),
        reason: editReason,
      })

      setMessage(`Your appointment has been updated: ${describeSlot(response.data)}.`)
      cancelEdit()
      await refresh()
    } catch (err) {
      if (err.response?.status === 401) return goToLogin()
      setError(getErrorMessage(err, 'Unable to update this appointment.'))
      await refresh()
    }
  }

  async function handleCancel(appointment) {
    const confirmed = window.confirm(
      `Cancel your appointment with ${describeSlot(appointment)}?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await api.post(`appointments/${appointment.id}/cancel/`)
      setMessage('Your appointment has been cancelled.')
      await refresh()
    } catch (err) {
      if (err.response?.status === 401) return goToLogin()
      setError(getErrorMessage(err, 'Unable to cancel this appointment.'))
    }
  }

  if (loading) {
    return <main className="dashboard-page">Loading your dashboard...</main>
  }

  const upcoming = appointments.filter((appointment) => appointment.is_upcoming)
  const history = appointments
    .filter((appointment) => !appointment.is_upcoming)
    .reverse()

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/" className="dashboard-brand">
          ✚ Piki Ora Medical Centre
        </Link>

        <button onClick={goToLogin} className="logout-button">
          Log out
        </button>
      </header>

      <div className="dashboard-container">
        <section className="dashboard-welcome">
          <span className="eyebrow">PATIENT PORTAL</span>
          <h1>Welcome to your dashboard</h1>
          <p>Book and manage your appointments at Piki Ora Medical Centre.</p>
        </section>

        {message && <div className="dashboard-success">{message}</div>}
        {error && <div className="dashboard-error">{error}</div>}

        <section className="dashboard-section">
          <h2>Book an appointment</h2>
          <p>Select an available appointment time below.</p>

          <form onSubmit={handleBooking} className="booking-form">
            <label htmlFor="slot">Available appointment times</label>

            <select
              id="slot"
              value={selectedSlot}
              onChange={(event) => setSelectedSlot(event.target.value)}
              required
            >
              <option value="">Choose a time</option>

              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {describeSlot(slot)}
                </option>
              ))}
            </select>

            {slots.length === 0 && (
              <p>No appointment times are available at the moment.</p>
            )}

            <label htmlFor="reason">Reason for appointment (optional)</label>

            <textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Briefly describe the reason for your visit"
              rows="3"
            />

            <button type="submit" disabled={slots.length === 0}>
              Book appointment
            </button>
          </form>
        </section>

        <section className="dashboard-section">
          <h2>Upcoming appointments</h2>

          {upcoming.length === 0 ? (
            <p>You don't have any upcoming appointments.</p>
          ) : (
            <div className="appointment-list">
              {upcoming.map((appointment) => (
                <article className="appointment-item" key={appointment.id}>
                  {editingId === appointment.id ? (
                    <form onSubmit={saveEdit} className="booking-form" style={{ flex: 1, marginTop: 0 }}>
                      <label htmlFor={`edit-slot-${appointment.id}`}>Appointment time</label>

                      <select
                        id={`edit-slot-${appointment.id}`}
                        value={editSlot}
                        onChange={(event) => setEditSlot(event.target.value)}
                      >
                        <option value={appointment.slot}>
                          Keep current time: {describeSlot(appointment)}
                        </option>

                        {slots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {describeSlot(slot)}
                          </option>
                        ))}
                      </select>

                      <label htmlFor={`edit-reason-${appointment.id}`}>Reason for appointment (optional)</label>

                      <textarea
                        id={`edit-reason-${appointment.id}`}
                        value={editReason}
                        onChange={(event) => setEditReason(event.target.value)}
                        rows="3"
                      />

                      <div>
                        <button type="submit">Save changes</button>{' '}
                        <button type="button" onClick={cancelEdit} style={secondaryButtonStyle}>
                          Back
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div>
                        <h3>Dr. {appointment.doctor_name}</h3>
                        <p>
                          {appointment.doctor_specialty} · {formatDate(appointment.date)},{' '}
                          {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
                        </p>
                        <p>Reason: {appointment.reason || 'Not specified'}</p>
                        <span className="appointment-status">Confirmed</span>
                      </div>

                      <div>
                        <button style={editButtonStyle} onClick={() => startEdit(appointment)}>
                          Edit
                        </button>
                        <button className="cancel-button" onClick={() => handleCancel(appointment)}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>Past and cancelled appointments</h2>

          {history.length === 0 ? (
            <p>Nothing here yet.</p>
          ) : (
            <div className="appointment-list">
              {history.map((appointment) => (
                <article className="appointment-item" key={appointment.id}>
                  <div>
                    <h3>Dr. {appointment.doctor_name}</h3>
                    <p>
                      {appointment.doctor_specialty} · {formatDate(appointment.date)},{' '}
                      {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
                    </p>
                    <span className="appointment-status">
                      {appointment.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Dashboard