import { Addon } from '../models/Addon.js'
import { Booking } from '../models/Booking.js'
import { Car } from '../models/Car.js'
import { Festival } from '../models/Festival.js'
import { Location } from '../models/Location.js'
import { ServiceBlock } from '../models/ServiceBlock.js'
import { Setting } from '../models/Setting.js'
import { publishSiteUpdate } from '../services/siteUpdates.js'
import { toCarResponse } from '../utils/carResponse.js'

const DAY_MS = 24 * 60 * 60 * 1000
const INDIA_OFFSET_MS = 330 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date
}

function pickupInstant(booking) {
  const [year, month, day] = booking.pickupDate.split('-').map(Number)
  const [hours, minutes] = booking.pickupTime.split(':').map(Number)
  return Date.UTC(year, month - 1, day, hours, minutes) - INDIA_OFFSET_MS
}

function cancellationInfo(booking, cancellationHours, now = Date.now()) {
  const deadline = pickupInstant(booking) - cancellationHours * HOUR_MS
  const statusAllowsCancellation = ['pending', 'confirmed'].includes(booking.status)
  const withinCancellationWindow = now < deadline
  return {
    canCancel: statusAllowsCancellation && withinCancellationWindow,
    cancellationHours,
    cancellationDeadline: new Date(deadline).toISOString(),
  }
}

function dateKeys(start, end) {
  const dates = []
  for (let value = start.valueOf(); value < end.valueOf(); value += DAY_MS) {
    dates.push(new Date(value).toISOString().slice(0, 10))
  }
  return dates
}

async function calculateQuote(input) {
  const {
    carId,
    pickupDate,
    returnDate,
    location: locationName,
    returnLocation: returnLocationName = locationName,
    addonIds = [],
    extraKm = 0,
  } = input
  if (typeof carId !== 'string' || typeof locationName !== 'string'
    || typeof returnLocationName !== 'string'
    || !Array.isArray(addonIds)
    || addonIds.some((addonId) => typeof addonId !== 'string')
    || !Number.isFinite(Number(extraKm))) {
    const error = new Error('Car, locations, add-ons, and extra kilometre package are invalid.')
    error.status = 400
    throw error
  }
  const start = parseDate(pickupDate)
  const end = parseDate(returnDate)
  const todayIndia = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10)
  if (!start || !end || end <= start || pickupDate < todayIndia) {
    const error = new Error('Return date must be after a valid pickup date.')
    error.status = 400
    throw error
  }
  const car = await Car.findOne({ slug: carId }).populate('rentalRate')
  if (!car) {
    const error = new Error('Car not found.')
    error.status = 404
    throw error
  }
  if (car.status === 'under-service') {
    const error = new Error('This car is currently under service and cannot be booked.')
    error.status = 409
    throw error
  }
  const [location, returnLocation] = await Promise.all([
    Location.findOne({ name: locationName, active: true }),
    Location.findOne({ name: returnLocationName, active: true }),
  ])
  if (!location || !returnLocation) {
    const error = new Error('Choose valid pickup and return locations for this car.')
    error.status = 400
    throw error
  }

  const days = dateKeys(start, end)
  const [serviceBlocks, conflictingBookings] = await Promise.all([
    ServiceBlock.find({ car: car._id, date: { $in: days } }).select('date').lean(),
    Booking.find({
      car: car._id,
      status: { $nin: ['cancelled', 'returned', 'completed'] },
      pickupDate: { $lt: returnDate },
      returnDate: { $gt: pickupDate },
    }).select('bookingId').lean(),
  ])
  if (serviceBlocks.length || conflictingBookings.length) {
    const error = new Error('This car is not available for the selected dates.')
    error.status = 409
    throw error
  }

  const rate = car.rentalRate
  if (!rate) {
    const error = new Error('Rental rates are not configured for this car.')
    error.status = 409
    throw error
  }
  const selectedPackage = rate.extraKmPackages?.find((item) => item.km === Number(extraKm))
  if (!selectedPackage) {
    const error = new Error('Choose a valid extra kilometre package.')
    error.status = 400
    throw error
  }

  const addons = addonIds.length
    ? await Addon.find({ _id: { $in: addonIds }, active: true }).lean()
    : []
  if (addons.length !== new Set(addonIds.map(String)).size) {
    const error = new Error('One or more selected add-ons are unavailable.')
    error.status = 400
    throw error
  }

  const festivals = await Festival.find({ date: { $in: days } }).lean()
  const festivalRates = new Map(festivals.map((festival) => [festival.date, festival]))
  const rateBreakdown = days.map((key) => {
    const date = parseDate(key)
    const weekday = date.getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const festival = festivalRates.get(key)
    const baseRate = isWeekend ? rate.weekendRate : rate.dailyRate
    const festivalMultiplier = festival?.multiplier ?? 1
    const dayTotal = Math.round(baseRate * festivalMultiplier)
    return {
      date: key,
      day: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
      dailyRate: rate.dailyRate,
      appliedRate: dayTotal,
      weekendRateApplied: isWeekend,
      festival: festival ? { name: festival.name, multiplier: festival.multiplier } : null,
      specialRateApplied: isWeekend || Boolean(festival),
    }
  })
  const baseRental = rate.dailyRate * days.length
  const rental = rateBreakdown.reduce((total, day) => total + day.appliedRate, 0)
  const addOnsTotal = addons.reduce((total, addon) => total + addon.price, 0)
  const settings = await Setting.findOne({ key: 'general' }).lean()
  const gst = Math.round((rental + selectedPackage.price + addOnsTotal) * (settings?.gstRate ?? 0.18))

  return {
    car,
    location,
    returnLocation,
    addons,
    extraKmPackage: selectedPackage,
    pricing: {
      days: days.length,
      baseRental,
      rental,
      specialRateAdjustment: rental - baseRental,
      rateBreakdown,
      extraKm: selectedPackage.price,
      addOns: addOnsTotal,
      gst,
      total: rental + selectedPackage.price + addOnsTotal + gst,
      securityDeposit: rate.securityDeposit,
    },
  }
}

