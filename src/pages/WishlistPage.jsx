import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useWishlist } from '../context/WishlistContext'
import { useCars } from '../context/useCars'
import './WishlistPage.css'

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useWishlist()
  const { cars, loading, error } = useCars()
  const savedCars = cars.filter((car) => wishlist.includes(car.id))

  return (
    <div className="page-shell">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">Saved rides</span>
          <h1 className="page-title">Your wishlist</h1>
        </div>
        <div className="results-pill">{savedCars.length} saved</div>
      </div>

      {loading ? (
        <div className="empty-state">Loading saved cars…</div>
      ) : error ? (
        <div className="empty-state" role="alert">Unable to load saved cars: {error}</div>
      ) : savedCars.length === 0 ? (
        <div className="empty-state">
          <Heart size={20} />
          <p>Your wishlist is empty. Save vehicles you like and compare them later.</p>
          <Link to="/cars" className="btn btn-primary">Browse cars</Link>
        </div>
      ) : (
        <div className="cars-grid">
          {savedCars.map((car) => (
            <article key={car.id} className="car-card">
              <img src={car.image} alt={car.name} className="wishlist-image" />
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
                  <button type="button" className="btn btn-secondary" onClick={() => toggleWishlist(car.id)}>Remove</button>
                  <Link to={`/booking/${car.id}`} className="btn btn-primary">Book</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
