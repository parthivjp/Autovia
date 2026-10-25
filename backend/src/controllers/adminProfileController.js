import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function getAdminProfile(req, res) {
  return res.json({ user: req.user.toJSON() })
}

export async function updateAdminProfile(req, res) {
  const body = req.body || {}
  const fields = ['name', 'email', 'phone'].filter((field) => body[field] !== undefined)
  if (!fields.length) return res.status(400).json({ error: 'Provide at least one profile field to update.' })

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be between 1 and 100 characters.' })
    }
    req.user.name = body.name.trim()
  }
  if (body.email !== undefined) {
    if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim()) || body.email.trim().length > 254) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    const email = body.email.trim().toLowerCase()
    const existingUser = await User.exists({ email, _id: { $ne: req.user._id } })
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists.' })
    req.user.email = email
  }
  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string' || body.phone.trim().length > 32) {
      return res.status(400).json({ error: 'Phone number must be text no longer than 32 characters.' })
    }
    req.user.phone = body.phone.trim()
  }

  try {
    await req.user.save()
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    throw error
  }
  return res.json({ user: req.user.toJSON() })
}

export async function changeAdminPassword(req, res) {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' })
  }

  const user = await User.findById(req.user._id).select('+passwordHash')
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(400).json({ error: 'Current password is incorrect.' })
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return res.status(400).json({ error: 'New password must be different from your current password.' })
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12)
  await user.save()
  return res.json({ message: 'Password updated successfully.' })
}
