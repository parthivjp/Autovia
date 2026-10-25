import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Gauge, MapPin, ShieldCheck, Users } from 'lucide-react'
import { demoCars } from '../data/demoCars'
import './CarDetailsPage.css'

export default function CarDetailsPage() {
  const { carId } = useParams()
  const navigate = useNavigate()
  const car = demoCars.find((item) => item.id === carId) || demoCars[0]
  const [calendarDays] = useState(() => Array.from({ length: 14 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)
    return { date, status: car.availableDates[index % car.availableDates.length] }
  }))

  return (
    <div className="page-shell detail-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="detail-layout">
        <div className="detail-media">
          <img src={car.image} alt={car.name} />
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

          <p className="detail-description">
            Enjoy a premium {car.category.toLowerCase()} experience with smooth performance, generous luggage space, and a comfortable interior built for long drives and city mobility.
          </p>

          <ul className="feature-list">
            <li><ShieldCheck size={16} /> Free cancellation up to 24 hours before pickup</li>
            <li><ShieldCheck size={16} /> Roadside assistance and 24/7 support</li>
            <li><ShieldCheck size={16} /> Unlimited local support with document assistance</li>
          </ul>

          <div className="pickup-locations">
            <h2>Pickup locations</h2>
            {car.pickupLocations.map((location) => (
              <span key={location}><MapPin size={15} /> {location}</span>
            ))}
          </div>

          <div className="detail-actions">
            <Link to={`/booking/${car.id}`} className="btn btn-primary">Book this car</Link>
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
          {calendarDays.map(({ date, status }) => (
            <div className={`availability-day ${status.toLowerCase().replaceAll(' ', '-')}`} key={date.toISOString()}>
              <strong>{date.toLocaleDateString('en-IN', { weekday: 'short' })}</strong>
              <span>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <small>{status}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
