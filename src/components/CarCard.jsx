import { Link } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import { useWishlist } from '../context/WishlistContext'
import './CarCard.css'

export default function CarCard({ car }) {
  const { wishlist, toggleWishlist } = useWishlist()
  const isSaved = wishlist.includes(car.id)

  return (
    <article className="car-card">
      <div className="car-image-wrap">
        <img src={car.image} alt={car.name} loading="lazy" />
        <button type="button" className={`wishlist-toggle ${isSaved ? 'active' : ''}`} onClick={() => toggleWishlist(car.id)} aria-label={`Toggle wishlist for ${car.name}`}>
          <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="car-body">
        <div className="car-topline">
          <div>
            <p className="car-category">{car.category}</p>
            <h3>{car.name}</h3>
          </div>
          <span className="rating-badge"><Star size={12} /> 4.8</span>
        </div>

        <p className="car-meta">{car.fuel} • {car.transmission} • {car.seats} seats</p>

        <div className="car-price-row">
          <strong>₹{car.pricePerDay.toLocaleString('en-IN')}</strong>
          <span>/ day</span>
        </div>

        <div className="car-footer">
          <span className="availability-tag">{car.status}</span>
          <Link to={`/cars/${car.id}`} className="btn btn-primary small">View Details</Link>
        </div>
      </div>
    </article>
  )
}
