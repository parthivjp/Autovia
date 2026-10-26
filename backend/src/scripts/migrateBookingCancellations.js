import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import mongoose from 'mongoose'
import { Booking } from '../models/Booking.js'
import { connectDatabase } from '../config/database.js'

export async function migrateBookingCancellations(BookingModel = Booking) {
  const legacyBookings = await BookingModel.find({
    status: 'cancelled',
    cancellation: { $exists: false },
    cancelledAt: { $type: 'date' },
    cancelledBy: { $in: ['customer', 'admin'] },
  }).select('_id cancellationReason cancelledAt cancelledBy').lean()

  let migrated = 0
  for (const booking of legacyBookings) {
    const result = await BookingModel.collection.updateOne(
      { _id: booking._id, cancellation: { $exists: false } },
      {
        $set: {
          cancellation: {
            reason: booking.cancellationReason || '',
            cancelledAt: booking.cancelledAt,
            cancelledBy: booking.cancelledBy,
          },
        },
      },
    )
    migrated += result.modifiedCount
  }

  return { matched: legacyBookings.length, migrated }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await connectDatabase()
    const result = await migrateBookingCancellations()
    console.log(`Cancellation migration complete: ${result.migrated} of ${result.matched} legacy booking(s) migrated.`)
  } catch (error) {
    console.error('Cancellation migration failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
  }
}
