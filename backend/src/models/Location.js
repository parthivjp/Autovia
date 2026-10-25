import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

locationSchema.index({ name: 1 }, { unique: true })

export const Location = mongoose.model('Location', locationSchema)
