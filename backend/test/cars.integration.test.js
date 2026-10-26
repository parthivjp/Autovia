import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { createApp } from '../src/app.js'
import { Addon } from '../src/models/Addon.js'
import { Banner } from '../src/models/Banner.js'
import { Booking } from '../src/models/Booking.js'
import { Car } from '../src/models/Car.js'
import { CarType } from '../src/models/CarType.js'
import { Festival } from '../src/models/Festival.js'
import { Location } from '../src/models/Location.js'
import { RentalRate } from '../src/models/RentalRate.js'
import { ServiceBlock } from '../src/models/ServiceBlock.js'
import { Setting } from '../src/models/Setting.js'
import { User } from '../src/models/User.js'

const mongoUri = 'mongodb://127.0.0.1:27017/autovia_test'
let server
let baseUrl
let adminToken
let customerToken
let adminBookingId
let adminCarId

async function openSiteUpdateStream() {
  const response = await fetch(`${baseUrl}/api/v1/site/events`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const readEvent = async (eventName) => {
    let buffer = ''
    while (!buffer.includes(`event: ${eventName}`)) {
      let timeout
      const chunk = await Promise.race([
        reader.read(),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName} event.`)), 3000)
        }),
      ]).finally(() => clearTimeout(timeout))
      assert.equal(chunk.done, false)
      buffer += decoder.decode(chunk.value, { stream: true })
    }
    return buffer
  }
  assert.match(await readEvent('connected'), /event: connected/)
  return { waitForUpdate: () => readEvent('site-updated'), cancel: () => reader.cancel() }
}

before(async () => {
  process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough'
  await mongoose.connect(mongoUri)
  await mongoose.connection.dropDatabase()
  const [admin, customer] = await Promise.all([
    User.create({ name: 'Test Admin', email: 'admin@test.local', passwordHash: await bcrypt.hash('admin-password', 4), role: 'admin' }),
    User.create({ name: 'Test Customer', email: 'customer@test.local', passwordHash: await bcrypt.hash('customer-password', 4), role: 'customer' }),
  ])
  adminToken = jwt.sign({ sub: admin.id }, process.env.JWT_SECRET)
  customerToken = jwt.sign({ sub: customer.id }, process.env.JWT_SECRET)

  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

test('car REST API supports secured create, read, update, and delete', async () => {
  const carInput = {
    slug: 'integration-test-car',
    name: 'Integration Test Car',
    type: 'sedan',
    fuel: 'petrol',
    transmission: 'manual',
    seats: 5,
    modelYear: 2024,
    images: ['/assets/cars/test-car.webp'],
    freeKm: 250,
    pickupLocations: ['Bengaluru Airport'],
    rate: { dailyRate: 2100, weekendRate: 2600, extraKmCharge: 18, securityDeposit: 5000 },
  }

  const unauthorizedCreate = await fetch(`${baseUrl}/api/v1/cars`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(carInput),
  })
  assert.equal(unauthorizedCreate.status, 401)

  const forbiddenCreate = await fetch(`${baseUrl}/api/v1/cars`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${customerToken}` },
    body: JSON.stringify(carInput),
  })
  assert.equal(forbiddenCreate.status, 403)

  const createResponse = await fetch(`${baseUrl}/api/v1/cars`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(carInput),
  })
  assert.equal(createResponse.status, 201)
  const { car: createdCar } = await createResponse.json()
  assert.equal(createdCar.id, carInput.slug)
  assert.equal(createdCar.pricePerDay, 2100)

  const listResponse = await fetch(`${baseUrl}/api/v1/cars?search=Integration`)
  const { cars, pagination } = await listResponse.json()
  assert.equal(listResponse.status, 200)
  assert.equal(pagination.total, 1)
  assert.equal(cars[0].id, carInput.slug)

  const detailResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`)
  assert.equal((await detailResponse.json()).car.name, carInput.name)

  const updateResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Updated Integration Car', dailyRate: 2300 }),
  })
  assert.equal(updateResponse.status, 200)
  const { car: updatedCar } = await updateResponse.json()
  assert.equal(updatedCar.name, 'Updated Integration Car')
  assert.equal(updatedCar.pricePerDay, 2300)

  const deleteResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${adminToken}` },
  })
  assert.equal(deleteResponse.status, 204)

  const missingResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`)
  assert.equal(missingResponse.status, 404)
})

test('customer registration hashes passwords and never grants an admin role', async () => {
  const registrationResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'New Customer',
      email: 'NEW-CUSTOMER@test.local',
      password: 'customer-password',
      role: 'admin',
      drivingLicenseDocument: {
        filename: 'licence.png',
        mimeType: 'image/png',
        data: 'data:image/png;base64,aGVsbG8=',
      },
    }),
  })
  assert.equal(registrationResponse.status, 201)
  const registration = await registrationResponse.json()
  assert.equal(registration.user.role, 'customer')
  assert.equal(registration.user.passwordHash, undefined)
  assert.equal(registration.user.drivingLicenseDocument.filename, 'licence.png')
  assert.equal(registration.user.drivingLicenseDocument.data, undefined)
  assert.ok(registration.token)
  const storedUser = await User.findOne({ email: 'new-customer@test.local' }).select('+drivingLicenseDocument.data').lean()
  assert.equal(storedUser.drivingLicenseDocument.data, 'data:image/png;base64,aGVsbG8=')
  const registeredProfileResponse = await fetch(`${baseUrl}/api/v1/profile/me`, {
    headers: { authorization: `Bearer ${registration.token}` },
  })
  assert.equal(registeredProfileResponse.status, 200)
  assert.equal((await registeredProfileResponse.json()).user.drivingLicenseDocument.data, undefined)

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'new-customer@test.local', password: 'customer-password' }),
  })
  assert.equal(loginResponse.status, 200)
  assert.equal((await loginResponse.json()).user.email, 'new-customer@test.local')

  const profileResponse = await fetch(`${baseUrl}/api/v1/profile/me`, {
    headers: { authorization: `Bearer ${registration.token}` },
  })
  const profile = await profileResponse.json()
  assert.equal(profile.user.name, 'New Customer')
  assert.equal(profile.user.drivingLicenseDocument.filename, 'licence.png')

  const profileUpdateResponse = await fetch(`${baseUrl}/api/v1/profile/me`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${registration.token}` },
    body: JSON.stringify({ name: 'Updated Customer', phone: '1234567890' }),
  })
  assert.equal(profileUpdateResponse.status, 200)
  assert.equal((await profileUpdateResponse.json()).user.name, 'Updated Customer')
})

