import mongoose from 'mongoose'

const serviceBlockSchema = new mongoose.Schema({
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  reason: { type: String, default: 'Under service', trim: true },
}, { timestamps: true })

serviceBlockSchema.index({ car: 1, date: 1 }, { unique: true })

export const ServiceBlock = mongoose.model('ServiceBlock', serviceBlockSchema)
