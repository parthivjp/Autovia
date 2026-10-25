import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCars } from '../context/useCars'
import { useSiteContent } from '../hooks/useSiteContent'
import { apiRequest } from '../services/api'
import './BookingPage.css'

function dateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return dateString(next)
}

export default function BookingPage() {
  const { carId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cars, loading: carsLoading, error: carsError } = useCars()
  const car = cars.find((item) => item.id === carId)
  const { data: siteData, loading: siteLoading, error: siteError, version: siteVersion } = useSiteContent()
  const [dateDefaults] = useState(() => {
    const now = new Date()
    return { today: dateString(now), pickup: addDays(now, 1), returnDate: addDays(now, 3) }
  })
  const [pickup, setPickup] = useState(dateDefaults.pickup)
  const [returnDate, setReturnDate] = useState(dateDefaults.returnDate)
  const [pickupTime, setPickupTime] = useState('10:00')
  const [returnTime, setReturnTime] = useState('10:00')
  const [selectedLocation, setSelectedLocation] = useState('')
  const availableLocations = siteData.locations
  const location = availableLocations.some((item) => item.name === selectedLocation)
    ? selectedLocation
    : availableLocations[0]?.name || ''
  const [selectedReturnLocation, setSelectedReturnLocation] = useState('')
  const returnLocation = availableLocations.some((item) => item.name === selectedReturnLocation)
    ? selectedReturnLocation
    : location
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [extraKm, setExtraKm] = useState('0')
  const [driver, setDriver] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    license: user?.drivingLicense || '',
  })
  const [quoteState, setQuoteState] = useState({ key: '', pricing: null, loading: false, error: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const quoteKey = JSON.stringify([carId, pickup, returnDate, location, returnLocation, selectedAddOns, extraKm, siteVersion])
  const pricing = quoteState.key === quoteKey ? quoteState.pricing : null
  const quoteLoading = quoteState.key === quoteKey && quoteState.loading
  const quoteError = quoteState.key === quoteKey ? quoteState.error : ''

  useEffect(() => {
    if (!car || !pickup || !returnDate || returnDate <= pickup || !location) return undefined
    let active = true
    const timer = window.setTimeout(() => {
      setQuoteState({ key: quoteKey, pricing: null, loading: true, error: '' })
      apiRequest('/api/v1/bookings/quote', {
        method: 'POST',
        body: JSON.stringify({
          carId,
          pickupDate: pickup,
          returnDate,
          location,
          returnLocation,
          addonIds: selectedAddOns,
          extraKm: Number(extraKm),
        }),
      })
        .then(({ pricing: quote }) => {
          if (active) setQuoteState({ key: quoteKey, pricing: quote, loading: false, error: '' })
        })
        .catch((requestError) => {
          if (active) setQuoteState({ key: quoteKey, pricing: null, loading: false, error: requestError.message })
        })
    }, 150)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [car, carId, pickup, returnDate, location, returnLocation, selectedAddOns, extraKm, quoteKey])

  const selectedPackage = car?.extraKmPackages?.find((item) => item.km === Number(extraKm))

  if (carsLoading) return <div className="page-shell"><div className="empty-state">Loading booking details…</div></div>
  if (carsError) return <div className="page-shell"><div className="empty-state" role="alert">Unable to load cars: {carsError}</div></div>
  if (!car) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <p>This car is no longer available.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/cars')}>Browse cars</button>
        </div>
      </div>
    )
  }

  const toggleAddOn = (id) => {
    setSelectedAddOns((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!user) {
      navigate('/login')
      return
    }
    if (!pickup || !returnDate || returnDate <= pickup) {
      setError('Return date must be after the pickup date.')
      return
    }
    if (!driver.name.trim() || !driver.phone.trim() || !driver.license.trim()) {
      setError('Enter the driver name, phone number, and licence details.')
      return
    }
    if (!pricing) {
      setError(quoteError || 'Wait for a valid price quote before placing your booking.')
      return
    }

    setSaving(true)
    try {
      const result = await apiRequest('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify({
          carId,
          pickupDate: pickup,
          returnDate,
          pickupTime,
          returnTime,
          location,
          returnLocation,
          driver,
          addonIds: selectedAddOns,
          extraKm: Number(extraKm),
        }),
      })
      navigate(`/confirmation/${result.booking.id}`, { state: { booking: result.booking } })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount = 0) => `₹${Number(amount).toLocaleString('en-IN')}`

  return (
    <div className="page-shell booking-page">
      <div className="booking-panel">
        <div className="booking-form-wrap">
          <span className="eyebrow">Reserve your car</span>
          <h1>{car.name}</h1>
          {siteError && <p className="form-error" role="alert">Unable to load booking options: {siteError}</p>}
          <form className="booking-form" onSubmit={handleSubmit}>
            <h2>Trip details</h2>
            <div className="form-grid booking-fields">
              <label>Pickup date
                <input type="date" min={dateDefaults.today} value={pickup} onChange={(event) => setPickup(event.target.value)} required />
              </label>
              <label>Pickup time
                <input type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} required />
              </label>
              <label>Return date
                <input type="date" min={pickup} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required />
              </label>
              <label>Return time
                <input type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} required />
              </label>
              <label className="booking-location">Pickup location
                <select value={location} onChange={(event) => setSelectedLocation(event.target.value)} disabled={siteLoading || Boolean(siteError) || !availableLocations.length} required>
                  <option value="">
                    {siteLoading ? 'Loading locations…' : siteError ? 'Unable to load locations' : availableLocations.length ? 'Select a pickup location' : 'No locations currently available'}
                  </option>
                  {availableLocations.map((place) => (
                    <option key={place.id} value={place.name}>{place.name}</option>
                  ))}
                </select>
              </label>
              <label className="booking-location">Return location
                <select value={returnLocation} onChange={(event) => setSelectedReturnLocation(event.target.value)} disabled={siteLoading || Boolean(siteError) || !availableLocations.length} required>
                  <option value="">
                    {siteLoading ? 'Loading locations…' : siteError ? 'Unable to load locations' : availableLocations.length ? 'Select a return location' : 'No locations currently available'}
                  </option>
                  {availableLocations.map((place) => (
                    <option key={place.id} value={place.name}>{place.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <h2>Extra kilometres</h2>
            <label className="booking-select">
              Package
              <select value={extraKm} onChange={(event) => setExtraKm(event.target.value)}>
                {(car.extraKmPackages || []).map((item) => (
                  <option key={item.km} value={item.km}>
                    {item.label}{item.price ? ` — ${formatCurrency(item.price)}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <h2>Add-ons</h2>
            {siteError && <p className="form-error" role="alert">Unable to load add-ons: {siteError}</p>}
            <div className="booking-addons">
              {siteData.addons.map((item) => (
                <label className="addon-option" key={item.id}>
                  <input
                    type="checkbox"
                    checked={selectedAddOns.includes(item.id)}
                    onChange={() => toggleAddOn(item.id)}
                  />
                  <span>{item.name}</span>
                  <strong>{formatCurrency(item.price)}</strong>
                </label>
              ))}
              {!siteData.addons.length && !siteError && <p>No add-ons are currently available.</p>}
            </div>

            <h2>Driver details</h2>
            <div className="form-grid booking-fields">
              <label>Full name
                <input value={driver.name} onChange={(event) => setDriver({ ...driver, name: event.target.value })} required />
              </label>
              <label>Phone number
                <input type="tel" value={driver.phone} onChange={(event) => setDriver({ ...driver, phone: event.target.value })} required />
              </label>
              <label className="booking-location">Driving licence number
                <input value={driver.license} onChange={(event) => setDriver({ ...driver, license: event.target.value })} required />
              </label>
            </div>

            <div className="payment-method">
              <strong>Payment</strong>
              <span>Pay at Pickup</span>
            </div>
            {quoteError && <p className="form-error" role="alert">{quoteError}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={saving || quoteLoading || !pricing}>
              {saving ? 'Placing booking…' : 'Confirm booking'}
            </button>
          </form>
        </div>

        <aside className="summary-card">
          <h2>Live price summary</h2>
          <div className="summary-row"><span>Daily rate × {pricing?.days || '—'} days</span><strong>{pricing ? formatCurrency(pricing.rental) : '—'}</strong></div>
          <div className="summary-row"><span>Weekend / festival rates</span><strong>Included above</strong></div>
          <div className="summary-row"><span>Extra {selectedPackage?.km || 0} km</span><strong>{pricing ? formatCurrency(pricing.extraKm) : '—'}</strong></div>
          <div className="summary-row"><span>Add-ons</span><strong>{pricing ? formatCurrency(pricing.addOns) : '—'}</strong></div>
          <div className="summary-row"><span>GST ({Math.round((siteData.settings.gstRate || 0) * 100)}%)</span><strong>{pricing ? formatCurrency(pricing.gst) : '—'}</strong></div>
          <div className="summary-total"><span>Total payable</span><strong>{quoteLoading ? 'Updating…' : pricing ? formatCurrency(pricing.total) : quoteError ? 'Unavailable' : '—'}</strong></div>
          {quoteError && <p className="form-error" role="alert">Unable to calculate the price: {quoteError}</p>}
          <div className="summary-row deposit-row"><span>Refundable security deposit</span><strong>{formatCurrency(pricing?.securityDeposit ?? car.securityDeposit)}</strong></div>
          <p className="deposit-note">The security deposit is shown separately and is not included in the trip total.</p>
        </aside>
      </div>
    </div>
  )
}
