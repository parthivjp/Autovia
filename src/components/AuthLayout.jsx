import { CarFront } from 'lucide-react'
import { demoCars } from '../data/demoCars'
import './AuthLayout.css'

const featuredCar = demoCars.find((car) => car.id === 'hyundai-creta') || demoCars[0]

export default function AuthLayout({ eyebrow, title, description, footer, children, variant = 'login' }) {
  return (
    <section className={`auth-split auth-split--${variant}`}>
      <div className="auth-form-panel">
        <div className="auth-content">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          {footer}
        </div>
      </div>

      <aside className="auth-visual" aria-label="Featured rental car">
        <img className="auth-visual-image" src={featuredCar.image} alt={featuredCar.name} />
        <div className="auth-visual-shade" />
        <div className="auth-visual-content">
          <div className="auth-visual-copy">
            <span className="auth-visual-kicker"><CarFront size={15} /> YOUR NEXT JOURNEY</span>
            <h2>Find your kind of drive.</h2>
            <p>Pick a car, choose your dates, and make the road yours.</p>
          </div>
          <div className="auth-featured-car">
            <span className="auth-featured-label">FEATURED CAR</span>
            <strong>{featuredCar.name}</strong>
            <span>{featuredCar.category} <i /> {featuredCar.transmission}</span>
          </div>
        </div>
      </aside>
    </section>
  )
}
