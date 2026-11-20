
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, logoutUser } from './api'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()

  const [slots, setSlots] = useState([])
  const [appointments, setAppointments] = useState([])
  const [reason, setReason] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadDashboard() {
    try {
      const [slotResponse, appointmentResponse] = await Promise.all([
        api.get('slots/'),
        api.get('appointments/'),
      ])

      setSlots(slotResponse.data.results || slotResponse.data)
      setAppointments(
        appointmentResponse.data.results || appointmentResponse.data
      )
    } catch (err) {
      setError('Unable to load your dashboard. Please log in again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('pikiOraToken')) {
      navigate('/login')
      return
    }

    loadDashboard()
  }, [])

  async function handleBooking(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!selectedSlot) {
      setError('Please select an appointment slot.')
      return
    }

    try {
      await api.post('appointments/', {
        slot: Number(selectedSlot),
        reason,
      })

      setMessage('Appointment booked successfully!')
      setReason('')
      setSelectedSlot('')
      await loadDashboard()
    } catch (err) {
      const data = err.response?.data
      setError(
        data?.slot?.[0] ||
        data?.detail ||
        'Unable to book this appointment. Please try another slot.'
      )
    }
  }

  async function handleCancel(id) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this appointment?'
    )

    if (!confirmed) return

    try {
      await api.post(`appointments/${id}/cancel/`)
      setMessage('Appointment cancelled successfully!')
      setError('')
      await loadDashboard()
    } catch (err) {
      setError('Unable to cancel this appointment.')
    }
  }

  function handleLogout() {
    logoutUser()
    navigate('/login')
  }

  if (loading) {
    return <main className="dashboard-page">Loading your dashboard...</main>
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/" className="dashboard-brand">
          ✚ Piki Ora Medical Centre
        </Link>

        <button onClick={handleLogout} className="logout-button">
          Log out
        </button>
      </header>

      <div className="dashboard-container">
        <section className="dashboard-welcome">
          <span className="eyebrow">PATIENT PORTAL</span>
          <h1>Welcome to your dashboard</h1>
          <p>Manage your appointments at Piki Ora Medical Centre.</p>
        </section>

        {message && <div className="dashboard-success">{message}</div>}
        {error && <div className="dashboard-error">{error}</div>}

        <section className="dashboard-section">
          <h2>Book an appointment</h2>
          <p>Select an available appointment slot below.</p>

          <form onSubmit={handleBooking} className="booking-form">
            <label htmlFor="slot">Available appointment slots</label>

            <select
              id="slot"
              value={selectedSlot}
              onChange={(event) => setSelectedSlot(event.target.value)}
              required
            >
              <option value="">Choose a slot</option>

              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.doctor_name} | {slot.date} | {slot.start_time} - {slot.end_time}
                </option>
              ))}
            </select>

            {slots.length === 0 && (
              <p>No appointment slots are currently available.</p>
            )}

            <label htmlFor="reason">Reason for appointment</label>

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
          <h2>My appointments</h2>

          {appointments.length === 0 ? (
            <p>You don't have any appointments yet.</p>
          ) : (
            <div className="appointment-list">
              {appointments.map((appointment) => (
                <article className="appointment-item" key={appointment.id}>
                  <div>
                    <h3>Appointment #{appointment.id}</h3>
                    <p>Slot ID: {appointment.slot}</p>
                    <p>Reason: {appointment.reason || 'Not specified'}</p>
                    <span className="appointment-status">
                      {appointment.status}
                    </span>
                  </div>

                  {appointment.status !== 'cancelled' && (
                    <button
                      className="cancel-button"
                      onClick={() => handleCancel(appointment.id)}
                    >
                      Cancel
                    </button>
                  )}
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
