import { Addon } from '../models/Addon.js'
import { Banner } from '../models/Banner.js'
import { Booking } from '../models/Booking.js'
import { Car } from '../models/Car.js'
import { CarType } from '../models/CarType.js'
import { Festival } from '../models/Festival.js'
import { Location } from '../models/Location.js'
import { RentalRate } from '../models/RentalRate.js'
import { ServiceBlock } from '../models/ServiceBlock.js'
import { Setting } from '../models/Setting.js'
import { User } from '../models/User.js'
import { publishSiteUpdate } from '../services/siteUpdates.js'
import { slugify } from '../utils/slugify.js'
import { toCarResponse } from '../utils/carResponse.js'

const resources = {
  'car-types': { model: CarType, fields: ['name', 'slug', 'image', 'active', 'sortOrder'], slug: true },
  addons: { model: Addon, fields: ['name', 'slug', 'description', 'price', 'active'], slug: true },
  banners: { model: Banner, fields: ['eyebrow', 'title', 'subtitle', 'image', 'link', 'active', 'sortOrder'] },
  festivals: { model: Festival, fields: ['name', 'date', 'multiplier'] },
}

const todayInIndia = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10)
const serialize = (document) => {
  const value = document.toObject ? document.toObject() : document
  const { _id, __v, ...fields } = value
  return { ...fields, id: _id?.toString() || value.id }
}
const pick = (input, fields) => Object.fromEntries(
  fields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]),
)

export async function getAdminDashboard(_req, res) {
  const today = todayInIndia()
  const [pickups, returns, revenueBookings, users, cars, unavailableBookings, serviceBlocks, recent] = await Promise.all([
    Booking.find({ pickupDate: today, status: { $nin: ['cancelled', 'returned', 'completed'] } }).sort({ pickupTime: 1 }).populate('car').populate('user', 'name').lean(),
    Booking.find({ returnDate: today, status: { $in: ['picked-up', 'returned', 'completed'] } }).sort({ returnTime: 1 }).populate('car').populate('user', 'name').lean(),
    Booking.find({ returnDate: today, status: { $in: ['returned', 'completed'] } }).select('pricing finalTotal').lean(),
    User.countDocuments({ role: 'customer' }),
    Car.find({ status: { $nin: ['booked', 'under-service'] } }).select('_id').lean(),
    Booking.find({
      status: { $nin: ['cancelled', 'returned', 'completed'] },
      pickupDate: { $lte: today },
      returnDate: { $gt: today },
    }).distinct('car'),
    ServiceBlock.find({ date: today }).distinct('car'),
    Booking.find().sort({ createdAt: -1 }).limit(6).populate('car').populate('user', 'name email').lean(),
  ])
  const unavailableIds = new Set([...unavailableBookings, ...serviceBlocks].map(String))
  const availableCars = cars.filter((car) => !unavailableIds.has(String(car._id))).length
  const todayRevenue = revenueBookings.reduce((total, booking) => total + (booking.finalTotal ?? booking.pricing.total), 0)
  const schedule = (bookings, timeField, locationField) => bookings.map((booking) => ({
    id: booking.bookingId,
    time: booking[timeField],
    location: booking[locationField],
    car: booking.car?.name || 'Car unavailable',
    customer: booking.user?.name || 'Customer',
    status: booking.status,
  }))
  res.json({
    date: today,
    stats: { pickups: pickups.length, returns: returns.length, todayRevenue, users, carsAvailable: availableCars },
    todayPickups: schedule(pickups, 'pickupTime', 'locationName'),
    todayReturns: schedule(returns, 'returnTime', 'returnLocationName'),
    recentBookings: recent.map((booking) => ({
      id: booking.bookingId,
      status: booking.status,
      pickup: booking.pickupDate,
      returnDate: booking.returnDate,
      total: booking.finalTotal ?? booking.pricing.total,
      car: booking.car?.name || 'Car unavailable',
      customer: booking.user?.name || 'Customer',
    })),
  })
}

