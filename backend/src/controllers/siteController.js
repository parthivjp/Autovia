import { Addon } from '../models/Addon.js'
import { Banner } from '../models/Banner.js'
import { CarType } from '../models/CarType.js'
import { Location } from '../models/Location.js'
import { Setting } from '../models/Setting.js'

export async function getSiteContent(_req, res) {
  const [banners, carTypes, locations, addons, settings] = await Promise.all([
    Banner.find({ active: true }).sort({ sortOrder: 1, _id: 1 }).lean(),
    CarType.find({ active: true }).sort({ sortOrder: 1, _id: 1 }).lean(),
    Location.find({ active: true }).sort({ city: 1, name: 1 }).lean(),
    Addon.find({ active: true }).sort({ name: 1 }).lean(),
    Setting.findOne({ key: 'general' }).lean(),
  ])

  res.json({
    banners: banners.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
    carTypes: carTypes.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
    locations: locations.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
    addons: addons.map(({ _id, ...item }) => ({ ...item, id: _id.toString() })),
    settings: settings || { gstRate: 0.18, businessName: 'Autovia', cancellationHours: 24, lateFeePerHour: 500 },
  })
}
