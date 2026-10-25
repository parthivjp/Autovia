import mongoose from 'mongoose'

const carSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  registrationNumber: { type: String, default: '', trim: true, uppercase: true, maxlength: 32 },
  description: { type: String, default: '', maxlength: 2000 },
  modelYear: { type: Number, required: true, min: 1900, max: 2100 },
  type: { type: String, required: true, lowercase: true, trim: true },
  fuel: { type: String, required: true, enum: ['petrol', 'diesel', 'cng', 'electric'] },
  seats: { type: Number, required: true, min: 1, max: 20 },
  transmission: { type: String, required: true, enum: ['manual', 'automatic'] },
  images: { type: [String], default: [] },
  freeKm: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['available', 'booked', 'under-service'], default: 'available' },
  featured: { type: Boolean, default: false },
  pickupLocations: { type: [String], default: [] },
}, { timestamps: true })

carSchema.virtual('rentalRate', {
  ref: 'RentalRate',
  localField: '_id',
  foreignField: 'car',
  justOne: true,
})

carSchema.set('toJSON', {
  virtuals: true,
  transform(_document, result) {
    result.id = result.slug
    delete result._id
    delete result.slug
    delete result.__v
    return result
  },
})

export const Car = mongoose.model('Car', carSchema)
