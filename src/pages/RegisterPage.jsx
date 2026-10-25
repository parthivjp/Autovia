import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, user } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', drivingLicense: '' })
  const [licenseFileName, setLicenseFileName] = useState('')
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/profile" replace />
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.name || !form.email || !form.phone || !form.password || !form.drivingLicense || !licenseFileName) {
      setError('Please complete all fields and select a driving licence image.')
      return
    }

    register(form)
    navigate('/profile')
  }

  return (
    <AuthLayout
      variant="register"
      eyebrow="Join Autovia"
      title="Create your account"
      description="A few details now, then you’re ready to choose your next drive."
      footer={(
        <p className="auth-switch">
          Already a member? <Link to="/login">Login</Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          autoComplete="name"
          aria-label="Full name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Full name"
          required
        />
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
          type="tel"
          autoComplete="tel"
          aria-label="Phone number"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder="Phone number"
          required
        />
        <input
          aria-label="Driving licence number"
          value={form.drivingLicense}
          onChange={(event) => setForm({ ...form, drivingLicense: event.target.value })}
          placeholder="Driving licence number"
          required
        />
        <label className="license-upload">
          Driving licence image
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => setLicenseFileName(event.target.files?.[0]?.name || '')}
            required
          />
          {licenseFileName && <span>{licenseFileName}</span>}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          aria-label="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Create password"
          required
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary">Create account</button>
        <p className="auth-register-note">Licence files are not uploaded in this demo.</p>
      </form>
    </AuthLayout>
  )
}
