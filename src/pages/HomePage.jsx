import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Star } from 'lucide-react'
import { carCategories, demoBenefits, demoSteps } from '../data/demoCars'
import { useCars } from '../context/useCars'
import './HomePage.css'

export default function HomePage() {
  const location = useLocation()
  const { cars, loading, error } = useCars()
  const featuredCars = (cars.some((car) => car.featured) ? cars.filter((car) => car.featured) : cars).slice(0, 3)

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.hash])

  return (
    <>
      <section className="hero-banner">
        <div className="hero-overlay">
          <span className="hero-label">Premium self-drive</span>
          <h1>Drive the freedom you deserve.</h1>
          <p>
            Premium cars, transparent pricing, and effortless pickup across India for every trip, from city drives to weekend escapes.
          </p>
          <div className="hero-actions">
            <Link to="/cars" className="btn btn-primary">Explore cars</Link>
            <Link to="/login" className="btn btn-secondary">Book now</Link>
          </div>
          <div className="hero-meta">
            <div>
              <strong>14k+</strong>
              <span>happy journeys</span>
            </div>
            <div>
              <strong>4.9/5</strong>
              <span>average rating</span>
            </div>
            <div>
              <strong>50+</strong>
              <span>pickup locations</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-offset" id="categories">
        <div className="section-heading">
          <span className="eyebrow">Popular categories</span>
          <h2>Choose the right ride for the road ahead</h2>
        </div>
        <div className="category-grid">
          {carCategories.map((category) => (
            <Link to={`/cars?category=${category.id}`} key={category.id} className="category-card">
              <img src={category.image} alt={category.label} />
              <div className="category-card__content">
                <h3>{category.label}</h3>
                <span>View fleet <ArrowRight size={16} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Featured fleet</span>
          <h2>Trending drives this week</h2>
        </div>
        <div className="card-grid">
          {loading ? (
            <div className="empty-state">Loading featured cars…</div>
          ) : error ? (
            <div className="empty-state" role="alert">Unable to load featured cars: {error}</div>
          ) : featuredCars.length ? featuredCars.map((car) => (
            <article key={car.id} className="car-card-home">
              <img src={car.image} alt={car.name} />
              <div className="car-card-home__body">
                <div className="car-card-home__topline">
                  <div>
                    <p>{car.category}</p>
                    <h3>{car.name}</h3>
                  </div>
                  <span className="rating-chip"><Star size={12} /> 4.8</span>
                </div>
                <p className="car-card-home__meta">{car.fuel} • {car.transmission} • {car.seats} seats</p>
                <div className="price-row">
                  <strong>₹{car.pricePerDay.toLocaleString('en-IN')}</strong>
                  <span>/day</span>
                </div>
                <div className="card-actions">
                  <Link to={`/cars/${car.id}`} className="btn btn-secondary">Details</Link>
                  <Link to={`/booking/${car.id}`} className="btn btn-primary">Book now</Link>
                </div>
              </div>
            </article>
          )) : <div className="empty-state">No featured cars are available yet.</div>}
        </div>
      </section>

      <section className="section benefits-section">
        <div className="section-heading center">
          <span className="eyebrow">Why customers choose us</span>
          <h2>Everything you need for a smooth rental</h2>
        </div>
        <div className="benefits-grid">
          {demoBenefits.map((benefit) => (
            <div key={benefit.title} className="benefit-card">
              <div className="benefit-card__icon"><ShieldCheck size={18} /></div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="section-heading center">
          <span className="eyebrow">How it works</span>
          <h2>Simple steps from booking to drive</h2>
        </div>
        <div className="steps-grid">
          {demoSteps.map((step, index) => (
            <div key={step.title} className="step-card">
              <span className="step-count">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section cta-panel">
        <div>
          <span className="eyebrow">Ready to travel?</span>
          <h2>Book your premium ride in minutes.</h2>
        </div>
        <Link to="/cars" className="btn btn-primary">Browse fleet</Link>
      </section>
    </>
  )
}
