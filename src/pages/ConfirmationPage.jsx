import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../services/api'
import './ConfirmationPage.css'

export default function ConfirmationPage() {
  const { user } = useAuth()
  const { bookingId } = useParams()
  const location = useLocation()
  const [requestResult, setRequestResult] = useState(null)
  const [retry, setRetry] = useState(0)
  const requestKey = `${bookingId}:${retry}`
  const currentResult = requestResult?.key === requestKey ? requestResult : null

  useEffect(() => {
    if (!user || !bookingId) return undefined
    let active = true
    apiRequest(`/api/v1/bookings/mine/${bookingId}`)
      .then(({ booking: savedBooking }) => {
        if (active) setRequestResult({ key: requestKey, booking: savedBooking, hasError: false })
      })
      .catch(() => {
        if (active) setRequestResult({ key: requestKey, booking: null, hasError: true })
      })
    return () => { active = false }
  }, [bookingId, requestKey, retry, user])

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const loading = !currentResult
  const booking = currentResult?.booking
  const hasError = currentResult?.hasError

  if (loading) {
    return <div className="page-shell confirmation-page"><div className="confirmation-card">Loading your booking…</div></div>
  }

  if (!booking) {
    return (
      <div className="page-shell confirmation-page">
        <div className="confirmation-card unavailable-state">
          <span className="eyebrow">Booking unavailable</span>
          <h1>{hasError ? 'We could not load this reservation' : 'Reservation not found'}</h1>
          <p role={hasError ? 'alert' : undefined}>
            This reservation is unavailable for this account. Sign in with the account used to make the booking, or check your bookings.
          </p>
          <div className="confirmation-actions">
            <Link to="/profile" className="btn btn-primary">View bookings</Link>
            {hasError && <button type="button" className="btn btn-secondary" onClick={() => setRetry((current) => current + 1)}>Try again</button>}
            <Link to="/cars" className="btn btn-secondary">Browse cars</Link>
          </div>
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
