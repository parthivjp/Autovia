import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCars } from '../context/useCars'
import './BookingPage.css'

const ADD_ONS = [
  { id: 'child-seat', label: 'Child seat', price: 300 },
  { id: 'gps', label: 'GPS navigation', price: 250 },
  { id: 'extra-driver', label: 'Additional driver', price: 500 },
  { id: 'insurance', label: 'Full insurance', price: 800 },
]

const EXTRA_KM_PACKAGES = [
  { id: 'none', label: 'No extra kilometres', km: 0, price: 0 },
  { id: '100-km', label: '100 extra km', km: 100, price: 500 },
  { id: '250-km', label: '250 extra km', km: 250, price: 1000 },
]

const FESTIVAL_DATES = ['2026-10-31', '2026-11-01', '2026-12-25']
const GST_RATE = 0.18
const FESTIVAL_RATE = 1.35

function dateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  const { cars, loading, error: carsError } = useCars()
  const car = cars.find((item) => item.id === carId)
  const [dateDefaults] = useState(() => {
    const now = new Date()
    return { today: dateString(now), pickup: addDays(now, 1), returnDate: addDays(now, 3) }
  })
  const [pickup, setPickup] = useState(dateDefaults.pickup)
  const [returnDate, setReturnDate] = useState(dateDefaults.returnDate)
  const [pickupTime, setPickupTime] = useState('10:00')
  const [returnTime, setReturnTime] = useState('10:00')
  const [selectedLocation, setSelectedLocation] = useState('')
  const location = car?.pickupLocations.includes(selectedLocation) ? selectedLocation : car?.pickupLocations[0] || ''
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [extraKmPackage, setExtraKmPackage] = useState('none')
  const [driver, setDriver] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    license: user?.drivingLicense || '',
  })
  const [error, setError] = useState('')

  const pricing = useMemo(() => {
    if (!car) {
      return { days: 1, rental: 0, extraKm: 0, extraKmTotal: 0, addOnsTotal: 0, gst: 0, total: 0, deposit: 0 }
    }

    const start = new Date(`${pickup}T00:00:00`)
    const end = new Date(`${returnDate}T00:00:00`)
    const days = Math.max(1, Math.ceil((end - start) / 86400000))
    let rental = 0

    for (let index = 0; index < days; index += 1) {
      const day = new Date(start)
      day.setDate(day.getDate() + index)
      const key = dateString(day)
      const isWeekend = day.getDay() === 0 || day.getDay() === 6
      const rate = FESTIVAL_DATES.includes(key)
        ? Math.round(car.weekendRate * FESTIVAL_RATE)
        : isWeekend ? car.weekendRate : car.pricePerDay
      rental += rate
    }

    const packageChoice = EXTRA_KM_PACKAGES.find((item) => item.id === extraKmPackage)
    const addOnsTotal = ADD_ONS
      .filter((item) => selectedAddOns.includes(item.id))
      .reduce((sum, item) => sum + item.price, 0)
    const extraKmTotal = packageChoice?.price || 0
    const taxableTotal = rental + extraKmTotal + addOnsTotal
    const gst = Math.round(taxableTotal * GST_RATE)

    return {
      days,
      rental,
      extraKm: packageChoice?.km || 0,
      extraKmTotal,
      addOnsTotal,
      gst,
      total: taxableTotal + gst,
      deposit: car.securityDeposit || 5000,
    }
  }, [car, pickup, returnDate, extraKmPackage, selectedAddOns])

  if (loading) return <div className="page-shell"><div className="empty-state">Loading booking details…</div></div>
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

  const handleSubmit = (event) => {
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

    const booking = {
      id: `AUT-${Date.now()}`,
      car,
      pickup,
      returnDate,
      pickupTime,
      returnTime,
      location,
      driver,
      addOns: ADD_ONS.filter((item) => selectedAddOns.includes(item.id)),
      extraKm: pricing.extraKm,
      rentalTotal: pricing.rental,
      gst: pricing.gst,
      deposit: pricing.deposit,
      total: pricing.total,
      status: 'Pending',
      paymentMethod: 'Pay at Pickup',
      createdAt: new Date().toISOString(),
      userEmail: user.email,
    }

    const bookings = JSON.parse(localStorage.getItem('autovia-bookings') || '[]')
    bookings.unshift(booking)
    localStorage.setItem('autovia-bookings', JSON.stringify(bookings))
    localStorage.setItem('autovia-last-booking', JSON.stringify(booking))
    navigate('/confirmation')
  }

  return (
    <div className="page-shell booking-page">
      <div className="booking-panel">
        <div className="booking-form-wrap">
          <span className="eyebrow">Reserve your car</span>
          <h1>{car.name}</h1>
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
                <select value={location} onChange={(event) => setSelectedLocation(event.target.value)}>
                  {car.pickupLocations.map((place) => (
                    <option key={place} value={place}>{place}</option>
                  ))}
                </select>
              </label>
            </div>

            <h2>Extra kilometres</h2>
            <label className="booking-select">
              Package
              <select value={extraKmPackage} onChange={(event) => setExtraKmPackage(event.target.value)}>
                {EXTRA_KM_PACKAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}{item.price ? ` — ₹${item.price.toLocaleString('en-IN')}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <h2>Add-ons</h2>
            <div className="booking-addons">
              {ADD_ONS.map((item) => (
                <label className="addon-option" key={item.id}>
                  <input
                    type="checkbox"
                    checked={selectedAddOns.includes(item.id)}
                    onChange={() => toggleAddOn(item.id)}
                  />
                  <span>{item.label}</span>
                  <strong>₹{item.price.toLocaleString('en-IN')}</strong>
                </label>
              ))}
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
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary">Review booking</button>
          </form>
        </div>

        <aside className="summary-card">
          <h2>Live price summary</h2>
          <div className="summary-row"><span>Daily rate</span><strong>₹{car.pricePerDay.toLocaleString('en-IN')} × {pricing.days} days</strong></div>
          <div className="summary-row"><span>Weekend / festival rates</span><strong>₹{pricing.rental.toLocaleString('en-IN')}</strong></div>
          <div className="summary-row"><span>Extra {pricing.extraKm} km</span><strong>₹{pricing.extraKmTotal.toLocaleString('en-IN')}</strong></div>
          <div className="summary-row"><span>Add-ons</span><strong>₹{pricing.addOnsTotal.toLocaleString('en-IN')}</strong></div>
          <div className="summary-row"><span>GST (18%)</span><strong>₹{pricing.gst.toLocaleString('en-IN')}</strong></div>
          <div className="summary-total"><span>Total payable</span><strong>₹{pricing.total.toLocaleString('en-IN')}</strong></div>
          <div className="summary-row deposit-row"><span>Refundable security deposit</span><strong>₹{pricing.deposit.toLocaleString('en-IN')}</strong></div>
          <p className="deposit-note">The security deposit is shown separately and is not included in the trip total.</p>
        </aside>
      </div>
    </div>
  )
}
