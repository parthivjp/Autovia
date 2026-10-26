import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const requestedPath = location.state?.from
  const returnTo = typeof requestedPath === 'string'
    && requestedPath.startsWith('/')
    && !requestedPath.startsWith('//')
    ? requestedPath
    : '/profile'

  if (user) {
    return <Navigate to={returnTo} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await login(form)
      navigate(returnTo, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Login to your account"
      description="Sign in to manage your bookings and get back on the road."
      footer={(
        <p className="auth-switch">
          Don’t have an account? <Link to="/register">Sign up</Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          autoComplete="email"
          aria-label="Email address"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="Email address"
          required
        />
        <input
          type="password"
          autoComplete="current-password"
          aria-label="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Password"
          required
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </AuthLayout>
  )
}
