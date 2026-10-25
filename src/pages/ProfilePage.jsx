import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/api'
import { subscribeToSiteUpdates } from '../services/siteUpdates'
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
    const refreshBookings = () => {
      apiRequest('/api/v1/bookings/mine')
        .then(({ bookings: result }) => { if (active) setBookings(result) })
        .catch((requestError) => { if (active) setError(requestError.message) })
    }
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
    const unsubscribe = subscribeToSiteUpdates(refreshBookings)
    return () => {
      active = false
      unsubscribe()
    }
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
        <div className="profile-heading">
          <div>
            <span className="eyebrow">Account profile</span>
            <h1>{profile?.name || user.name}</h1>
          </div>
          <span className="profile-avatar" aria-hidden="true">
            {(profile?.name || user.name || 'A').trim().charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="profile-list">
          <div className="profile-detail">
            <span>Email address</span>
            <strong>{profile?.email || user.email}</strong>
          </div>
          <div className="profile-detail">
            <span>Phone number</span>
            <strong>{profile?.phone || 'Not provided'}</strong>
          </div>
          <div className="profile-detail">
            <span>Driving licence</span>
            <strong>{profile?.drivingLicense || 'Not provided'}</strong>
          </div>
          <div className="profile-detail profile-document">
            <span>Licence document</span>
            <strong>{profile?.drivingLicenseDocument?.filename || 'Not uploaded'}</strong>
          </div>
        </div>
        <form className="profile-form" onSubmit={handleSaveProfile}>
          <div className="profile-form-heading">
            <h2>Personal details</h2>
            <p>Keep your contact and licence information up to date.</p>
          </div>
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
          {saved && <p className="profile-success" role="status">Profile updated successfully.</p>}
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
      </div>

      <div className="profile-card">
        <div className="profile-bookings-heading">
          <div>
            <span className="eyebrow">Your trips</span>
            <h2>My bookings</h2>
          </div>
          {!loading && !error && bookings.length > 0 && (
            <span className="booking-count">{bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}</span>
          )}
        </div>
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
            <span className="empty-state-icon" aria-hidden="true">↗</span>
            <h3>No trips booked yet</h3>
            <p>Your bookings will show up here once you reserve a car.</p>
            <Link to="/cars" className="btn btn-primary">Browse cars</Link>
          </div>
        )}
      </div>
    </div>
  )
}
