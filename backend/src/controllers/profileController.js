import { Car } from '../models/Car.js'
import { toCarResponse } from '../utils/carResponse.js'

export async function getProfile(req, res) {
  const user = await req.user.populate('wishlist', 'slug name images')
  res.json({
    user: user.toJSON(),
    wishlist: user.wishlist.filter(Boolean).map((car) => ({ id: car.slug, name: car.name, image: car.images?.[0] || '' })),
  })
}

export async function updateProfile(req, res) {
  const body = req.body || {}
  const { name, phone, drivingLicense } = body
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name cannot be empty.' })
    req.user.name = name.trim()
  }
  if (phone !== undefined) {
    if (typeof phone !== 'string') return res.status(400).json({ error: 'Phone number must be text.' })
    req.user.phone = phone.trim()
  }
  if (drivingLicense !== undefined) {
    if (typeof drivingLicense !== 'string') return res.status(400).json({ error: 'Driving licence number must be text.' })
    req.user.drivingLicense = drivingLicense.trim()
  }
  if (body.drivingLicenseDocument) {
    const { filename, mimeType, data } = body.drivingLicenseDocument
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mimeType)
      || !/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(data || '')
      || typeof data !== 'string'
      || data.length > 4_300_000) {
      return res.status(400).json({ error: 'Licence document must be a JPEG, PNG, WebP, or PDF file.' })
    }
    req.user.drivingLicenseDocument = {
      filename: String(filename || 'driving-license').replace(/[\r\n]/g, '').slice(0, 255),
      mimeType,
      data,
    }
  }
  await req.user.save()
  return res.json({ user: req.user.toJSON() })
}

export async function getWishlist(req, res) {
  const user = await req.user.populate({ path: 'wishlist', populate: { path: 'rentalRate' } })
  return res.json({ cars: user.wishlist.filter(Boolean).map(toCarResponse) })
}

export async function updateWishlist(req, res) {
  const { carId, action } = req.body
  if (!carId || !['add', 'remove', 'toggle'].includes(action)) {
    return res.status(400).json({ error: 'A car and a valid wishlist action are required.' })
  }
  const car = await Car.findOne({ slug: carId })
  if (!car) return res.status(404).json({ error: 'Car not found.' })
  const contains = req.user.wishlist.some((id) => id.equals(car._id))
  if (action === 'add' || (action === 'toggle' && !contains)) {
    if (!contains) req.user.wishlist.push(car._id)
  } else {
    req.user.wishlist = req.user.wishlist.filter((id) => !id.equals(car._id))
  }
  await req.user.save()
  return res.json({ wishlist: req.user.wishlist.map(String) })
}
