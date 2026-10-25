import mongoose from 'mongoose'

const rentalRateSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, unique: true },
  dailyRate: { type: Number, required: true, min: 0 },
  weekendRate: { type: Number, required: true, min: 0 },
  extraKmCharge: { type: Number, required: true, min: 0 },
  securityDeposit: { type: Number, required: true, min: 0 },
}, { timestamps: true })

export const RentalRate = mongoose.model('RentalRate', rentalRateSchema)
