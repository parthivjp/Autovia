import { Link } from 'react-router-dom'
import './ConfirmationPage.css'

export default function ConfirmationPage() {
  const booking = JSON.parse(localStorage.getItem('autovia-last-booking') || 'null')

  if (!booking) {
    return (
      <div className="page-shell confirmation-page">
        <div className="confirmation-card">
          <span className="eyebrow">No booking yet</span>
          <h1>No active reservation found</h1>
          <Link to="/cars" className="btn btn-primary">Browse cars</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell confirmation-page">
      <div className="confirmation-card success-state">
        <span className="eyebrow">Confirmed</span>
        <h1>Booking confirmed!</h1>
        <p>Your reservation for <strong>{booking.car.name}</strong> has been placed successfully.</p>
        <div className="confirmation-grid">
          <div><span>Booking ID</span><strong>{booking.id || booking.bookingId}</strong></div>
          <div><span>Pickup</span><strong>{booking.pickup} {booking.pickupTime || ''}</strong></div>
          <div><span>Return</span><strong>{booking.returnDate} {booking.returnTime || ''}</strong></div>
          <div><span>Location</span><strong>{booking.location}</strong></div>
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