export async function getAdminResources(_req, res) {
  const [carTypes, locations, addons, banners, festivals, serviceBlocks, settings] = await Promise.all([
    CarType.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Location.find().sort({ city: 1, name: 1 }).lean(),
    Addon.find().sort({ name: 1 }).lean(),
    Banner.find().sort({ sortOrder: 1, _id: 1 }).lean(),
    Festival.find().sort({ date: 1 }).lean(),
    ServiceBlock.find().populate('car', 'slug name').sort({ date: 1 }).lean(),
    Setting.findOne({ key: 'general' }).lean(),
  ])
  res.json({
    carTypes: carTypes.map(serialize),
    locations: locations.map(serialize),
    addons: addons.map(serialize),
    banners: banners.map(serialize),
    festivals: festivals.map(serialize),
    serviceBlocks: serviceBlocks.map((block) => ({
      ...serialize(block),
      carId: block.car?.slug || '',
      carName: block.car?.name || 'Car unavailable',
      car: undefined,
    })),
    settings: settings || { key: 'general', gstRate: 0.18, businessName: 'Autovia', cancellationHours: 24, lateFeePerHour: 500 },
  })
}

export async function createAdminResource(req, res) {
  const config = resources[req.params.resource]
  if (!config) return res.status(404).json({ error: 'Admin resource not found.' })
  const input = req.body || {}
  const fields = pick(input, config.fields)
  if (config.slug) fields.slug = slugify(input.slug || input.name || '')
  if (config.slug && !fields.slug) return res.status(400).json({ error: 'A name is required.' })
  const item = await config.model.create(fields)
  publishSiteUpdate()
  return res.status(201).json({ item: serialize(item) })
}

export async function updateAdminResource(req, res) {
  const config = resources[req.params.resource]
  if (!config) return res.status(404).json({ error: 'Admin resource not found.' })
  const fields = pick(req.body || {}, config.fields)
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Provide at least one field to update.' })
  const item = await config.model.findByIdAndUpdate(req.params.id, { $set: fields }, { new: true, runValidators: true })
  if (!item) return res.status(404).json({ error: 'Admin resource not found.' })
  publishSiteUpdate()
  return res.json({ item: serialize(item) })
}

export async function deleteAdminResource(req, res) {
  const config = resources[req.params.resource]
  if (!config) return res.status(404).json({ error: 'Admin resource not found.' })
  if (req.params.resource === 'car-types') {
    const item = await CarType.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Car type not found.' })
    if (await Car.exists({ type: item.slug })) return res.status(409).json({ error: 'This car type is in use by a car.' })
  }
  const item = await config.model.findByIdAndDelete(req.params.id)
  if (!item) return res.status(404).json({ error: 'Admin resource not found.' })
  publishSiteUpdate()
  return res.status(204).end()
}

