import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, user } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', drivingLicense: '' })
  const [licenseFile, setLicenseFile] = useState(null)
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/profile" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.name || !form.email || !form.phone || !form.password || !form.drivingLicense || !licenseFile) {
      setError('Please complete all fields and select a driving licence image.')
      return
    }

    setError('')
    try {
      if (licenseFile.size > 3 * 1024 * 1024) {
        setError('Driving licence file must be smaller than 3 MB.')
        return
      }
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Unable to read the licence file.'))
        reader.readAsDataURL(licenseFile)
      })
      await register({
        ...form,
        drivingLicenseDocument: {
          filename: licenseFile.name,
          mimeType: licenseFile.type,
          data,
        },
      })
      navigate('/profile')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <AuthLayout
      variant="register"
      eyebrow="Join Autovia"
      title="Create your account"
      description="A few details now, then you’re ready to choose your next drive."
      footer={(
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
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
            onChange={(event) => setLicenseFile(event.target.files?.[0] || null)}
            required
          />
          {licenseFile && <span>{licenseFile.name}</span>}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          aria-label="Password"
          minLength={8}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Create password"
          required
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary">Create account</button>
        <p className="auth-register-note">Your licence document is stored with your customer profile.</p>
      </form>
    </AuthLayout>
  )
}