test('admin can update account details and securely change their password', async () => {
  const adminHeaders = { authorization: ['Bearer', adminToken].join(' ') }
  const customerHeaders = { authorization: ['Bearer', customerToken].join(' ') }

  const profileResponse = await fetch(`${baseUrl}/api/v1/admin/profile`, { headers: adminHeaders })
  assert.equal(profileResponse.status, 200)
  assert.equal((await profileResponse.json()).user.email, 'admin@test.local')

  const forbiddenProfileResponse = await fetch(`${baseUrl}/api/v1/admin/profile`, { headers: customerHeaders })
  assert.equal(forbiddenProfileResponse.status, 403)

  const profileUpdateResponse = await fetch(`${baseUrl}/api/v1/admin/profile`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ name: 'Updated Administrator', email: 'ADMIN-UPDATED@test.local', phone: '555-0100' }),
  })
  assert.equal(profileUpdateResponse.status, 200)
  const updatedProfile = await profileUpdateResponse.json()
  assert.equal(updatedProfile.user.name, 'Updated Administrator')
  assert.equal(updatedProfile.user.email, 'admin-updated@test.local')
  assert.equal(updatedProfile.user.phone, '555-0100')
  assert.equal(updatedProfile.user.passwordHash, undefined)
  const persistedProfile = await User.findById(updatedProfile.user._id)
  assert.equal(persistedProfile.email, 'admin-updated@test.local')

  const duplicateEmailResponse = await fetch(`${baseUrl}/api/v1/admin/profile`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ email: 'customer@test.local' }),
  })
  assert.equal(duplicateEmailResponse.status, 409)

  const incorrectPasswordResponse = await fetch(`${baseUrl}/api/v1/admin/profile/password`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ currentPassword: 'incorrect-password', newPassword: 'new-admin-password' }),
  })
  assert.equal(incorrectPasswordResponse.status, 400)

  const shortPasswordResponse = await fetch(`${baseUrl}/api/v1/admin/profile/password`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ currentPassword: 'admin-password', newPassword: 'short' }),
  })
  assert.equal(shortPasswordResponse.status, 400)

  const passwordUpdateResponse = await fetch(`${baseUrl}/api/v1/admin/profile/password`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ currentPassword: 'admin-password', newPassword: 'new-admin-password' }),
  })
  assert.equal(passwordUpdateResponse.status, 200)
  assert.equal((await passwordUpdateResponse.json()).message, 'Password updated successfully.')

  const oldPasswordLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin-updated@test.local', password: 'admin-password' }),
  })
  assert.equal(oldPasswordLogin.status, 401)

  const newPasswordLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin-updated@test.local', password: 'new-admin-password' }),
  })
  assert.equal(newPasswordLogin.status, 200)
})

