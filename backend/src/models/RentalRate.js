import mongoose from 'mongoose'

const rentalRateSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, unique: true },
  dailyRate: { type: Number, required: true, min: 0 },
  weekendRate: { type: Number, required: true, min: 0 },
  extraKmCharge: { type: Number, required: true, min: 0 },
  securityDeposit: { type: Number, required: true, min: 0 },
  extraKmPackages: {
    type: [{
      label: { type: String, required: true },
      km: { type: Number, required: true, min: 0 },
      price: { type: Number, required: true, min: 0 },
    }],
    default: [
      { label: 'No extra kilometres', km: 0, price: 0 },
      { label: '100 extra km', km: 100, price: 500 },
      { label: '250 extra km', km: 250, price: 1000 },
    ],
  },
}, { timestamps: true })

export const RentalRate = mongoose.model('RentalRate', rentalRateSchema)
