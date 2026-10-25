import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/database.js'
import { Car } from '../models/Car.js'
import { RentalRate } from '../models/RentalRate.js'
import { User } from '../models/User.js'
import { demoCars } from '../seed/demoCars.js'

await connectDatabase()
for (const { dailyRate, weekendRate, extraKmCharge, securityDeposit, ...carData } of demoCars) {
  const car = await Car.findOneAndUpdate(
    { slug: carData.slug },
    { $set: carData },
    { upsert: true, new: true, runValidators: true },
  )
  await RentalRate.findOneAndUpdate(
    { car: car._id },
    { $set: { dailyRate, weekendRate, extraKmCharge, securityDeposit }, $setOnInsert: { car: car._id } },
    { upsert: true, new: true, runValidators: true },
  )
}

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
  await User.findOneAndUpdate(
    { email: process.env.ADMIN_EMAIL.toLowerCase() },
    { $set: { name: 'Autovia Administrator', email: process.env.ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'admin' } },
    { upsert: true, new: true, runValidators: true },
  )
  console.log(`Admin login configured for ${process.env.ADMIN_EMAIL}.`)
}

console.log(`Seeded ${demoCars.length} demo cars and rental rates.`)
await mongoose.disconnect()