test('customer site content, server quotes, bookings, availability, and wishlists use MongoDB', async () => {
  assert.equal(RentalRate.collection.collectionName, 'rentalrates')
  assert.equal(ServiceBlock.collection.collectionName, 'serviceblocks')
  assert.equal(CarType.collection.collectionName, 'cartypes')

  const car = await Car.create({
    slug: 'booking-test-car',
    name: 'Booking Test Car',
    type: 'sedan',
    fuel: 'petrol',
    transmission: 'manual',
    seats: 5,
    modelYear: 2025,
    images: ['/assets/cars/test-car.webp'],
    freeKm: 250,
    pickupLocations: ['Test Location'],
  })
  const [, testLocation, newLocation] = await Promise.all([
    RentalRate.create({
      car: car._id,
      dailyRate: 1000,
      weekendRate: 1500,
      extraKmCharge: 10,
      securityDeposit: 5000,
      extraKmPackages: [{ label: 'No extra kilometres', km: 0, price: 0 }, { label: '100 extra km', km: 100, price: 250 }],
    }),
    Location.create({ name: 'Test Location', city: 'Test City' }),
    Location.create({ name: 'Newly Added Location', city: 'Test City' }),
    Addon.create({ name: 'GPS', slug: 'test-gps', price: 300 }),
    Festival.create({ name: 'Test festival', date: '2027-01-02', multiplier: 2 }),
    Festival.create({ name: 'Weekday festival', date: '2027-01-04', multiplier: 2 }),
    CarType.create({ name: 'Sedan', slug: 'test-sedan' }),
    Banner.create({ title: 'Test banner' }),
    Setting.create({ key: 'general', gstRate: 0.18 }),
  ])

  const siteResponse = await fetch(`${baseUrl}/api/v1/site`)
  const site = await siteResponse.json()
  assert.equal(siteResponse.status, 200)
  assert.equal(site.banners[0].title, 'Test banner')
  assert.ok(site.carTypes.some((type) => type.slug === 'test-sedan'))
  assert.ok(site.addons.some((addon) => addon.slug === 'test-gps'))
  assert.ok(site.locations.some((location) => location.id === newLocation.id))
  assert.ok(site.locations.some((location) => location.name === 'Test Location'))

  const forbiddenLocationCreate = await fetch(`${baseUrl}/api/v1/admin/locations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: ['Bearer', customerToken].join(' ') },
    body: JSON.stringify({ name: 'Admin Added Location', city: 'Test City' }),
  })
  assert.equal(forbiddenLocationCreate.status, 403)

  const adminLocationResponse = await fetch(`${baseUrl}/api/v1/admin/locations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: ['Bearer', adminToken].join(' ') },
    body: JSON.stringify({ name: 'Admin Added Location', city: 'Test City' }),
  })
  assert.equal(adminLocationResponse.status, 201)
  const { location: adminLocation } = await adminLocationResponse.json()
  const adminLocationsResponse = await fetch(`${baseUrl}/api/v1/admin/locations`, {
    headers: { authorization: ['Bearer', adminToken].join(' ') },
  })
  assert.ok((await adminLocationsResponse.json()).locations.some((location) => location.id === adminLocation.id))

  const adminLocationUpdate = await fetch(`${baseUrl}/api/v1/admin/locations/${adminLocation.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: ['Bearer', adminToken].join(' ') },
    body: JSON.stringify({ address: 'Updated address' }),
  })
  assert.equal(adminLocationUpdate.status, 200)
  assert.equal((await adminLocationUpdate.json()).location.address, 'Updated address')

  const disableAdminLocation = await fetch(`${baseUrl}/api/v1/admin/locations/${adminLocation.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: ['Bearer', adminToken].join(' ') },
    body: JSON.stringify({ active: false }),
  })
  assert.equal(disableAdminLocation.status, 200)
  assert.ok(!(await (await fetch(`${baseUrl}/api/v1/site`)).json()).locations.some((location) => location.id === adminLocation.id))
  const enableAdminLocation = await fetch(`${baseUrl}/api/v1/admin/locations/${adminLocation.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: ['Bearer', adminToken].join(' ') },
    body: JSON.stringify({ active: true }),
  })
  assert.equal(enableAdminLocation.status, 200)

  const newLocationQuote = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: car.slug,
      pickupDate: '2027-01-01',
      returnDate: '2027-01-02',
      location: 'Newly Added Location',
      returnLocation: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(newLocationQuote.status, 200)

  await Location.updateOne({ _id: newLocation._id }, { $set: { active: false } })
  const locationsAfterDisableResponse = await fetch(`${baseUrl}/api/v1/site`)
  const locationsAfterDisable = await locationsAfterDisableResponse.json()
  assert.ok(!locationsAfterDisable.locations.some((location) => location.id === newLocation.id))

  const disabledLocationQuote = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: car.slug,
      pickupDate: '2027-01-01',
      returnDate: '2027-01-02',
      location: 'Newly Added Location',
      returnLocation: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(disabledLocationQuote.status, 400)
  const disabledLocationBooking = await fetch(`${baseUrl}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: ['Bearer', customerToken].join(' ') },
    body: JSON.stringify({
      carId: car.slug,
      pickupDate: '2027-01-01',
      returnDate: '2027-01-02',
      pickupTime: '10:00',
      returnTime: '10:00',
      location: 'Newly Added Location',
      returnLocation: 'Test Location',
      driver: { name: 'Test Customer', phone: '1234567890', license: 'TEST-LICENCE' },
      extraKm: 0,
    }),
  })
  assert.equal(disabledLocationBooking.status, 400)
  assert.equal(await Booking.countDocuments(), 0)
  await Location.updateOne({ _id: newLocation._id }, { $set: { active: true } })

  const quoteResponse = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: car.slug,
      pickupDate: '2027-01-01',
      returnDate: '2027-01-04',
      location: 'Newly Added Location',
      returnLocation: 'Test Location',
      addonIds: [site.addons.find((addon) => addon.slug === 'test-gps').id],
      extraKm: 100,
    }),
  })
  assert.equal(quoteResponse.status, 200)
  const { pricing } = await quoteResponse.json()
  assert.equal(pricing.days, 3)
  assert.equal(pricing.rental, 5500)
  assert.equal(pricing.baseRental, 3000)
  assert.equal(pricing.specialRateAdjustment, 2500)
  assert.deepEqual(pricing.rateBreakdown.map(({ date, appliedRate, weekendRateApplied, festival }) => ({
    date,
    appliedRate,
    weekendRateApplied,
    festival: festival?.name || null,
  })), [
    { date: '2027-01-01', appliedRate: 1000, weekendRateApplied: false, festival: null },
    { date: '2027-01-02', appliedRate: 3000, weekendRateApplied: true, festival: 'Test festival' },
    { date: '2027-01-03', appliedRate: 1500, weekendRateApplied: true, festival: null },
  ])
  assert.equal(pricing.extraKm, 250)
  assert.equal(pricing.addOns, 300)
  assert.equal(pricing.gst, 1089)
  assert.equal(pricing.total, 7139)
  assert.equal(pricing.securityDeposit, 5000)

  const quoteDates = async (pickupDate, returnDate) => {
    const response = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        carId: car.slug,
        pickupDate,
        returnDate,
        location: 'Test Location',
        extraKm: 0,
      }),
    })
    assert.equal(response.status, 200)
    return (await response.json()).pricing
  }
  const weekdayQuote = await quoteDates('2027-01-05', '2027-01-07')
  assert.equal(weekdayQuote.rental, 2000)
  assert.equal(weekdayQuote.baseRental, 2000)
  assert.equal(weekdayQuote.specialRateAdjustment, 0)
  assert.ok(weekdayQuote.rateBreakdown.every((day) => !day.specialRateApplied))
  const weekendQuote = await quoteDates('2027-01-09', '2027-01-11')
  assert.equal(weekendQuote.rental, 3000)
  assert.equal(weekendQuote.baseRental, 2000)
  assert.equal(weekendQuote.specialRateAdjustment, 1000)
  assert.ok(weekendQuote.rateBreakdown.every((day) => day.weekendRateApplied))
  const festivalWeekdayQuote = await quoteDates('2027-01-04', '2027-01-06')
  assert.equal(festivalWeekdayQuote.rental, 3000)
  assert.equal(festivalWeekdayQuote.baseRental, 2000)
  assert.equal(festivalWeekdayQuote.specialRateAdjustment, 1000)
  assert.equal(festivalWeekdayQuote.rateBreakdown[0].festival.name, 'Weekday festival')
  assert.equal(festivalWeekdayQuote.rateBreakdown[0].weekendRateApplied, false)

  const bookingEvents = await openSiteUpdateStream()
  let booking
  try {
  const bookingResponse = await fetch(`${baseUrl}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      carId: car.slug,
      pickupDate: '2027-01-01',
      returnDate: '2027-01-04',
      pickupTime: '10:00',
      returnTime: '10:00',
      location: 'Newly Added Location',
      returnLocation: 'Test Location',
      driver: { name: 'Test Customer', phone: '1234567890', license: 'TEST-LICENCE' },
      addonIds: [site.addons.find((addon) => addon.slug === 'test-gps').id],
      extraKm: 100,
    }),
  })
  assert.equal(bookingResponse.status, 201)
    ;({ booking } = await bookingResponse.json())
    await bookingEvents.waitForUpdate()
  } finally {
    await bookingEvents.cancel()
  }
  adminBookingId = booking.id
  adminCarId = car.slug
  assert.equal(booking.total, 7139)
  assert.equal(booking.pricing.baseRental, 3000)
  assert.equal(booking.pricing.specialRateAdjustment, 2500)
  assert.equal(booking.pricing.rateBreakdown[0].festival, null)
  assert.equal(booking.pricing.rateBreakdown[1].festival.name, 'Test festival')
  assert.equal(booking.location, 'Newly Added Location')
  assert.equal(booking.returnLocation, 'Test Location')
  assert.equal(booking.paymentMethod, 'Pay at Pickup')
  assert.equal(await Booking.countDocuments({ bookingId: booking.id }), 1)
  assert.equal(await Booking.countDocuments({ location: newLocation._id, returnLocation: testLocation._id }), 1)
  const customerCarList = await fetch(`${baseUrl}/api/v1/cars?search=${encodeURIComponent(car.name)}`).then((response) => response.json())
  assert.deepEqual(customerCarList.cars[0].nextBooking, { pickupDate: '2027-01-01', returnDate: '2027-01-04' })

  const deleteBookedCarResponse = await fetch(`${baseUrl}/api/v1/cars/${car.slug}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${adminToken}` },
  })
  assert.equal(deleteBookedCarResponse.status, 409)

  const conflictResponse = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: car.slug,
      pickupDate: '2027-01-02',
      returnDate: '2027-01-03',
      location: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(conflictResponse.status, 409)

  await ServiceBlock.create({ car: car._id, date: '2027-01-04', reason: 'Maintenance' })
  const availabilityResponse = await fetch(`${baseUrl}/api/v1/bookings/availability/${car.slug}?from=2027-01-01&to=2027-01-04`)
  const { availability } = await availabilityResponse.json()
  assert.equal(availability.find((item) => item.date === '2027-01-02').status, 'Booked')
  assert.equal(availability.find((item) => item.date === '2027-01-04').status, 'Under Service')

  const addWishlistResponse = await fetch(`${baseUrl}/api/v1/profile/me/wishlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ carId: car.slug, action: 'add' }),
  })
  assert.equal(addWishlistResponse.status, 200)
  const wishlistResponse = await fetch(`${baseUrl}/api/v1/profile/me/wishlist`, {
    headers: { authorization: `Bearer ${customerToken}` },
  })
  const wishlist = await wishlistResponse.json()
  assert.equal(wishlist.cars[0].id, car.slug)

  const myBookingsResponse = await fetch(`${baseUrl}/api/v1/bookings/mine`, {
    headers: { authorization: `Bearer ${customerToken}` },
  })
  assert.equal((await myBookingsResponse.json()).bookings[0].id, booking.id)
  const unauthenticatedBookingDetail = await fetch(`${baseUrl}/api/v1/bookings/mine/${booking.id}`)
  assert.equal(unauthenticatedBookingDetail.status, 401)
  const otherUserBookingDetail = await fetch(`${baseUrl}/api/v1/bookings/mine/${booking.id}`, {
    headers: { authorization: ['Bearer', adminToken].join(' ') },
  })
  assert.equal(otherUserBookingDetail.status, 404)
  const ownerBookingDetail = await fetch(`${baseUrl}/api/v1/bookings/mine/${booking.id}`, {
    headers: { authorization: ['Bearer', customerToken].join(' ') },
  })
  assert.equal(ownerBookingDetail.status, 200)
  assert.equal((await ownerBookingDetail.json()).booking.id, booking.id)
})

