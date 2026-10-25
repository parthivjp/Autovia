import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CarFront, Heart, Menu, UserCircle2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import './Header.css'

const navItems = [
  { label: 'Explore Cars', to: '/cars' },
  { label: 'Categories', to: '/#categories' },
  { label: 'How It Works', to: '/#how-it-works' },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { wishlist } = useWishlist()

  const handleLogout = () => {
    logout();
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="Autovia home">
          <span className="brand-mark"><CarFront size={16} /></span>
          <span>
            <strong>Autovia</strong>
            <small>Your Journey. Your Rules.</small>
          </span>
        </Link>

        <nav className={`nav ${mobileOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setMobileOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <Link to="/wishlist" className="wishlist-link" aria-label="Wishlist">
            <Heart size={18} />
            {wishlist.length > 0 && <span className="wishlist-badge">{wishlist.length}</span>}
          </Link>

          {user ? (
            <div className="user-menu">
              <Link to="/profile" className="user-pill">
                <UserCircle2 size={18} />
                {user.name.split(' ')[0]}
              </Link>
              <button className="btn btn-secondary small" type="button" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className="auth-entry">
              <Link to="/login" className="btn btn-primary small">Login or Signup</Link>
            </div>
          )}

          <button className="mobile-toggle" type="button" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  )
}
