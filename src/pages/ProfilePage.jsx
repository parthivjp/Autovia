import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProfilePage.css'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  if (!user) {
    navigate('/login')
    return null
  }

  const bookings = JSON.parse(localStorage.getItem('autovia-bookings') || '[]')
    .filter((booking) => booking.userEmail === user.email)

  return (
    <div className="page-shell profile-page">
      <div className="profile-card profile-summary-card">
        <span className="eyebrow">Account profile</span>
        <h1>{user.name}</h1>
        <div className="profile-list">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.phone}</p>
          <p><strong>License:</strong> {user.drivingLicense}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => logout()}>Logout</button>
      </div>

      <div className="profile-card">
        <span className="eyebrow">My bookings</span>
        {bookings.length ? (
          <div className="booking-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="booking-item">
                <div>
                  <strong>{booking.car.name}</strong>
                  <p>{booking.id} · {booking.pickup} to {booking.returnDate}</p>
                </div>
                <div className="booking-meta">
                  <span className="status-tag">{booking.status}</span>
                  <strong>₹{Number(booking.total).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You have no bookings yet.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/cars')}>Browse cars</button>
          </div>
        )}
      </div>
    </div>
  )
}
