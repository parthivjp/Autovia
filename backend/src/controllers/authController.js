import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

function createToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  )
}

export async function register(req, res) {
  const { name, email, password, phone = '', drivingLicense = '', drivingLicenseDocument } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  if (drivingLicenseDocument) {
    const { mimeType, data } = drivingLicenseDocument
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType)
      || !/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(data || '')
      || typeof data !== 'string'
      || data.length > 4_300_000) {
      return res.status(400).json({ error: 'Licence document must be a JPEG, PNG, WebP, or PDF file under 3 MB.' })
    }
  }

  const existing = await User.exists({ email: email.trim().toLowerCase() })
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' })
  }

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    phone,
    drivingLicense,
    drivingLicenseDocument: drivingLicenseDocument ? {
      filename: String(drivingLicenseDocument.filename || 'driving-license').replace(/[\r\n]/g, '').slice(0, 255),
      mimeType: drivingLicenseDocument.mimeType,
      data: drivingLicenseDocument.data,
    } : undefined,
    role: 'customer',
  })
  res.status(201).json({ user: user.toJSON(), token: createToken(user) })
}

export async function login(req, res) {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash')
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  res.json({ user: user.toJSON(), token: createToken(user) })
}
