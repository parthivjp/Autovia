import mongoose from 'mongoose'

const festivalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  multiplier: { type: Number, required: true, min: 0 },
}, { timestamps: true })

export const Festival = mongoose.model('Festival', festivalSchema)
