import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, default: '', trim: true },
  drivingLicense: { type: String, default: '', trim: true },
  drivingLicenseDocument: {
    filename: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    data: { type: String, default: '', select: false },
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Car' }],
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
}, { timestamps: true })

userSchema.set('toJSON', {
  transform(_document, result) {
    delete result.passwordHash
    delete result.drivingLicenseDocument?.data
    delete result.__v
    return result
  },
})

export const User = mongoose.model('User', userSchema)
