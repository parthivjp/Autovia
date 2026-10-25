import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/database.js'
import { Car } from '../models/Car.js'
import { RentalRate } from '../models/RentalRate.js'
import { User } from '../models/User.js'
import { Addon } from '../models/Addon.js'
import { Banner } from '../models/Banner.js'
import { CarType } from '../models/CarType.js'
import { Festival } from '../models/Festival.js'
import { Location } from '../models/Location.js'
import { Setting } from '../models/Setting.js'
import { ServiceBlock } from '../models/ServiceBlock.js'
import { Booking } from '../models/Booking.js'
import { demoCars } from '../seed/demoCars.js'

await connectDatabase()

const models = [User, Car, RentalRate, Festival, Booking, ServiceBlock, CarType, Location, Addon, Banner, Setting]
const existingCollections = new Set(
  (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name),
)
for (const model of models) {
  if (!existingCollections.has(model.collection.collectionName)) {
    await model.createCollection()
  }
}

const legacyRates = await mongoose.connection.collection('rentalrates').find().toArray()
for (const {
  _id: _legacyId,
  __v: _legacyVersion,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  car,
  ...rateData
} of legacyRates) {
  await RentalRate.findOneAndUpdate(
    { car },
    { $setOnInsert: { car, ...rateData } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  )
}

const legacyCars = await mongoose.connection.collection('cars')
  .find({ serviceBlocks: { $type: 'array', $ne: [] } })
  .toArray()
for (const car of legacyCars) {
  for (const date of car.serviceBlocks) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      await ServiceBlock.findOneAndUpdate(
        { car: car._id, date },
        { $setOnInsert: { car: car._id, date, reason: 'Under service' } },
        { upsert: true, new: true, runValidators: true },
      )
    }
  }
}

for (const { dailyRate, weekendRate, extraKmCharge, securityDeposit, extraKmPackages, images, ...carData } of demoCars) {
  const car = await Car.findOneAndUpdate(
    { slug: carData.slug },
    { $set: { images }, $setOnInsert: carData },
    { upsert: true, new: true, runValidators: true },
  )
  await RentalRate.findOneAndUpdate(
    { car: car._id },
    { $setOnInsert: { car: car._id, dailyRate, weekendRate, extraKmCharge, securityDeposit, extraKmPackages } },
    { upsert: true, new: true, runValidators: true },
  )
}

const locations = [
  { name: 'Ahmedabad Airport', city: 'Ahmedabad' },
  { name: 'Ahmedabad Railway Station', city: 'Ahmedabad' },
  { name: 'Anand Railway Station', city: 'Anand' },
  { name: 'Ankleshwar Railway Station', city: 'Ankleshwar' },
  { name: 'Bengaluru Airport', city: 'Bengaluru' },
  { name: 'Bharuch Railway Station', city: 'Bharuch' },
  { name: 'Bhavnagar Railway Station', city: 'Bhavnagar' },
  { name: 'Chennai Airport', city: 'Chennai' },
  { name: 'Delhi Connaught Place', city: 'Delhi' },
  { name: 'Delhi Airport', city: 'Delhi' },
  { name: 'Gandhidham Railway Station', city: 'Gandhidham' },
  { name: 'Gandhinagar Capital Station', city: 'Gandhinagar' },
  { name: 'Goa Panaji', city: 'Panaji' },
  { name: 'Hyderabad Airport', city: 'Hyderabad' },
  { name: 'Jamnagar Airport', city: 'Jamnagar' },
  { name: 'Junagadh Railway Station', city: 'Junagadh' },
  { name: 'Kolkata Airport', city: 'Kolkata' },
  { name: 'Mehsana Railway Station', city: 'Mehsana' },
  { name: 'Morbi Bus Station', city: 'Morbi' },
  { name: 'Mumbai Airport', city: 'Mumbai' },
  { name: 'Mumbai Central', city: 'Mumbai' },
  { name: 'Nadiad Railway Station', city: 'Nadiad' },
  { name: 'Pune Airport', city: 'Pune' },
  { name: 'Porbandar Airport', city: 'Porbandar' },
  { name: 'Rajkot Airport', city: 'Rajkot' },
  { name: 'Surat Airport', city: 'Surat' },
  { name: 'Surat Railway Station', city: 'Surat' },
  { name: 'Vadodara Airport', city: 'Vadodara' },
  { name: 'Vadodara Railway Station', city: 'Vadodara' },
  { name: 'Vapi Railway Station', city: 'Vapi' },
]
for (const location of locations) {
  await Location.findOneAndUpdate(
    { name: location.name },
    { $setOnInsert: { ...location, active: true } },
    { upsert: true, new: true },
  )
}

const carTypes = [
  { name: 'Hatchback', slug: 'hatchback', image: '/assets/cars/renault-kwid.webp', sortOrder: 1 },
  { name: 'Sedan', slug: 'sedan', image: '/assets/cars/swift-dzire.webp', sortOrder: 2 },
  { name: 'SUV', slug: 'suv', image: '/assets/cars/hyundai-creta.webp', sortOrder: 3 },
  { name: 'MUV', slug: 'muv', image: '/assets/cars/mahindra-bolero.webp', sortOrder: 4 },
]
for (const { image, ...carType } of carTypes) {
  await CarType.findOneAndUpdate(
    { slug: carType.slug },
    { $set: { image }, $setOnInsert: carType },
    { upsert: true, new: true },
  )
}

const addons = [
  { name: 'Child seat', slug: 'child-seat', description: 'A fitted child safety seat.', price: 300 },
  { name: 'GPS navigation', slug: 'gps', description: 'Portable GPS navigation for your trip.', price: 250 },
  { name: 'Additional driver', slug: 'extra-driver', description: 'Add a second approved driver.', price: 500 },
  { name: 'Full insurance', slug: 'insurance', description: 'Enhanced cover for your rental.', price: 800 },
]
for (const addon of addons) {
  await Addon.findOneAndUpdate({ slug: addon.slug }, { $setOnInsert: { ...addon, active: true } }, { upsert: true, new: true })
}

await Banner.findOneAndUpdate(
  { title: 'Drive the freedom you deserve.' },
  {
    $set: { image: '/assets/cars/hyundai-creta.webp' },
    $setOnInsert: {
      eyebrow: 'Premium self-drive',
      title: 'Drive the freedom you deserve.',
      subtitle: 'Premium cars, transparent pricing, and effortless pickup across India for every trip, from city drives to weekend escapes.',
      link: '/cars',
      active: true,
      sortOrder: 1,
    },
  },
  { upsert: true, new: true },
)
await Setting.findOneAndUpdate(
  { key: 'general' },
  { $setOnInsert: { key: 'general', gstRate: 0.18, businessName: 'Autovia', cancellationHours: 24, lateFeePerHour: 500 } },
  { upsert: true, new: true },
)
for (const festival of [
  { name: 'Diwali', date: '2026-10-31', multiplier: 1.35 },
  { name: 'Diwali Holiday', date: '2026-11-01', multiplier: 1.35 },
  { name: 'Christmas', date: '2026-12-25', multiplier: 1.35 },
]) {
  await Festival.findOneAndUpdate({ name: festival.name, date: festival.date }, { $setOnInsert: festival }, { upsert: true, new: true })
}

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
  await User.findOneAndUpdate(
    { email: process.env.ADMIN_EMAIL.toLowerCase() },
    { $set: { name: 'Autovia Administrator', email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'admin' } },
    { upsert: true, new: true, runValidators: true },
  )
  console.log('Admin login configured.')
}

console.log(`Seeded ${demoCars.length} cars, rates, and customer website data.`)
await mongoose.disconnect()
