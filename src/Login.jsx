
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, loginUser } from './api'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginUser(username, password)

      const response = await api.get('me/')
      const user = response.data

      if (user.is_staff) {
        navigate('/admin-dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      localStorage.removeItem('pikiOraToken')

      if (err.response?.status === 400) {
        setError('Incorrect username or password.')
      } else {
        setError('Unable to connect to the server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-back">
          ← Back to home
        </Link>

        <div className="auth-heading">
          <span className="eyebrow">PIKI ORA MEDICAL CENTRE</span>
          <h1>Welcome back</h1>
          <p>Log in to manage your medical appointments.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </section>
    </main>
  )
}

export default Login
