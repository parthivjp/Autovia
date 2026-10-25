import { ArrowUpRight, CarFront } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Footer.css'

const currentYear = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo" aria-label="Autovia home">
            <span className="footer-brand-mark"><CarFront size={18} /></span>
            <span>Autovia</span>
          </Link>
          <p>Make every journey your own. Find the right car and get ready to go.</p>
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
        <span>© {currentYear} Autovia. All rights reserved.</span>
        <span>Your Journey. Your Rules.</span>
      </div>
    </footer>
  )
}
