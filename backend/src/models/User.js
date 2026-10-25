import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: '', trim: true },
  drivingLicense: { type: String, default: '', trim: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
}, { timestamps: true })

userSchema.set('toJSON', {
  transform(_document, result) {
    delete result.passwordHash
    delete result.__v
    return result
  },
})

export const User = mongoose.model('User', userSchema)