test('admin APIs protect the workspace and manage fleet operations, pricing, bookings, and website content', async () => {
  const adminHeaders = { authorization: `Bearer ${adminToken}` }
  const customerHeaders = { authorization: `Bearer ${customerToken}` }

  const unauthorizedDashboard = await fetch(`${baseUrl}/api/v1/admin/dashboard`)
  assert.equal(unauthorizedDashboard.status, 401)
  const customerDashboard = await fetch(`${baseUrl}/api/v1/admin/dashboard`, { headers: customerHeaders })
  assert.equal(customerDashboard.status, 403)

  const dashboardResponse = await fetch(`${baseUrl}/api/v1/admin/dashboard`, { headers: adminHeaders })
  assert.equal(dashboardResponse.status, 200)
  const dashboard = await dashboardResponse.json()
  assert.equal(typeof dashboard.stats.carsAvailable, 'number')
  assert.ok(Array.isArray(dashboard.todayPickups))
  assert.ok(Array.isArray(dashboard.recentBookings))

  const resourcesResponse = await fetch(`${baseUrl}/api/v1/admin/resources`, { headers: adminHeaders })
  assert.equal(resourcesResponse.status, 200)
  const resources = await resourcesResponse.json()
  assert.ok(resources.locations.some((location) => location.name === 'Test Location'))
  assert.ok(resources.carTypes.some((type) => type.slug === 'test-sedan'))

  const customerResourceWrite = await fetch(`${baseUrl}/api/v1/admin/resources/car-types`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...customerHeaders },
    body: JSON.stringify({ name: 'Forbidden type' }),
  })
  assert.equal(customerResourceWrite.status, 403)

  const eventStream = await fetch(`${baseUrl}/api/v1/site/events`)
  assert.equal(eventStream.status, 200)
  assert.match(eventStream.headers.get('content-type'), /text\/event-stream/)
  const eventReader = eventStream.body.getReader()
  const eventDecoder = new TextDecoder()
  const readEvent = async (eventName) => {
    let buffer = ''
    while (!buffer.includes(`event: ${eventName}`)) {
      let timeout
      const chunk = await Promise.race([
        eventReader.read(),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName} event.`)), 3000)
        }),
      ]).finally(() => clearTimeout(timeout))
      assert.equal(chunk.done, false)
      buffer += eventDecoder.decode(chunk.value, { stream: true })
    }
    return buffer
  }
  let typeCreateResponse
  try {
    assert.match(await readEvent('connected'), /event: connected/)
    typeCreateResponse = await fetch(`${baseUrl}/api/v1/admin/resources/car-types`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ name: 'Estate', active: true }),
    })
    assert.equal(typeCreateResponse.status, 201)
    assert.match(await readEvent('site-updated'), /event: site-updated/)
  } finally {
    await eventReader.cancel()
  }
  const { item: estateType } = await typeCreateResponse.json()
  assert.equal(estateType.slug, 'estate')
  const siteWithEstateType = await fetch(`${baseUrl}/api/v1/site`).then((response) => response.json())
  assert.ok(siteWithEstateType.carTypes.some((type) => type.id === estateType.id))
  const typeUpdateResponse = await fetch(`${baseUrl}/api/v1/admin/resources/car-types/${estateType.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ name: 'Estate Wagon', active: false }),
  })
  assert.equal(typeUpdateResponse.status, 200)
  assert.equal((await typeUpdateResponse.json()).item.active, false)
  const siteWithoutEstateType = await fetch(`${baseUrl}/api/v1/site`).then((response) => response.json())
  assert.ok(!siteWithoutEstateType.carTypes.some((type) => type.id === estateType.id))

  const bannerCreateResponse = await fetch(`${baseUrl}/api/v1/admin/resources/banners`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ title: 'Summer trips', image: '/assets/summer.webp', active: true }),
  })
  assert.equal(bannerCreateResponse.status, 201)
  const { item: banner } = await bannerCreateResponse.json()
  const siteWithBanner = await fetch(`${baseUrl}/api/v1/site`).then((response) => response.json())
  assert.ok(siteWithBanner.banners.some((item) => item.id === banner.id && item.title === 'Summer trips'))
  const bannerUpdateResponse = await fetch(`${baseUrl}/api/v1/admin/resources/banners/${banner.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ title: 'Autumn journeys', active: false }),
  })
  assert.equal(bannerUpdateResponse.status, 200)
  const siteWithoutBanner = await fetch(`${baseUrl}/api/v1/site`).then((response) => response.json())
  assert.ok(!siteWithoutBanner.banners.some((item) => item.id === banner.id))
  const bannerDeleteResponse = await fetch(`${baseUrl}/api/v1/admin/resources/banners/${banner.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  assert.equal(bannerDeleteResponse.status, 204)

  const settingsResponse = await fetch(`${baseUrl}/api/v1/admin/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({
      gstRate: 0.2,
      businessName: 'Autovia Test',
      contactEmail: 'contact@autovia.test',
      contactPhone: '1234567890',
      businessAddress: '123 Test Street',
      lateFeePerHour: 1000,
      cancellationHours: 48,
    }),
  })
  assert.equal(settingsResponse.status, 200)
  const savedSettings = (await settingsResponse.json()).settings
  assert.equal(savedSettings.gstRate, 0.2)
  assert.equal(savedSettings.businessName, 'Autovia Test')
  assert.equal(savedSettings.contactEmail, 'contact@autovia.test')
  assert.equal(savedSettings.contactPhone, '1234567890')
  assert.equal(savedSettings.businessAddress, '123 Test Street')
  assert.equal(savedSettings.lateFeePerHour, 1000)
  assert.equal(savedSettings.cancellationHours, 48)
  const siteWithSettings = await fetch(`${baseUrl}/api/v1/site`).then((response) => response.json())
  assert.equal(siteWithSettings.settings.businessName, 'Autovia Test')
  assert.equal(siteWithSettings.settings.contactEmail, 'contact@autovia.test')
  assert.equal(siteWithSettings.settings.contactPhone, '1234567890')
  assert.equal(siteWithSettings.settings.businessAddress, '123 Test Street')
  assert.equal(siteWithSettings.settings.lateFeePerHour, 1000)
  assert.equal(siteWithSettings.settings.cancellationHours, 48)
  const invalidGstResponse = await fetch(`${baseUrl}/api/v1/admin/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ gstRate: 1.5 }),
  })
  assert.equal(invalidGstResponse.status, 400)
  const invalidLateFeeResponse = await fetch(`${baseUrl}/api/v1/admin/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ lateFeePerHour: -1 }),
  })
  assert.equal(invalidLateFeeResponse.status, 400)

  const addonCreateResponse = await fetch(`${baseUrl}/api/v1/admin/resources/addons`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ name: 'Admin-created GPS', price: 450, active: true }),
  })
  assert.equal(addonCreateResponse.status, 201)
  const { item: adminAddon } = await addonCreateResponse.json()
  const siteWithAddon = await fetch(`${baseUrl}/api/v1/site`).then((response) => response.json())
  assert.ok(siteWithAddon.addons.some((item) => item.id === adminAddon.id && item.price === 450))
  const addonQuoteResponse = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: '2027-01-07',
      returnDate: '2027-01-08',
      location: 'Test Location',
      addonIds: [adminAddon.id],
      extraKm: 0,
    }),
  })
  assert.equal(addonQuoteResponse.status, 200)
  const { pricing: addonPricing } = await addonQuoteResponse.json()
  assert.equal(addonPricing.addOns, 450)
  assert.equal(addonPricing.total, 1740)
  const addonDeleteResponse = await fetch(`${baseUrl}/api/v1/admin/resources/addons/${adminAddon.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  assert.equal(addonDeleteResponse.status, 204)

  const festivalCreateResponse = await fetch(`${baseUrl}/api/v1/admin/resources/festivals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ name: 'Admin-created festival', date: '2027-01-05', multiplier: 2 }),
  })
  assert.equal(festivalCreateResponse.status, 201)
  const { item: festival } = await festivalCreateResponse.json()
  const festivalQuoteResponse = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: '2027-01-05',
      returnDate: '2027-01-06',
      location: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(festivalQuoteResponse.status, 200)
  const { pricing: festivalPricing } = await festivalQuoteResponse.json()
  assert.equal(festivalPricing.rental, 2000)
  assert.equal(festivalPricing.total, 2400)
  const festivalDeleteResponse = await fetch(`${baseUrl}/api/v1/admin/resources/festivals/${festival.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  assert.equal(festivalDeleteResponse.status, 204)

  const carListResponse = await fetch(`${baseUrl}/api/v1/admin/cars`, { headers: adminHeaders })
  assert.equal(carListResponse.status, 200)
  const adminCars = await carListResponse.json()
  assert.equal(adminCars.cars.find((car) => car.id === adminCarId).registrationNumber, '')
  assert.deepEqual(adminCars.cars.find((car) => car.id === adminCarId).nextBooking, { pickupDate: '2027-01-01', returnDate: '2027-01-04' })

  const serviceCreateResponse = await fetch(`${baseUrl}/api/v1/admin/service-blocks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ carId: adminCarId, date: '2027-01-05', reason: 'Repair' }),
  })
  assert.equal(serviceCreateResponse.status, 201)
  const { item: serviceBlock } = await serviceCreateResponse.json()

  const unavailableQuoteResponse = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: '2027-01-05',
      returnDate: '2027-01-06',
      location: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(unavailableQuoteResponse.status, 409)
  const updateServiceBlockResponse = await fetch(`${baseUrl}/api/v1/admin/service-blocks/${serviceBlock.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ date: '2027-01-06', reason: 'Parts delivery' }),
  })
  assert.equal(updateServiceBlockResponse.status, 200)
  assert.equal((await updateServiceBlockResponse.json()).item.reason, 'Parts delivery')
  const removeServiceBlockResponse = await fetch(`${baseUrl}/api/v1/admin/service-blocks/${serviceBlock.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  assert.equal(removeServiceBlockResponse.status, 204)

  const updatedSettingsQuote = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: '2027-01-05',
      returnDate: '2027-01-06',
      location: 'Test Location',
      extraKm: 0,
    }),
  })
  const { pricing: updatedPricing } = await updatedSettingsQuote.json()
  assert.equal(updatedPricing.gst, 200)
  assert.equal(updatedPricing.total, 1200)
  const updateAdminCarRate = await fetch(`${baseUrl}/api/v1/cars/${adminCarId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ rate: { dailyRate: 1500, weekendRate: 1700 } }),
  })
  assert.equal(updateAdminCarRate.status, 200)
  const customerCarResponse = await fetch(`${baseUrl}/api/v1/cars/${adminCarId}`)
  assert.equal((await customerCarResponse.json()).car.pricePerDay, 1500)
  const updatedRateQuoteResponse = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: '2027-01-07',
      returnDate: '2027-01-08',
      location: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(updatedRateQuoteResponse.status, 200)
  const { pricing: updatedRatePricing } = await updatedRateQuoteResponse.json()
  assert.equal(updatedRatePricing.rental, 1500)
  assert.equal(updatedRatePricing.total, 1800)

  await User.updateOne(
    { email: 'customer@test.local' },
    { $set: { 'drivingLicenseDocument.filename': 'customer-license.png', 'drivingLicenseDocument.mimeType': 'image/png', 'drivingLicenseDocument.data': 'data:image/png;base64,aGVsbG8=' } },
  )
  const bookingDetailsResponse = await fetch(`${baseUrl}/api/v1/admin/bookings/${adminBookingId}`, { headers: adminHeaders })
  assert.equal(bookingDetailsResponse.status, 200)
  const bookingDetails = await bookingDetailsResponse.json()
  assert.equal(bookingDetails.booking.license.number, 'TEST-LICENCE')
  assert.equal(bookingDetails.booking.license.filename, 'customer-license.png')
  assert.equal(bookingDetails.booking.license.data, 'data:image/png;base64,aGVsbG8=')
  const verifyLicenseResponse = await fetch(`${baseUrl}/api/v1/admin/bookings/${adminBookingId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ licenseVerified: true }),
  })
  assert.equal((await verifyLicenseResponse.json()).booking.status, 'pending')
  const invalidBookingTransition = await fetch(`${baseUrl}/api/v1/admin/bookings/${adminBookingId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ status: 'picked-up' }),
  })
  assert.equal(invalidBookingTransition.status, 409)
  for (const status of ['confirmed', 'picked-up']) {
    const response = await fetch(`${baseUrl}/api/v1/admin/bookings/${adminBookingId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ status }),
    })
    assert.equal(response.status, 200)
  }
  const invalidReturnInput = await fetch(`${baseUrl}/api/v1/admin/bookings/${adminBookingId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ status: 'returned', actualKmDriven: -1, lateHours: 2 }),
  })
  assert.equal(invalidReturnInput.status, 400)
  const returnResponse = await fetch(`${baseUrl}/api/v1/admin/bookings/${adminBookingId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ status: 'returned', actualKmDriven: 1000, lateHours: 2 }),
  })
  assert.equal(returnResponse.status, 200)
  assert.equal((await returnResponse.json()).booking.total, 10639)

  const returnedBooking = await Booking.findOne({ bookingId: adminBookingId }).lean()
  assert.equal(returnedBooking.status, 'returned')
  assert.equal(returnedBooking.licenseVerified, true)
  assert.equal(returnedBooking.extraKmDrivenCharge, 1500)
  assert.equal(returnedBooking.lateFee, 2000)
  const myReturnedBooking = await fetch(`${baseUrl}/api/v1/bookings/mine`, {
    headers: { authorization: ['Bearer', customerToken].join(' ') },
  }).then((response) => response.json())
  assert.equal(myReturnedBooking.bookings.find((item) => item.id === adminBookingId).status, 'returned')
  const returnedDatesQuote = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: '2027-01-02',
      returnDate: '2027-01-03',
      location: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(returnedDatesQuote.status, 200)

  const cancellablePickupDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const cancellableReturnDate = new Date(Date.parse(`${cancellablePickupDate}T00:00:00.000Z`) + 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)
  const cancellableBookingResponse = await fetch(`${baseUrl}/api/v1/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...customerHeaders },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: cancellablePickupDate,
      returnDate: cancellableReturnDate,
      pickupTime: '10:00',
      returnTime: '10:00',
      location: 'Test Location',
      returnLocation: 'Test Location',
      driver: { name: 'Test Customer', phone: '1234567890', license: 'TEST-LICENCE' },
      extraKm: 0,
    }),
  })
  assert.equal(cancellableBookingResponse.status, 201)
  const cancellableBooking = (await cancellableBookingResponse.json()).booking
  assert.equal(cancellableBooking.status, 'pending')
  const nearPickup = new Date(Date.now() + 330 * 60 * 1000 + 12 * 60 * 60 * 1000)
  const nearPickupDate = nearPickup.toISOString().slice(0, 10)
  const nearPickupTime = `${String(nearPickup.getUTCHours()).padStart(2, '0')}:${String(nearPickup.getUTCMinutes()).padStart(2, '0')}`
  await Booking.updateOne(
    { bookingId: cancellableBooking.id },
    { $set: { pickupDate: nearPickupDate, pickupTime: nearPickupTime } },
  )
  const lateCancellationResponse = await fetch(`${baseUrl}/api/v1/bookings/mine/${cancellableBooking.id}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...customerHeaders },
    body: JSON.stringify({ reason: 'Too close to pickup' }),
  })
  assert.equal(lateCancellationResponse.status, 409)
  await Booking.updateOne(
    { bookingId: cancellableBooking.id },
    { $set: { pickupDate: cancellablePickupDate, pickupTime: '10:00' } },
  )
  const reservedCarList = await fetch(`${baseUrl}/api/v1/cars?search=Booking%20Test%20Car`).then((response) => response.json())
  assert.deepEqual(reservedCarList.cars[0].nextBooking, { pickupDate: cancellablePickupDate, returnDate: cancellableReturnDate })
  const cancellationResponse = await fetch(`${baseUrl}/api/v1/bookings/mine/${cancellableBooking.id}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...customerHeaders },
    body: JSON.stringify({ reason: 'Plans changed' }),
  })
  assert.equal(cancellationResponse.status, 200)
  const cancellation = await cancellationResponse.json()
  assert.equal(cancellation.booking.status, 'cancelled')
  assert.equal(cancellation.booking.cancellationReason, 'Plans changed')
  assert.equal(cancellation.booking.cancellation.canCancel, false)
  const savedCancellation = await Booking.findOne({ bookingId: cancellableBooking.id }).lean()
  assert.equal(savedCancellation.cancellation.reason, 'Plans changed')
  assert.equal(savedCancellation.cancellation.cancelledBy, 'customer')
  assert.ok(savedCancellation.cancellation.cancelledAt instanceof Date)

  const duplicateCancellationResponse = await fetch(`${baseUrl}/api/v1/bookings/mine/${cancellableBooking.id}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...customerHeaders },
    body: JSON.stringify({ reason: 'Try again' }),
  })
  assert.equal(duplicateCancellationResponse.status, 409)
  const otherCustomerCancellationResponse = await fetch(`${baseUrl}/api/v1/bookings/mine/${cancellableBooking.id}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ reason: 'Not the owner' }),
  })
  assert.equal(otherCustomerCancellationResponse.status, 404)

  const releasedCarList = await fetch(`${baseUrl}/api/v1/cars?search=Booking%20Test%20Car`).then((response) => response.json())
  assert.equal(releasedCarList.cars[0].nextBooking, null)
  const releasedDatesQuote = await fetch(`${baseUrl}/api/v1/bookings/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      carId: adminCarId,
      pickupDate: cancellablePickupDate,
      returnDate: cancellableReturnDate,
      location: 'Test Location',
      extraKm: 0,
    }),
  })
  assert.equal(releasedDatesQuote.status, 200)

  const typeDeleteResponse = await fetch(`${baseUrl}/api/v1/admin/resources/car-types/${estateType.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  })
  assert.equal(typeDeleteResponse.status, 204)
})
