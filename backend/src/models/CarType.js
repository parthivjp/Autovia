import mongoose from 'mongoose'

const carTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  image: { type: String, default: '' },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true })

export const CarType = mongoose.model('CarType', carTypeSchema)
