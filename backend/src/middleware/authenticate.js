import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (!token) {
    return res.status(401).json({ error: 'Authentication is required.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)
    if (!user) {
      return res.status(401).json({ error: 'Authentication is no longer valid.' })
    }
    req.user = user
    return next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Authentication token is invalid or expired.' })
    }
    return next(error)
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' })
  }
  return next()
}
