const labels = {
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'SUV',
  muv: 'MUV',
  cng: 'CNG',
  electric: 'Electric',
}

const capitalize = (value = '') => labels[value] || value.charAt(0).toUpperCase() + value.slice(1)

export function toCarResponse(carDocument) {
  const car = carDocument.toObject ? carDocument.toObject({ virtuals: true }) : carDocument
  const rate = car.rentalRate || {}

  return {
    id: car.slug,
    name: car.name,
    category: capitalize(car.type),
    type: car.type,
    fuel: capitalize(car.fuel),
    transmission: capitalize(car.transmission),
    seats: car.seats,
    year: car.modelYear,
    pricePerDay: rate.dailyRate ?? 0,
    weekendRate: rate.weekendRate ?? 0,
    specialPrice: rate.weekendRate ?? rate.dailyRate ?? 0,
    extraKmCharge: rate.extraKmCharge ?? 0,
    securityDeposit: rate.securityDeposit ?? 0,
    freeKm: car.freeKm,
    images: car.images || [],
    image: car.images?.[0] || '',
    status: capitalize((car.status || 'available').replace('-', ' ')),
    featured: Boolean(car.featured),
    pickupLocations: car.pickupLocations || [],
    serviceBlocks: car.serviceBlocks || [],
    availableDates: [],
  }
}
