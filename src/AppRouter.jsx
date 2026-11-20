
import { Routes, Route, Navigate } from 'react-router-dom'

import App from './App'
import Register from './Register'
import Login from './Login'
import Dashboard from './Dashboard'
import AdminDashboard from './AdminDashboard'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRouter
