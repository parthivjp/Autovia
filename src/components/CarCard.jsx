import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'
import './CarCard.css'

export default function CarCard({ car }) {
  const { wishlist, toggleWishlist } = useWishlist()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const isSaved = wishlist.includes(car.id)
  const status = car.status.toLowerCase().replaceAll('-', ' ') === 'under service'
    ? car.status
    : car.nextBooking ? 'Booked' : car.status
  const availabilityStatus = status.toLowerCase().replaceAll('-', ' ')
  const handleWishlist = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      await toggleWishlist(car.id)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <article className="car-card">
      <div className="car-image-wrap">
        <img src={car.image} alt={car.name} loading="lazy" />
        <button type="button" className={`wishlist-toggle ${isSaved ? 'active' : ''}`} onClick={handleWishlist} aria-label={`Toggle wishlist for ${car.name}`}>
          <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
        {error && <span className="form-error" role="alert">{error}</span>}
      </div>

      <div className="car-body">
        <div className="car-topline">
          <div>
            <p className="car-category">{car.category}</p>
            <h3>{car.name}</h3>
          </div>
        </div>

        <p className="car-meta">{car.fuel} • {car.transmission} • {car.seats} seats</p>

        <div className="car-price-row">
          <strong>₹{car.pricePerDay.toLocaleString('en-IN')}</strong>
          <span>/ day</span>
        </div>

        <div className="car-footer">
          <span
            className={`availability-tag${availabilityStatus === 'under service' || availabilityStatus === 'booked' ? ' unavailable' : ''}`}
            title={car.nextBooking ? `Reserved ${car.nextBooking.pickupDate} to ${car.nextBooking.returnDate}` : undefined}
          >
            {status}
          </span>
          <Link to={`/cars/${car.id}`} className="btn btn-primary small">View Details</Link>
        </div>
      </div>
    </article>
  )
}