export async function updateAdminSettings(req, res) {
  const allowed = ['gstRate', 'businessName', 'contactEmail', 'contactPhone', 'businessAddress', 'cancellationHours', 'lateFeePerHour']
  const fields = pick(req.body || {}, allowed)
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Provide at least one setting to update.' })
  for (const field of ['gstRate', 'cancellationHours', 'lateFeePerHour']) {
    if (fields[field] !== undefined && (!Number.isFinite(Number(fields[field])) || Number(fields[field]) < 0)) {
      return res.status(400).json({ error: `${field} must be a non-negative number.` })
    }
  }
  if (fields.gstRate !== undefined && Number(fields.gstRate) > 1) {
    return res.status(400).json({ error: 'gstRate must be provided as a decimal between 0 and 1.' })
  }
  for (const field of ['businessName', 'contactEmail', 'contactPhone', 'businessAddress']) {
    if (fields[field] !== undefined && typeof fields[field] !== 'string') {
      return res.status(400).json({ error: `${field} must be text.` })
    }
    if (typeof fields[field] === 'string') fields[field] = fields[field].trim()
  }
  const settings = await Setting.findOneAndUpdate(
    { key: 'general' },
    { $set: fields, $setOnInsert: { key: 'general' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean()
  publishSiteUpdate()
  return res.json({ settings })
}

export async function createServiceBlock(req, res) {
  const { carId, date, reason } = req.body || {}
  if (typeof carId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    return res.status(400).json({ error: 'Choose a car and valid service date.' })
  }
  const car = await Car.findOne({ slug: carId })
  if (!car) return res.status(404).json({ error: 'Car not found.' })
  const block = await ServiceBlock.create({ car: car._id, date, reason: typeof reason === 'string' ? reason.trim() : '' })
  publishSiteUpdate()
  return res.status(201).json({
    item: { ...serialize(block), carId: car.slug, carName: car.name },
  })
}

export async function updateServiceBlock(req, res) {
  const { carId, date, reason } = req.body || {}
  const fields = {}
  if (carId !== undefined) {
    if (typeof carId !== 'string') return res.status(400).json({ error: 'carId must identify a valid car.' })
    const car = await Car.findOne({ slug: carId })
    if (!car) return res.status(404).json({ error: 'Car not found.' })
    fields.car = car._id
  }
  if (date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Choose a valid service date.' })
    fields.date = date
  }
  if (reason !== undefined) {
    if (typeof reason !== 'string') return res.status(400).json({ error: 'Reason must be text.' })
    fields.reason = reason.trim()
  }
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Provide a car, date, or reason to update.' })
  const block = await ServiceBlock.findByIdAndUpdate(req.params.id, { $set: fields }, { new: true, runValidators: true }).populate('car', 'slug name').lean()
  if (!block) return res.status(404).json({ error: 'Service block not found.' })
  publishSiteUpdate()
  return res.json({
    item: { ...serialize(block), carId: block.car?.slug || '', carName: block.car?.name || 'Car unavailable', car: undefined },
  })
}

export async function deleteServiceBlock(req, res) {
  const result = await ServiceBlock.findByIdAndDelete(req.params.id)
  if (!result) return res.status(404).json({ error: 'Service block not found.' })
  publishSiteUpdate()
  return res.status(204).end()
}

function adminBookingView(booking) {
  const customer = booking.user
  const document = customer?.drivingLicenseDocument
  return {
    id: booking.bookingId,
    status: booking.status,
    pickup: booking.pickupDate,
    returnDate: booking.returnDate,
    pickupTime: booking.pickupTime,
    returnTime: booking.returnTime,
    location: booking.locationName,
    returnLocation: booking.returnLocationName,
    driver: booking.driver,
    addOns: booking.addOns,
    extraKmPackage: booking.extraKmPackage,
    pricing: booking.pricing,
    total: booking.finalTotal ?? booking.pricing.total,
    actualKmDriven: booking.actualKmDriven,
    lateHours: booking.lateHours,
    extraKmDrivenCharge: booking.extraKmDrivenCharge,
    lateFee: booking.lateFee,
    licenseVerified: Boolean(booking.licenseVerified),
    license: {
      number: customer?.drivingLicense || booking.driver?.license || '',
      filename: document?.filename || '',
      mimeType: document?.mimeType || '',
      data: document?.data || '',
    },
    customer: { name: customer?.name || 'Customer', email: customer?.email || '', phone: customer?.phone || '' },
    car: booking.car ? toCarResponse(booking.car) : null,
    createdAt: booking.createdAt,
  }
}

export async function listAdminBookings(req, res) {
  const filters = {}
  if (req.query.status && req.query.status !== 'all') filters.status = req.query.status
  if (req.query.search?.trim()) {
    const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const [users, cars] = await Promise.all([
      User.find({ name: { $regex: escaped, $options: 'i' } }).distinct('_id'),
      Car.find({ name: { $regex: escaped, $options: 'i' } }).distinct('_id'),
    ])
    filters.$or = [
      { bookingId: { $regex: escaped, $options: 'i' } },
      { user: { $in: users } },
      { car: { $in: cars } },
    ]
  }
  const bookings = await Booking.find(filters).sort({ createdAt: -1 }).limit(250)
    .populate('car').populate('user', 'name email phone drivingLicense').lean()
  res.json({ bookings: bookings.map((booking) => ({
    id: booking.bookingId,
    status: booking.status,
    pickup: booking.pickupDate,
    returnDate: booking.returnDate,
    pickupTime: booking.pickupTime,
    returnTime: booking.returnTime,
    location: booking.locationName,
    total: booking.finalTotal ?? booking.pricing.total,
    licenseVerified: Boolean(booking.licenseVerified),
    customer: { name: booking.user?.name || 'Customer', email: booking.user?.email || '' },
    car: booking.car ? toCarResponse(booking.car) : null,
  })) })
}

export async function getAdminBooking(req, res) {
  const booking = await Booking.findOne({ bookingId: req.params.bookingId }).populate('car').populate({
    path: 'user',
    select: 'name email phone drivingLicense drivingLicenseDocument.filename drivingLicenseDocument.mimeType +drivingLicenseDocument.data',
  }).lean()
  if (!booking) return res.status(404).json({ error: 'Booking not found.' })
  return res.json({ booking: adminBookingView(booking) })
}

const bookingStatuses = new Set(['pending', 'confirmed', 'picked-up', 'returned', 'cancelled'])
const statusTransitions = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['picked-up', 'cancelled']),
  'picked-up': new Set(['returned']),
  returned: new Set(),
  cancelled: new Set(),
  completed: new Set(),
}

export async function updateAdminBooking(req, res) {
  const booking = await Booking.findOne({ bookingId: req.params.bookingId })
  if (!booking) return res.status(404).json({ error: 'Booking not found.' })
  const { status, licenseVerified, actualKmDriven, lateHours } = req.body || {}
  if (licenseVerified !== undefined) {
    if (typeof licenseVerified !== 'boolean') return res.status(400).json({ error: 'licenseVerified must be a boolean.' })
    booking.licenseVerified = licenseVerified
  }
  if (status !== undefined) {
    if (!bookingStatuses.has(status)) return res.status(400).json({ error: 'Choose a valid booking status.' })
    if (!statusTransitions[booking.status]?.has(status)) {
      return res.status(409).json({ error: `A booking cannot move from ${booking.status} to ${status}.` })
    }
    if (status === 'returned') {
      if (!Number.isFinite(Number(actualKmDriven)) || Number(actualKmDriven) < 0
        || !Number.isFinite(Number(lateHours ?? 0)) || Number(lateHours ?? 0) < 0) {
        return res.status(400).json({ error: 'Enter valid kilometres driven and late hours before returning the car.' })
      }
      const [car, rate, settings] = await Promise.all([
        Car.findById(booking.car).select('freeKm'),
        RentalRate.findOne({ car: booking.car }),
        Setting.findOne({ key: 'general' }),
      ])
      const allowedKm = (car?.freeKm || 0) * booking.pricing.days + (booking.extraKmPackage?.km || 0)
      const extraKmDrivenCharge = Math.max(0, Number(actualKmDriven) - allowedKm) * (rate?.extraKmCharge || 0)
      const lateFee = Number(lateHours || 0) * (settings?.lateFeePerHour || 0)
      booking.actualKmDriven = Number(actualKmDriven)
      booking.lateHours = Number(lateHours || 0)
      booking.extraKmDrivenCharge = extraKmDrivenCharge
      booking.lateFee = lateFee
      booking.finalTotal = booking.pricing.total + extraKmDrivenCharge + lateFee
    }
    booking.status = status
  }
  await booking.save()
    publishSiteUpdate()
    return res.json({ booking: { id: booking.bookingId, status: booking.status, total: booking.finalTotal ?? booking.pricing.total } })
}
