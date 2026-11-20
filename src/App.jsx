
import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:8000/api'

function App() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/doctors/`)
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load doctors')
        return response.json()
      })
      .then((data) => {
        setDoctors(data.results || data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="website">
      <header className="navbar">
        <a href="#home" className="brand">
          <span className="brand-icon">✚</span>
          <span>
            <strong>Piki Ora</strong>
            <small>MEDICAL CENTRE</small>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#services">Our Services</a>
          <a href="#doctors">Our Doctors</a>
          <a href="#about">About Us</a>
        </nav>

        <div className="nav-actions">
          <a href="/login" className="login-link">Log in</a>
          <a href="/appointments" className="nav-button">
            Book an Appointment
          </a>
        </div>
      </header>

      <main>
        <section className="hero hero-simple" id="home">
          <div className="hero-content">
            <span className="eyebrow">YOUR HEALTH, OUR PRIORITY</span>

            <h1>
              Better health
              <br />
              starts <span>with care.</span>
            </h1>

            <p>
              Welcome to Piki Ora Medical Centre. We're here to make
              healthcare accessible, comfortable and convenient for you.
            </p>

            <div className="hero-actions">
              <a href="/appointments" className="primary-button">
                Book an Appointment <span>→</span>
              </a>
              <a href="#services" className="secondary-button">
                Explore Our Services
              </a>
            </div>

            <div className="hero-note">
              <span className="note-icon">✓</span>
              Caring for our community, every day.
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div>
            <strong>Patient focused</strong>
            <span>Care that puts you first</span>
          </div>
          <div>
            <strong>Qualified doctors</strong>
            <span>Professional healthcare</span>
          </div>
          <div>
            <strong>Easy appointments</strong>
            <span>Simple online booking</span>
          </div>
        </section>

        <section className="services section" id="services">
          <div className="section-heading">
            <span className="eyebrow">HOW WE CAN HELP</span>
            <h2>Healthcare made <span>simple.</span></h2>
            <p>Find the support you need with our range of medical services.</p>
          </div>

          <div className="service-grid">
            <article className="service-card">
              <div className="service-icon">♡</div>
              <h3>General Consultation</h3>
              <p>
                Talk to a doctor about your health concerns and general
                medical needs.
              </p>
            </article>

            <article className="service-card">
              <div className="service-icon">✚</div>
              <h3>Preventive Care</h3>
              <p>
                Stay on top of your wellbeing with regular health checks
                and advice.
              </p>
            </article>

            <article className="service-card">
              <div className="service-icon">＋</div>
              <h3>Patient Support</h3>
              <p>
                Get the guidance and support you need throughout your
                healthcare journey.
              </p>
            </article>
          </div>
        </section>

        <section className="doctors section" id="doctors">
          <div className="section-heading">
            <span className="eyebrow">MEET OUR TEAM</span>
            <h2>Care from people <span>who care.</span></h2>
            <p>Meet the doctors at Piki Ora Medical Centre.</p>
          </div>

          {loading ? (
            <p className="doctor-message">Loading our doctors...</p>
          ) : doctors.length > 0 ? (
            <div className="doctor-grid">
              {doctors.map((doctor) => (
                <article className="doctor-card" key={doctor.id}>
                  <div className="doctor-avatar">✚</div>
                  <h3>{doctor.full_name}</h3>
                  <p>{doctor.specialty}</p>
                  <span className="doctor-status">
                    Available for enquiries
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="doctor-message">
              Our doctor directory is currently unavailable. Please try again
              later.
            </p>
          )}
        </section>

        <section className="appointment-banner" id="about">
          <div>
            <span className="eyebrow">TAKE THE NEXT STEP</span>
            <h2>Your health deserves attention.</h2>
            <p>
              Make your appointment online and take a positive step towards
              looking after yourself.
            </p>
          </div>

          <a href="/appointments" className="banner-button">
            Book an Appointment →
          </a>
        </section>
      </main>

      <footer className="footer">
        <a href="#home" className="brand footer-brand">
          <span className="brand-icon">✚</span>
          <span>
            <strong>Piki Ora</strong>
            <small>MEDICAL CENTRE</small>
          </span>
        </a>
        <p>© 2026 Piki Ora Medical Centre. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
