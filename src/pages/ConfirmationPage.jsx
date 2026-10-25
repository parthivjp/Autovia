import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { apiRequest } from '../services/api'
import './ConfirmationPage.css'

export default function ConfirmationPage() {
  const { bookingId } = useParams()
  const location = useLocation()
  const [booking, setBooking] = useState(location.state?.booking || null)
  const [loading, setLoading] = useState(!location.state?.booking)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingId || booking) return undefined
    let active = true
    apiRequest(`/api/v1/bookings/mine/${bookingId}`)
      .then(({ booking: savedBooking }) => {
        if (active) setBooking(savedBooking)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [bookingId, booking])

  if (loading) {
    return <div className="page-shell confirmation-page"><div className="confirmation-card">Loading your booking…</div></div>
  }

  if (!booking) {
    return (
      <div className="page-shell confirmation-page">
        <div className="confirmation-card">
          <span className="eyebrow">Booking unavailable</span>
          <h1>We could not load this reservation</h1>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Link to="/profile" className="btn btn-primary">View bookings</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell confirmation-page">
      <div className="confirmation-card success-state">
        <span className="eyebrow">Reservation {booking.status}</span>
        <h1>Booking placed!</h1>
        <p>Your reservation for <strong>{booking.car.name}</strong> has been saved successfully.</p>
        <div className="confirmation-grid">
          <div><span>Booking ID</span><strong>{booking.id}</strong></div>
          <div><span>Pickup</span><strong>{booking.pickup} {booking.pickupTime || ''}</strong></div>
          <div><span>Return</span><strong>{booking.returnDate} {booking.returnTime || ''}</strong></div>
          <div><span>Pickup location</span><strong>{booking.location}</strong></div>
          <div><span>Return location</span><strong>{booking.returnLocation || booking.location}</strong></div>
          <div><span>Payment</span><strong>{booking.paymentMethod || 'Pay at Pickup'}</strong></div>
          <div><span>Total</span><strong>₹{Number(booking.total).toLocaleString('en-IN')}</strong></div>
          {booking.deposit > 0 && (
            <div><span>Security deposit (separate)</span><strong>₹{Number(booking.deposit).toLocaleString('en-IN')}</strong></div>
          )}
        </div>
        <Link to="/profile" className="btn btn-primary">View profile</Link>
      </div>
    </div>
  )
}
