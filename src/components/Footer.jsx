import { ArrowUpRight, CarFront } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSiteContent } from '../hooks/useSiteContent'
import './Footer.css'

const currentYear = new Date().getFullYear()

export default function Footer() {
  const { data, error: settingsError } = useSiteContent()
  const settings = data.settings

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo" aria-label={`${settings.businessName || 'Autovia'} home`}>
            <span className="footer-brand-mark"><CarFront size={18} /></span>
            <span>{settings.businessName || 'Autovia'}</span>
          </Link>
          <p>Make every journey your own. Find the right car and get ready to go.</p>
          {(settings.contactEmail || settings.contactPhone || settings.businessAddress) && (
            <div className="footer-contact">
              {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
              {settings.contactPhone && <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>}
              {settings.businessAddress && <span>{settings.businessAddress}</span>}
            </div>
          )}
          {settingsError && <span className="footer-settings-error" role="status">Business contact details are temporarily unavailable.</span>}
        </div>

        <div className="footer-links-group">
          <h2>Explore</h2>
          <Link to="/cars">Browse cars</Link>
          <Link to="/wishlist">Your wishlist</Link>
          <Link to="/#how-it-works">How it works</Link>
        </div>

        <div className="footer-links-group">
          <h2>Your account</h2>
          <Link to="/login">Login</Link>
          <Link to="/register">Create an account</Link>
        </div>

        <Link to="/cars" className="footer-cta">
          Find your next drive <ArrowUpRight size={17} />
        </Link>
      </div>

      <div className="footer-bottom">
        <span>© {currentYear} {settings.businessName || 'Autovia'}. All rights reserved.</span>
        <span>Your Journey. Your Rules.</span>
      </div>
    </footer>
  )
}
