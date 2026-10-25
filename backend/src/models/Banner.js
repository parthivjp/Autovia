import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  image: { type: String, default: '' },
  link: { type: String, default: '/cars' },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

export const Banner = mongoose.model('Banner', bannerSchema)
