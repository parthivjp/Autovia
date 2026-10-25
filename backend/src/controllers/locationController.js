import { Location } from '../models/Location.js'
import { Booking } from '../models/Booking.js'

function serializeLocation(location) {
  return { ...location, id: location._id.toString(), _id: undefined }
}

function validateLocationInput(input, { partial = false } = {}) {
  const location = {}
  for (const field of ['name', 'city', 'address']) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'string' || (field !== 'address' && !input[field].trim())) {
        return { error: `${field} must be a non-empty string.` }
      }
      location[field] = input[field].trim()
    }
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') return { error: 'active must be a boolean.' }
    location.active = input.active
  }
  if (!partial && (!location.name || !location.city)) return { error: 'Location name and city are required.' }
  if (partial && !Object.keys(location).length) return { error: 'Provide at least one location field to update.' }
  return { location }
}

export async function listAdminLocations(_req, res) {
  const locations = await Location.find().sort({ city: 1, name: 1 }).lean()
  res.json({ locations: locations.map(serializeLocation) })
}

export async function createLocation(req, res) {
  const { location, error } = validateLocationInput(req.body || {})
  if (error) return res.status(400).json({ error })
  const created = await Location.create(location)
  return res.status(201).json({ location: serializeLocation(created.toObject()) })
}

export async function updateLocation(req, res) {
  const { location, error } = validateLocationInput(req.body || {}, { partial: true })
  if (error) return res.status(400).json({ error })
  const updated = await Location.findByIdAndUpdate(req.params.id, { $set: location }, { new: true, runValidators: true }).lean()
  if (!updated) return res.status(404).json({ error: 'Location not found.' })
  return res.json({ location: serializeLocation(updated) })
}

export async function deleteLocation(req, res) {
  const location = await Location.findById(req.params.id)
  if (!location) return res.status(404).json({ error: 'Location not found.' })
  if (await Booking.exists({ $or: [{ location: location._id }, { returnLocation: location._id }] })) {
    return res.status(409).json({ error: 'Locations used by booking history cannot be deleted. Disable it instead.' })
  }
  await location.deleteOne()
  return res.status(204).end()
}
