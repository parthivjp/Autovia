import mongoose from 'mongoose'

const cancellationSchema = new mongoose.Schema({
  reason: { type: String, trim: true, maxlength: 500, default: '' },
  cancelledAt: { type: Date, required: true },
  cancelledBy: { type: String, enum: ['customer', 'admin'], required: true },
}, { _id: false })

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
  pickupDate: { type: String, required: true },
  returnDate: { type: String, required: true },
  pickupTime: { type: String, required: true },
  returnTime: { type: String, required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  locationName: { type: String, required: true },
  returnLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  returnLocationName: { type: String, required: true },
  driver: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    license: { type: String, required: true, trim: true },
  },
  addOns: [{
    addon: { type: mongoose.Schema.Types.ObjectId, ref: 'Addon' },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  }],
  extraKmPackage: {
    label: { type: String, required: true },
    km: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
  },
  pricing: {
    days: { type: Number, required: true, min: 1 },
    rental: { type: Number, required: true, min: 0 },
    extraKm: { type: Number, required: true, min: 0 },
    addOns: { type: Number, required: true, min: 0 },
    gst: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0 },
  },
  paymentMethod: { type: String, enum: ['pay-at-pickup'], default: 'pay-at-pickup' },
  status: { type: String, enum: ['pending', 'confirmed', 'picked-up', 'returned', 'cancelled', 'completed'], default: 'pending' },
  cancellation: { type: cancellationSchema, default: undefined },
  cancellationReason: { type: String, trim: true, maxlength: 500, default: '' },
  cancelledAt: { type: Date },
  cancelledBy: { type: String, enum: ['customer', 'admin'] },
  licenseVerified: { type: Boolean, default: false },
  actualKmDriven: { type: Number, min: 0 },
  lateHours: { type: Number, min: 0, default: 0 },
  extraKmDrivenCharge: { type: Number, min: 0, default: 0 },
  lateFee: { type: Number, min: 0, default: 0 },
  finalTotal: { type: Number, min: 0 },
}, { timestamps: true })

export const Booking = mongoose.model('Booking', bookingSchema)
