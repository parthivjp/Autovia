import { Car } from '../models/Car.js'
import { Booking } from '../models/Booking.js'
import { RentalRate } from '../models/RentalRate.js'
import { toCarResponse } from '../utils/carResponse.js'
import { slugify } from '../utils/slugify.js'

const carFields = [
  'name', 'description', 'modelYear', 'type', 'fuel', 'seats', 'transmission', 'images',
  'freeKm', 'status', 'featured', 'pickupLocations',
]
const rateFields = ['dailyRate', 'weekendRate', 'extraKmCharge', 'securityDeposit', 'extraKmPackages']

function pickFields(source, fields) {
  return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}

function normalizeCarInput(input) {
  const data = pickFields(input, carFields)
  if (data.type) data.type = data.type.toLowerCase()
  if (data.fuel) data.fuel = data.fuel.toLowerCase()
  if (data.transmission) data.transmission = data.transmission.toLowerCase()
  if (data.status) data.status = data.status.toLowerCase().replaceAll(' ', '-')
  return data
}

async function findCar(slug) {
  return Car.findOne({ slug }).populate('rentalRate')
}

export async function listCars(req, res) {
  const {
    search, type, fuel, transmission, seats, minPrice, maxPrice, featured,
    sort = 'recommended', page = '1', limit = '100',
  } = req.query
  const filters = {}
  if (type && type !== 'all') filters.type = type.toLowerCase()
  if (fuel && fuel !== 'all') filters.fuel = fuel.toLowerCase()
  if (transmission && transmission !== 'all') filters.transmission = transmission.toLowerCase()
  if (seats) filters.seats = { $gte: Number(seats) }
  if (featured === 'true') filters.featured = true
  if (search?.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filters.$or = ['name', 'type', 'fuel', 'transmission'].map((field) => ({
      [field]: { $regex: escapedSearch, $options: 'i' },
    }))
  }

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 100))
  let cars = await Car.find(filters).populate('rentalRate')
  let results = cars.map(toCarResponse)

  if (minPrice !== undefined || maxPrice !== undefined) {
    const minimum = minPrice === undefined ? 0 : Number(minPrice)
    const maximum = maxPrice === undefined ? Infinity : Number(maxPrice)
    if (!Number.isFinite(minimum) || (maximum !== Infinity && !Number.isFinite(maximum))) {
      return res.status(400).json({ error: 'Price filters must be valid numbers.' })
    }
    results = results.filter((car) => car.pricePerDay >= minimum && car.pricePerDay <= maximum)
  }

  if (sort === 'price-asc') results.sort((first, second) => first.pricePerDay - second.pricePerDay)
  else if (sort === 'price-desc') results.sort((first, second) => second.pricePerDay - first.pricePerDay)
  else if (sort === 'name') results.sort((first, second) => first.name.localeCompare(second.name))
  else results.sort((first, second) => Number(second.featured) - Number(first.featured))

  const total = results.length
  const paginatedCars = results.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)
  res.json({ cars: paginatedCars, pagination: { page: pageNumber, limit: pageSize, total, pages: Math.ceil(total / pageSize) } })
}

export async function getCar(req, res) {
  const car = await findCar(req.params.id)
  if (!car) return res.status(404).json({ error: 'Car not found.' })
  return res.json({ car: toCarResponse(car) })
}

export async function createCar(req, res) {
  const { rate = {} } = req.body
  const normalizedCar = normalizeCarInput(req.body)
  if (!normalizedCar.name) return res.status(400).json({ error: 'Car name is required.' })
  const slug = slugify(req.body.slug || normalizedCar.name)

  const car = await Car.create({ ...normalizedCar, slug })
  try {
    const rentalRate = await RentalRate.create({
      car: car._id,
      ...pickFields({ ...req.body, ...rate }, rateFields),
    })
    car.$set('rentalRate', rentalRate)
    return res.status(201).json({ car: toCarResponse(car) })
  } catch (error) {
    await Car.deleteOne({ _id: car._id })
    throw error
  }
}

export async function updateCar(req, res) {
  const car = await Car.findOne({ slug: req.params.id })
  if (!car) return res.status(404).json({ error: 'Car not found.' })

  const normalizedCar = normalizeCarInput(req.body)
  const updatedCar = await Car.findByIdAndUpdate(car._id, normalizedCar, { new: true, runValidators: true })
  const rateInput = pickFields({ ...req.body, ...(req.body.rate || {}) }, rateFields)
  if (Object.keys(rateInput).length) {
    await RentalRate.findOneAndUpdate(
      { car: car._id },
      { $set: rateInput, $setOnInsert: { car: car._id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )
  }

  const populatedCar = await Car.findById(updatedCar._id).populate('rentalRate')
  return res.json({ car: toCarResponse(populatedCar) })
}

export async function deleteCar(req, res) {
  const car = await Car.findOne({ slug: req.params.id })
  if (!car) return res.status(404).json({ error: 'Car not found.' })
  if (await Booking.exists({ car: car._id })) {
    return res.status(409).json({ error: 'Cars with booking history cannot be deleted.' })
  }
  await Car.deleteOne({ _id: car._id })
  await RentalRate.deleteOne({ car: car._id })
  return res.status(204).end()
}
