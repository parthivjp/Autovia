import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarCheck2,
  CarFront,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './AdminPage.css'

export default function AdminLoginPage() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (user?.role === 'admin') return <Navigate to="/admin" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const authenticatedUser = await login(form)
      if (authenticatedUser.role !== 'admin') {
        logout()
        setError('This account does not have administrator access.')
        return
      }
      navigate('/admin', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-panel">
        <div className="admin-login-card">
          <a href="/" className="admin-login-brand">
            <span><CarFront size={21} /></span>
            <strong>Autovia <small>ADMIN</small></strong>
          </a>
          <div className="admin-login-heading">
            <div className="admin-login-icon"><ShieldCheck size={21} /></div>
            <span className="eyebrow">ADMINISTRATOR ACCESS</span>
            <h1>Welcome back</h1>
            <p>Sign in to manage your fleet, bookings, and business in one place.</p>
          </div>
          {user && (
            <div className="admin-account-switch">
              You’re currently signed in as {user.email}. Enter your administrator credentials below to switch accounts.
            </div>
          )}
          <form className="admin-form admin-login-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              Email address
              <input
                type="email"
                autoComplete="username"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@company.com"
                required
              />
            </label>
            <label className="admin-field">
              Password
              <span className="admin-password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Enter your password"
                  required
                />
                <button
                  className="admin-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {error && <p className="admin-alert error" role="alert">{error}</p>}
            <button className="admin-button primary full admin-login-submit" type="submit" disabled={saving}>
              {saving ? 'Checking access…' : 'Sign in securely'}
              {!saving && <ArrowUpRight size={17} />}
            </button>
          </form>
          <div className="admin-login-footer">
            <a className="admin-login-back" href="/">← Back to customer website</a>
            <span><ShieldCheck size={14} /> Secure administrator sign-in</span>
          </div>
        </div>
      </section>

      <section className="admin-login-visual" aria-label="Autovia fleet management preview">
        <div className="admin-visual-orbit admin-visual-orbit-one" />
        <div className="admin-visual-orbit admin-visual-orbit-two" />
        <div className="admin-visual-content">
          <div className="admin-visual-topline">
            <a href="/" className="admin-visual-brand">
              <span><CarFront size={18} /></span>
              AUTOVIA
            </a>
            <span className="admin-visual-status"><i /> FLEET OPERATIONS</span>
          </div>
          <div className="admin-visual-copy">
            <span className="admin-visual-kicker">YOUR BUSINESS, IN MOTION</span>
            <h2>Every journey.<br />Under control.</h2>
            <p>One clear view of your cars, bookings, and the people behind every trip.</p>
          </div>

          <div className="admin-visual-dashboard">
            <div className="admin-visual-dashboard-top">
              <div className="admin-visual-dashboard-title">
                <span><LayoutDashboard size={16} /></span>
                <div><strong>Fleet overview</strong><small>Business dashboard</small></div>
              </div>
              <span className="admin-visual-live"><i /> LIVE</span>
            </div>
            <div className="admin-visual-stats">
              <div className="admin-visual-stat">
                <span>ACTIVE FLEET</span>
                <strong>24 <small>cars</small></strong>
                <em><ChartNoAxesCombined size={12} /> Fleet at a glance</em>
              </div>
              <div className="admin-visual-stat">
                <span>TODAY’S TRIPS</span>
                <strong>08 <small>bookings</small></strong>
                <em><CalendarCheck2 size={12} /> Ready to go</em>
              </div>
            </div>
            <div className="admin-visual-route-card">
              <div className="admin-visual-route-heading">
                <div><span className="admin-visual-route-icon"><MapPin size={14} /></span><strong>On the road</strong></div>
                <span>BHARUCH · GUJARAT</span>
              </div>
              <div className="admin-visual-route">
                <span className="admin-route-node start"><MapPin size={14} /></span>
                <span className="admin-route-line"><i /></span>
                <span className="admin-route-car"><CarFront size={20} /></span>
                <span className="admin-route-node end"><MapPin size={14} /></span>
              </div>
              <div className="admin-visual-route-foot"><span>Fleet tracked</span><strong>All systems running</strong></div>
            </div>
          </div>

          <div className="admin-visual-caption">
            <span className="admin-visual-caption-mark"><ShieldCheck size={18} /></span>
            <div><strong>Built for the people who keep you moving.</strong><span>Smart tools for smoother rentals.</span></div>
          </div>
        </div>
      </section>
    </main>
  )
}
