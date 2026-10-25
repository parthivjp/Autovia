import mongoose from 'mongoose'

const addonSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export const Addon = mongoose.model('Addon', addonSchema)
