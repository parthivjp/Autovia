import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, CarFront, LayoutDashboard, LogOut, MapPinned, Settings2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './AdminPage.css'

const navigation = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/cars', label: 'Cars & rates', icon: CarFront },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/content', label: 'Website content', icon: MapPinned },
  { to: '/admin/settings', label: 'Settings', icon: Settings2 },
]

const pageTitles = {
  '/admin': ['Overview', 'Your rental business at a glance'],
  '/admin/cars': ['Cars & rates', 'Manage your fleet, availability and pricing'],
  '/admin/bookings': ['Bookings', 'Review reservations and manage each handover'],
  '/admin/content': ['Website content', 'Control the content customers see'],
  '/admin/settings': ['Account & business settings', 'Manage your admin profile, password, and rental policies'],
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (user.role !== 'admin') return <Navigate to="/profile" replace />

  const [title, subtitle] = pageTitles[location.pathname] || pageTitles['/admin']

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/admin" className="admin-brand" aria-label="Autovia admin home">
          <span className="admin-brand-mark"><CarFront size={21} /></span>
          <span><strong>Autovia</strong><small>FLEET MANAGEMENT</small></span>
        </a>
        <div className="admin-sidebar-label">WORKSPACE</div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={label} title={label} className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-secure-badge"><ShieldCheck size={15} /> Secure admin session</span>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-copy">
            <span>Autovia / Admin</span>
            <strong>{title}</strong>
          </div>
          <div className="admin-user">
            <span className="admin-user-avatar">{user.name?.charAt(0).toUpperCase() || 'A'}</span>
            <span><strong>{user.name}</strong><small>Administrator</small></span>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
