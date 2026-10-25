import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/api'
import './ProfilePage.css'

export default function ProfilePage() {
  const { user, saveProfile } = useAuth()
  const [profile, setProfile] = useState(user)
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    drivingLicense: user?.drivingLicense || '',
  })
  const [licenseFile, setLicenseFile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return undefined
    let active = true
    Promise.all([
      apiRequest('/api/v1/profile/me'),
      apiRequest('/api/v1/bookings/mine'),
    ])
      .then(([profileResult, bookingsResult]) => {
        if (!active) return
        setProfile(profileResult.user)
        setForm({
          name: profileResult.user.name || '',
          phone: profileResult.user.phone || '',
          drivingLicense: profileResult.user.drivingLicense || '',
        })
        setBookings(bookingsResult.bookings)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setSaveError('')
    setSaved(false)
    try {
      const updates = { ...form }
      if (licenseFile) {
        if (licenseFile.size > 3 * 1024 * 1024) {
          setSaveError('Driving licence file must be smaller than 3 MB.')
          return
        }
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Unable to read the licence file.'))
          reader.readAsDataURL(licenseFile)
        })
        updates.drivingLicenseDocument = {
          filename: licenseFile.name,
          mimeType: licenseFile.type,
          data,
        }
      }
      const updatedProfile = await saveProfile(updates)
      setProfile(updatedProfile)
      setLicenseFile(null)
      setSaved(true)
    } catch (requestError) {
      setSaveError(requestError.message)
    }
  }

  return (
    <div className="page-shell profile-page">
      <div className="profile-card profile-summary-card">
        <span className="eyebrow">Account profile</span>
        <h1>{profile?.name || user.name}</h1>
        <div className="profile-list">
          <p><strong>Email:</strong> {profile?.email || user.email}</p>
          <p><strong>Phone:</strong> {profile?.phone || 'Not provided'}</p>
          <p><strong>Licence:</strong> {profile?.drivingLicense || 'Not provided'}</p>
          <p><strong>Licence document:</strong> {profile?.drivingLicenseDocument?.filename || 'Not uploaded'}</p>
        </div>
        <form className="booking-form" onSubmit={handleSaveProfile}>
          <label>Full name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>Phone number
            <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label>Driving licence number
            <input value={form.drivingLicense} onChange={(event) => setForm({ ...form, drivingLicense: event.target.value })} />
          </label>
          <label>Replace licence document
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setLicenseFile(event.target.files?.[0] || null)} />
          </label>
          {saveError && <p className="form-error" role="alert">{saveError}</p>}
          {saved && <p role="status">Profile updated.</p>}
          <button type="submit" className="btn btn-secondary">Save profile</button>
        </form>
      </div>

      <div className="profile-card">
        <span className="eyebrow">My bookings</span>
        {loading ? (
          <div className="empty-state">Loading your bookings…</div>
        ) : error ? (
          <div className="empty-state" role="alert">Unable to load your bookings: {error}</div>
        ) : bookings.length ? (
          <div className="booking-list">
            {bookings.map((booking) => (
              <Link to={`/confirmation/${booking.id}`} key={booking.id} className="booking-item">
                <div>
                  <strong>{booking.car.name}</strong>
                  <p>{booking.id} · {booking.pickup} to {booking.returnDate}</p>
                </div>
                <div className="booking-meta">
                  <span className="status-tag">{booking.status}</span>
                  <strong>₹{Number(booking.total).toLocaleString('en-IN')}</strong>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You have no bookings yet.</p>
            <Link to="/cars" className="btn btn-primary">Browse cars</Link>
          </div>
        )}
      </div>
    </div>
  )
}