export async function quoteBooking(req, res) {
  const quote = await calculateQuote(req.body || {})
  res.json({
    pricing: quote.pricing,
    extraKmPackage: quote.extraKmPackage,
    addons: quote.addons.map(({ _id, name, price }) => ({ id: _id.toString(), name, price })),
  })
}

export async function createBooking(req, res) {
  const body = req.body || {}
  const { driver = {}, pickupDate, returnDate, pickupTime, returnTime } = body
  if (!driver || typeof driver.name !== 'string' || !driver.name.trim()
    || typeof driver.phone !== 'string' || !driver.phone.trim()
    || typeof driver.license !== 'string' || !driver.license.trim()
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime || '')
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(returnTime || '')) {
    return res.status(400).json({ error: 'Driver details and pickup and return times are required.' })
  }

  const quote = await calculateQuote(body)
  const bookingId = `AUT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const booking = await Booking.create({
    bookingId,
    user: req.user._id,
    car: quote.car._id,
    pickupDate,
    returnDate,
    pickupTime,
    returnTime,
    location: quote.location._id,
    locationName: quote.location.name,
    returnLocation: quote.returnLocation._id,
    returnLocationName: quote.returnLocation.name,
    driver,
    addOns: quote.addons.map((addon) => ({ addon: addon._id, name: addon.name, price: addon.price })),
    extraKmPackage: {
      label: quote.extraKmPackage.label,
      km: quote.extraKmPackage.km,
      price: quote.extraKmPackage.price,
    },
    pricing: quote.pricing,
  })
  const result = await Booking.findById(booking._id).populate('car').lean()
  publishSiteUpdate()
  res.status(201).json({ booking: serializeBooking(result) })
}

function serializeBooking(booking) {
  if (!booking) return null
  const cancellationRecord = booking.cancellation || {
    reason: booking.cancellationReason || '',
    cancelledAt: booking.cancelledAt || null,
    cancelledBy: booking.cancelledBy || '',
  }
  return {
    id: booking.bookingId,
    car: toCarResponse(booking.car),
    pickup: booking.pickupDate,
    returnDate: booking.returnDate,
    pickupTime: booking.pickupTime,
    returnTime: booking.returnTime,
    location: booking.locationName,
    returnLocation: booking.returnLocationName,
    driver: booking.driver,
    addOns: booking.addOns.map(({ name, price }) => ({ name, price })),
    extraKmPackage: booking.extraKmPackage,
    total: booking.finalTotal ?? booking.pricing.total,
    deposit: booking.pricing.securityDeposit,
    pricing: {
      ...booking.pricing,
      total: booking.finalTotal ?? booking.pricing.total,
      extraKmDrivenCharge: booking.extraKmDrivenCharge || 0,
      lateFee: booking.lateFee || 0,
    },
    paymentMethod: 'Pay at Pickup',
    status: booking.status,
    cancellation: { ...cancellationRecord, ...(booking.cancellationEligibility || {}) },
    cancellationReason: cancellationRecord.reason || '',
    cancelledAt: cancellationRecord.cancelledAt || null,
    createdAt: booking.createdAt,
  }
}

export async function listMyBookings(req, res) {
  const [bookings, settings] = await Promise.all([
    Booking.find({ user: req.user._id }).populate('car').sort({ createdAt: -1 }).lean(),
    Setting.findOne({ key: 'general' }).select('cancellationHours').lean(),
  ])
  const cancellationHours = settings?.cancellationHours ?? 24
  res.json({ bookings: bookings.map((booking) => serializeBooking({
    ...booking,
    cancellationEligibility: cancellationInfo(booking, cancellationHours),
  })) })
}

export async function getMyBooking(req, res) {
  const booking = await Booking.findOne({ bookingId: req.params.id, user: req.user._id }).populate('car').lean()
  if (!booking) return res.status(404).json({ error: 'Booking not found.' })
  const settings = await Setting.findOne({ key: 'general' }).select('cancellationHours').lean()
  return res.json({ booking: serializeBooking({
    ...booking,
    cancellationEligibility: cancellationInfo(booking, settings?.cancellationHours ?? 24),
  }) })
}

export async function cancelMyBooking(req, res) {
  const body = req.body || {}
  const reason = body.reason ?? ''
  if (typeof reason !== 'string' || reason.trim().length > 500) {
    return res.status(400).json({ error: 'Cancellation reason must be text no longer than 500 characters.' })
  }

  const booking = await Booking.findOne({ bookingId: req.params.id, user: req.user._id })
  if (!booking) return res.status(404).json({ error: 'Booking not found.' })
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(409).json({ error: `A ${booking.status} booking cannot be cancelled by the customer.` })
  }

  const settings = await Setting.findOne({ key: 'general' }).select('cancellationHours').lean()
  const cancellationHours = settings?.cancellationHours ?? 24
  const info = cancellationInfo(booking, cancellationHours)
  if (!info.canCancel) {
    return res.status(409).json({
      error: `This booking can no longer be cancelled online. Cancellations must be made at least ${cancellationHours} hours before pickup.`,
      cancellationDeadline: info.cancellationDeadline,
    })
  }

  const cancelledAt = new Date()
  const updatedBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, user: req.user._id, status: { $in: ['pending', 'confirmed'] } },
    {
      $set: {
        status: 'cancelled',
        cancellation: {
          reason: reason.trim(),
          cancelledAt,
          cancelledBy: 'customer',
        },
      },
    },
    { new: true },
  ).populate('car').lean()

  if (!updatedBooking) {
    return res.status(409).json({ error: 'This booking has already changed and can no longer be cancelled.' })
  }

  publishSiteUpdate()
  return res.json({
    message: 'Booking cancelled successfully.',
    booking: serializeBooking({
      ...updatedBooking,
      cancellationEligibility: { ...info, canCancel: false },
    }),
  })
}

export async function getAvailability(req, res) {
  const from = parseDate(req.query.from)
  const to = parseDate(req.query.to)
  if (!from || !to || to < from || to - from > 370 * DAY_MS) {
    return res.status(400).json({ error: 'Provide a valid availability date range of at most 370 days.' })
  }
  const car = await Car.findOne({ slug: req.params.id })
  if (!car) return res.status(404).json({ error: 'Car not found.' })
  if (car.status === 'under-service') {
    return res.json({
      availability: dateKeys(from, new Date(to.valueOf() + DAY_MS)).map((date) => ({ date, status: 'Under Service' })),
    })
  }

  const dates = dateKeys(from, new Date(to.valueOf() + DAY_MS))
  const [blocks, bookings] = await Promise.all([
    ServiceBlock.find({ car: car._id, date: { $in: dates } }).select('date').lean(),
    Booking.find({
      car: car._id,
      status: { $nin: ['cancelled', 'returned', 'completed'] },
      pickupDate: { $lte: dates.at(-1) },
      returnDate: { $gt: req.query.from },
    }).select('pickupDate returnDate').lean(),
  ])
  const serviceDates = new Set(blocks.map((block) => block.date))
  const bookedDates = new Set()
  for (const booking of bookings) {
    for (const date of dates) {
      if (date >= booking.pickupDate && date < booking.returnDate) bookedDates.add(date)
    }
  }

  res.json({
    availability: dates.map((date) => ({
      date,
      status: serviceDates.has(date) ? 'Under Service' : bookedDates.has(date) ? 'Booked' : 'Available',
    })),
  })
}
