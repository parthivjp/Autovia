import mongoose from 'mongoose'

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'general' },
  gstRate: { type: Number, default: 0.18, min: 0, max: 1 },
  businessName: { type: String, default: 'Autovia' },
  cancellationHours: { type: Number, default: 24, min: 0 },
  lateFeePerHour: { type: Number, default: 500, min: 0 },
}, { timestamps: true })

export const Setting = mongoose.model('Setting', settingSchema)
