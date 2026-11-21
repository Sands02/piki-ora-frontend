import { Link } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div className="home">
      <header className="home-header">
        <Link to="/" className="home-brand">
          Piki Ora
        </Link>

        <nav className="home-nav" aria-label="Account">
          <Link to="/login" className="home-login">
            Log in
          </Link>
          <Link to="/register" className="home-register">
            Register
          </Link>
        </nav>
      </header>

      <main className="home-hero">
        <h1>Your doctor, booked online.</h1>
        <p>
          Piki Ora Medical Centre. Book, change or cancel appointments in a few
          clicks.
        </p>
        <Link to="/login" className="home-button">
          Book an appointment
        </Link>
      </main>
    </div>
  )
}

export default App