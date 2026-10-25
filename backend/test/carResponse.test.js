import test from 'node:test'
import assert from 'node:assert/strict'
import { toCarResponse } from '../src/utils/carResponse.js'

test('maps a MongoDB car and rental rate to the customer API shape', () => {
  const result = toCarResponse({
    slug: 'hyundai-creta',
    name: 'Hyundai Creta',
    type: 'suv',
    fuel: 'diesel',
    transmission: 'automatic',
    seats: 5,
    modelYear: 2024,
    images: ['/assets/cars/hyundai-creta.webp'],
    freeKm: 300,
    status: 'under-service',
    featured: true,
    pickupLocations: ['Bengaluru Airport'],
    serviceBlocks: ['2026-11-14'],
    rentalRate: { dailyRate: 3200, weekendRate: 4200, extraKmCharge: 25, securityDeposit: 7000 },
  })

  assert.deepEqual(result, {
    id: 'hyundai-creta',
    name: 'Hyundai Creta',
    category: 'SUV',
    type: 'suv',
    fuel: 'Diesel',
    transmission: 'Automatic',
    seats: 5,
    year: 2024,
    pricePerDay: 3200,
    weekendRate: 4200,
    specialPrice: 4200,
    extraKmCharge: 25,
    securityDeposit: 7000,
    freeKm: 300,
    images: ['/assets/cars/hyundai-creta.webp'],
    image: '/assets/cars/hyundai-creta.webp',
    status: 'Under service',
    featured: true,
    pickupLocations: ['Bengaluru Airport'],
    serviceBlocks: ['2026-11-14'],
    availableDates: [],
  })
})

test('uses safe defaults when the car has no populated rate or image', () => {
  const result = toCarResponse({ slug: 'test-car', name: 'Test car', type: 'muv', fuel: 'cng', transmission: 'manual' })

  assert.equal(result.pricePerDay, 0)
  assert.equal(result.securityDeposit, 0)
  assert.equal(result.image, '')
  assert.deepEqual(result.images, [])
})
