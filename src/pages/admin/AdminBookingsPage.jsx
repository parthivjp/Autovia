import { useEffect, useState } from 'react'
import { Check, FileText, Search, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../../services/api'
import { subscribeToSiteUpdates } from '../../services/siteUpdates'
import { StatusPill } from './AdminDashboardPage'

const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const statuses = ['pending', 'confirmed', 'picked-up', 'returned', 'cancelled']

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actualKm, setActualKm] = useState('')
  const [lateHours, setLateHours] = useState('0')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBookings = () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (statusFilter !== 'all') params.set('status', statusFilter)
    apiRequest(`/api/v1/admin/bookings?${params}`)
      .then(({ bookings: result }) => {
        setBookings(result)
        if (selectedId && !result.some((booking) => booking.id === selectedId)) {
          setSelectedId('')
          setDetail(null)
        }
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    const refresh = () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      apiRequest(`/api/v1/admin/bookings?${params}`)
        .then(({ bookings: result }) => {
          if (!active) return
          setBookings(result)
          if (selectedId && !result.some((booking) => booking.id === selectedId)) {
            setSelectedId('')
            setDetail(null)
          }
        })
        .catch((requestError) => { if (active) setError(requestError.message) })
        .finally(() => { if (active) setLoading(false) })
      if (selectedId) {
        apiRequest(`/api/v1/admin/bookings/${encodeURIComponent(selectedId)}`)
          .then(({ booking }) => { if (active) setDetail(booking) })
          .catch((requestError) => { if (active) setError(requestError.message) })
      }
    }
    refresh()
    const unsubscribe = subscribeToSiteUpdates(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [search, statusFilter, selectedId])

  const selectBooking = async (bookingId) => {
    setSelectedId(bookingId)
    setDetailLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/api/v1/admin/bookings/${encodeURIComponent(bookingId)}`)
      setDetail(result.booking)
      setActualKm(result.booking.actualKmDriven ?? '')
      setLateHours(result.booking.lateHours ?? '0')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const updateBooking = async (updates, successMessage) => {
    if (!detail) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/api/v1/admin/bookings/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      setNotice(successMessage)
      await Promise.all([selectBooking(detail.id), loadBookings()])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const availableNextStatuses = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['picked-up', 'cancelled'],
    'picked-up': ['returned'],
    returned: [],
    cancelled: [],
    completed: [],
  }[detail?.status] || []

  return (
    <div className="admin-bookings-layout">
      <section className="admin-panel admin-booking-list-panel">
        <div className="admin-section-heading">
          <div><h2>Reservations</h2><p>{bookings.length} shown, newest first.</p></div>
        </div>
        <div className="admin-booking-filters">
          <label className="admin-search"><Search size={16} /><input aria-label="Search bookings" placeholder="Search booking, customer or car…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <select aria-label="Filter booking status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll('-', ' ')}</option>)}
          </select>
        </div>
        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {loading ? <div className="admin-empty">Loading bookings…</div> : bookings.length ? (
          <div className="admin-booking-list">
            {bookings.map((booking) => (
              <button className={`admin-booking-list-item${selectedId === booking.id ? ' selected' : ''}`} type="button" key={booking.id} onClick={() => selectBooking(booking.id)}>
                <span className="admin-booking-list-top"><strong>{booking.car?.name || 'Car unavailable'}</strong><StatusPill status={booking.status} /></span>
                <span>{booking.customer.name} · {booking.id}</span>
                <span>{booking.pickup} → {booking.returnDate} · {currency(booking.total)}</span>
              </button>
            ))}
          </div>
        ) : <div className="admin-empty">No bookings match these filters.</div>}
      </section>

      <section className="admin-panel admin-booking-detail-panel" aria-live="polite">
        {detailLoading ? <div className="admin-empty">Loading booking details…</div> : !detail ? (
          <div className="admin-booking-placeholder"><CalendarPlaceholder /><h2>Select a booking</h2><p>Choose a reservation to review its details and manage its status.</p></div>
        ) : (
          <div className="admin-booking-detail">
            <div className="admin-section-heading">
              <div><span className="admin-kicker">{detail.id}</span><h2>{detail.car?.name || 'Car unavailable'}</h2></div>
              <StatusPill status={detail.status} />
            </div>
            <div className="admin-detail-block">
              <h3>Customer & driver</h3>
              <dl className="admin-detail-grid">
                <Detail label="Customer" value={detail.customer.name} /><Detail label="Email" value={detail.customer.email || '—'} />
                <Detail label="Phone" value={detail.customer.phone || detail.driver.phone} /><Detail label="Driver" value={detail.driver.name} />
                <Detail label="Licence number" value={detail.license.number || detail.driver.license} />
              </dl>
              <div className="admin-license-card">
                <div><FileText size={18} /><span><strong>Driving licence</strong><small>{detail.license.filename || 'No document uploaded'}</small></span></div>
                <div className="admin-row-actions">
                  {detail.license.data && detail.license.mimeType === 'application/pdf' && <a className="admin-button secondary compact" href={detail.license.data} target="_blank" rel="noreferrer">View PDF</a>}
                  <button className={`admin-button compact ${detail.licenseVerified ? 'success' : 'secondary'}`} type="button" disabled={saving} onClick={() => updateBooking({ licenseVerified: !detail.licenseVerified }, detail.licenseVerified ? 'Licence verification removed.' : 'Driving licence verified.')}>
                    {detail.licenseVerified ? <Check size={15} /> : <ShieldCheck size={15} />}{detail.licenseVerified ? 'Verified' : 'Verify licence'}
                  </button>
                </div>
              </div>
              {detail.license.data && detail.license.mimeType?.startsWith('image/') && (
                <a className="admin-license-preview-link" href={detail.license.data} target="_blank" rel="noreferrer">
                  <img className="admin-license-preview" src={detail.license.data} alt={`Driving licence uploaded by ${detail.customer.name}`} />
                  <span>Open full-size image</span>
                </a>
              )}
              {!detail.license.data && <p className="admin-muted">No licence document was uploaded to this customer profile.</p>}
            </div>
            <div className="admin-detail-block">
              <h3>Trip details</h3>
              <dl className="admin-detail-grid">
                <Detail label="Pickup" value={`${detail.pickup} · ${detail.pickupTime}`} /><Detail label="Return" value={`${detail.returnDate} · ${detail.returnTime}`} />
                <Detail label="Pickup location" value={detail.location} /><Detail label="Return location" value={detail.returnLocation} />
                <Detail label="Payment" value="Pay at Pickup" /><Detail label="Security deposit" value={currency(detail.pricing.securityDeposit)} />
              </dl>
            </div>
            <div className="admin-detail-block">
              <h3>Price breakdown</h3>
              <div className="admin-price-breakdown">
                <span>Rental ({detail.pricing.days} days)<strong>{currency(detail.pricing.rental)}</strong></span>
                <span>Extra km package<strong>{currency(detail.pricing.extraKm)}</strong></span>
                <span>Add-ons<strong>{currency(detail.pricing.addOns)}</strong></span>
                <span>GST<strong>{currency(detail.pricing.gst)}</strong></span>
                {!!detail.extraKmDrivenCharge && <span>Additional kilometres<strong>{currency(detail.extraKmDrivenCharge)}</strong></span>}
                {!!detail.lateFee && <span>Late return<strong>{currency(detail.lateFee)}</strong></span>}
                <span className="total">Final total<strong>{currency(detail.total)}</strong></span>
              </div>
            </div>
            {availableNextStatuses.length > 0 && (
              <div className="admin-detail-block">
                <h3>Update booking status</h3>
                {detail.status === 'picked-up' && (
                  <div className="admin-return-fields">
                    <label className="admin-field"><span>Odometer reading / km driven</span><input type="number" min="0" value={actualKm} onChange={(event) => setActualKm(event.target.value)} required /></label>
                    <label className="admin-field"><span>Late return hours</span><input type="number" min="0" step="0.5" value={lateHours} onChange={(event) => setLateHours(event.target.value)} /></label>
                  </div>
                )}
                <div className="admin-status-actions">
                  {availableNextStatuses.map((status) => (
                    <button className={`admin-button ${status === 'cancelled' ? 'danger' : 'primary'}`} type="button" key={status} disabled={saving} onClick={() => {
                      if (status === 'returned') {
                        if (actualKm === '') {
                          setError('Enter the kilometres driven before marking this car returned.')
                          return
                        }
                        updateBooking({ status, actualKmDriven: Number(actualKm), lateHours: Number(lateHours || 0) }, 'Car returned. Final charges have been calculated.')
                      } else {
                        updateBooking({ status }, `Booking marked ${status.replaceAll('-', ' ')}.`)
                      }
                    }}>{saving ? 'Saving…' : status === 'picked-up' ? 'Mark picked up' : status === 'returned' ? 'Complete return' : status === 'cancelled' ? 'Cancel booking' : 'Confirm booking'}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {notice && <div className="admin-alert success" role="status">{notice}</div>}
      </section>
    </div>
  )
}

function Detail({ label, value }) {
  return <div><dt>{label}</dt><dd>{value || '—'}</dd></div>
}

function CalendarPlaceholder() {
  return <div className="admin-placeholder-icon"><CalendarPlaceholderIcon /></div>
}

function CalendarPlaceholderIcon() {
  return <span aria-hidden="true">↗</span>
}
