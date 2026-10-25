import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ChevronDown, Gauge, MapPin, Users } from 'lucide-react'
import { useCars } from '../context/useCars'
import { apiRequest } from '../services/api'
import './CarDetailsPage.css'

export default function CarDetailsPage() {
  const { carId } = useParams()
  const navigate = useNavigate()
  const { cars, loading, error } = useCars()
  const car = cars.find((item) => item.id === carId)
  const [imageSelection, setImageSelection] = useState({ carId: '', source: '' })
  const [availability, setAvailability] = useState([])
  const [availabilityError, setAvailabilityError] = useState('')
  const [siteLocations, setSiteLocations] = useState([])
  const [locationsError, setLocationsError] = useState('')
  const [locationsExpanded, setLocationsExpanded] = useState(false)

  useEffect(() => {
    let active = true
    apiRequest('/api/v1/site')
      .then(({ locations }) => {
        if (active) setSiteLocations(locations)
      })
      .catch((requestError) => {
        if (active) setLocationsError(requestError.message)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!carId) return undefined
    const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + 13)
    let active = true
    apiRequest(`/api/v1/bookings/availability/${carId}?from=${dateKey(from)}&to=${dateKey(to)}`)
      .then(({ availability: dates }) => {
        if (active) setAvailability(dates)
      })
      .catch((requestError) => {
        if (active) setAvailabilityError(requestError.message)
      })
    return () => { active = false }
  }, [carId])

  const selectedImage = imageSelection.carId === carId ? imageSelection.source : car?.image
  const carUnavailable = ['under service', 'booked'].includes(car?.status?.toLowerCase().replaceAll('-', ' '))

  if (loading) return <div className="page-shell"><div className="empty-state">Loading car details…</div></div>
  if (error) return <div className="page-shell"><div className="empty-state" role="alert">Unable to load car details: {error}</div></div>
  if (!car) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <p>This car is no longer available.</p>
          <Link to="/cars" className="btn btn-primary">Browse cars</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell detail-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="detail-layout">
        <div className="detail-media">
          <img src={selectedImage || car.image} alt={car.name} />
          {car.images.length > 1 && (
            <div className="detail-image-thumbnails">
              {car.images.map((image) => (
                <button type="button" key={image} onClick={() => setImageSelection({ carId, source: image })} aria-label={`View ${car.name} image`}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-summary">
          <span className="eyebrow">{car.category}</span>
          <h1>{car.name}</h1>
          <div className="detail-price-row">
            <strong>₹{car.pricePerDay.toLocaleString('en-IN')}</strong>
            <span>/ day</span>
          </div>

          <div className="spec-grid">
            <div><Users size={18} /> <span>{car.seats} seats</span></div>
            <div><Gauge size={18} /> <span>{car.fuel}</span></div>
            <div><CalendarDays size={18} /> <span>{car.year}</span></div>
            <div><Gauge size={18} /> <span>{car.transmission}</span></div>
            <div><MapPin size={18} /> <span>{car.freeKm} free km/day</span></div>
          </div>

          {car.description && <p className="detail-description">{car.description}</p>}

          <div className="pickup-locations">
            <div className="pickup-locations-heading">
              <div>
                <h2>Pickup locations</h2>
                {siteLocations.length > 0 && <p>Choose from {siteLocations.length} convenient locations</p>}
              </div>
              {siteLocations.length > 3 && (
                <button
                  type="button"
                  className="pickup-locations-toggle"
                  aria-expanded={locationsExpanded}
                  aria-controls="pickup-location-list"
                  onClick={() => setLocationsExpanded((expanded) => !expanded)}
                >
                  {locationsExpanded ? 'Show less' : 'View all'}
                  <ChevronDown size={15} className={locationsExpanded ? 'is-expanded' : ''} />
                </button>
              )}
            </div>
            {locationsError ? (
              <p role="alert">Unable to load pickup locations: {locationsError}</p>
            ) : siteLocations.length ? (
              <div id="pickup-location-list" className={`pickup-location-list${locationsExpanded ? ' is-expanded' : ''}`}>
                {(locationsExpanded ? siteLocations : siteLocations.slice(0, 3)).map((location) => (
                  <span className="pickup-location-chip" key={location.id}>
                    <MapPin size={14} /> {location.name}
                  </span>
                ))}
              </div>
            ) : <p>No pickup locations are currently available.</p>}
          </div>

          <div className="detail-actions">
            {carUnavailable
              ? <button type="button" className="btn btn-unavailable" disabled>{car.status === 'Booked' ? 'Currently booked' : 'Under service'}</button>
              : <Link to={`/booking/${car.id}`} className="btn btn-primary">Book this car</Link>}
            <Link to="/cars" className="btn btn-secondary">View all cars</Link>
          </div>
        </div>
      </div>

      <section className="availability-calendar" aria-label={`${car.name} availability calendar`}>
        <div className="availability-heading">
          <div>
            <span className="eyebrow">Plan your trip</span>
            <h2>Availability for the next 14 days</h2>
          </div>
          <div className="availability-legend">
            <span><i className="available-dot" /> Available</span>
            <span><i className="booked-dot" /> Booked</span>
            <span><i className="service-dot" /> Under Service</span>
          </div>
        </div>
        <div className="availability-days">
          {availability.map(({ date, status }) => {
            const day = new Date(`${date}T00:00:00`)
            return (
              <div className={`availability-day ${status.toLowerCase().replaceAll(' ', '-')}`} key={date}>
                <strong>{day.toLocaleDateString('en-IN', { weekday: 'short' })}</strong>
                <span>{day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <small>{status}</small>
              </div>
            )
          })}
          {availabilityError && <div className="empty-state" role="alert">Unable to load availability: {availabilityError}</div>}
        </div>
      </section>
    </div>
  )
}
