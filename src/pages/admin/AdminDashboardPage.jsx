import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CarFront, CircleDollarSign, UsersRound } from 'lucide-react'
import { apiRequest } from '../../services/api'

const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    apiRequest('/api/v1/admin/dashboard')
      .then(setDashboard)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    apiRequest('/api/v1/admin/dashboard')
      .then((result) => { if (active) setDashboard(result) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="admin-panel admin-loading">Loading today’s business…</div>
  if (error) return <div className="admin-alert error" role="alert">Unable to load dashboard: {error} <button type="button" onClick={load}>Try again</button></div>

  const stats = dashboard?.stats || {}
  const cards = [
    { label: 'Today’s pickups', value: stats.pickups, icon: ArrowUpRight, tone: 'blue', note: `${dashboard?.todayPickups?.length || 0} scheduled today` },
    { label: 'Today’s returns', value: stats.returns, icon: ArrowDownLeft, tone: 'violet', note: `${dashboard?.todayReturns?.length || 0} expected today` },
    { label: 'Today’s revenue', value: currency(stats.todayRevenue), icon: CircleDollarSign, tone: 'green', note: 'From completed returns' },
    { label: 'Registered customers', value: stats.users, icon: UsersRound, tone: 'amber', note: 'Customer accounts' },
    { label: 'Cars available today', value: stats.carsAvailable, icon: CarFront, tone: 'slate', note: 'Excluding bookings and service' },
  ]

  return (
    <div className="admin-dashboard">
      <div className="admin-date-strip">
        <span className="admin-live-dot" /> Live overview
        <strong>{new Date(`${dashboard.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
      </div>
      <section className="admin-stat-grid" aria-label="Business summary">
        {cards.map(({ label, value, icon: Icon, tone, note }) => (
          <article className="admin-stat-card" key={label}>
            <div className={`admin-stat-icon ${tone}`}><Icon size={19} /></div>
            <span>{label}</span>
            <strong>{value ?? 0}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <div className="admin-dashboard-columns">
        <SchedulePanel title="Today’s pickups" icon={ArrowUpRight} items={dashboard.todayPickups} />
        <SchedulePanel title="Today’s returns" icon={ArrowDownLeft} items={dashboard.todayReturns} />
      </div>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><h2>Recent bookings</h2><p>Latest reservations across your fleet.</p></div>
          <a className="admin-text-link" href="/admin/bookings">View all bookings →</a>
        </div>
        {dashboard.recentBookings?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Booking</th><th>Customer</th><th>Car</th><th>Dates</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {dashboard.recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="admin-mono">{booking.id}</td><td>{booking.customer}</td><td>{booking.car}</td>
                    <td>{booking.pickup} – {booking.returnDate}</td><td><StatusPill status={booking.status} /></td><td>{currency(booking.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="admin-empty">No bookings have been placed yet.</div>}
      </section>
    </div>
  )
}

function SchedulePanel({ title, icon: Icon, items = [] }) {
  return (
    <section className="admin-panel">
      <div className="admin-section-heading">
        <div className="admin-schedule-title"><span><Icon size={18} /></span><h2>{title}</h2></div>
        <small>{items.length} scheduled</small>
      </div>
      {items.length ? (
        <div className="admin-schedule-list">
          {items.map((item) => (
            <div className="admin-schedule-item" key={item.id}>
              <strong>{item.time}</strong>
              <div><b>{item.car}</b><small>{item.customer} · {item.location}</small></div>
              <StatusPill status={item.status} />
            </div>
          ))}
        </div>
      ) : <div className="admin-empty compact">Nothing scheduled for today.</div>}
    </section>
  )
}

export function StatusPill({ status }) {
  const label = { 'picked-up': 'Picked up', completed: 'Returned' }[status] || `${status || 'pending'}`.replaceAll('-', ' ')
  return <span className={`admin-status ${String(status || 'pending').replaceAll('-', '')}`}>{label}</span>
}
