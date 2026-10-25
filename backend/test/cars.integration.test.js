import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { createApp } from '../src/app.js'
import { User } from '../src/models/User.js'

const mongoUri = 'mongodb://127.0.0.1:27017/autovia_test'
let server
let baseUrl
let adminToken
let customerToken

before(async () => {
  process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough'
  await mongoose.connect(mongoUri)
  await mongoose.connection.dropDatabase()
  const [admin, customer] = await Promise.all([
    User.create({ name: 'Test Admin', email: 'admin@test.local', passwordHash: await bcrypt.hash('admin-password', 4), role: 'admin' }),
    User.create({ name: 'Test Customer', email: 'customer@test.local', passwordHash: await bcrypt.hash('customer-password', 4), role: 'customer' }),
  ])
  adminToken = jwt.sign({ sub: admin.id }, process.env.JWT_SECRET)
  customerToken = jwt.sign({ sub: customer.id }, process.env.JWT_SECRET)

  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

test('car REST API supports secured create, read, update, and delete', async () => {
  const carInput = {
    slug: 'integration-test-car',
    name: 'Integration Test Car',
    type: 'sedan',
    fuel: 'petrol',
    transmission: 'manual',
    seats: 5,
    modelYear: 2024,
    images: ['/assets/cars/test-car.webp'],
    freeKm: 250,
    pickupLocations: ['Bengaluru Airport'],
    rate: { dailyRate: 2100, weekendRate: 2600, extraKmCharge: 18, securityDeposit: 5000 },
  }

  const unauthorizedCreate = await fetch(`${baseUrl}/api/v1/cars`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(carInput),
  })
  assert.equal(unauthorizedCreate.status, 401)

  const forbiddenCreate = await fetch(`${baseUrl}/api/v1/cars`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${customerToken}` },
    body: JSON.stringify(carInput),
  })
  assert.equal(forbiddenCreate.status, 403)

  const createResponse = await fetch(`${baseUrl}/api/v1/cars`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(carInput),
  })
  assert.equal(createResponse.status, 201)
  const { car: createdCar } = await createResponse.json()
  assert.equal(createdCar.id, carInput.slug)
  assert.equal(createdCar.pricePerDay, 2100)

  const listResponse = await fetch(`${baseUrl}/api/v1/cars?search=Integration`)
  const { cars, pagination } = await listResponse.json()
  assert.equal(listResponse.status, 200)
  assert.equal(pagination.total, 1)
  assert.equal(cars[0].id, carInput.slug)

  const detailResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`)
  assert.equal((await detailResponse.json()).car.name, carInput.name)

  const updateResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Updated Integration Car', dailyRate: 2300 }),
  })
  assert.equal(updateResponse.status, 200)
  const { car: updatedCar } = await updateResponse.json()
  assert.equal(updatedCar.name, 'Updated Integration Car')
  assert.equal(updatedCar.pricePerDay, 2300)

  const deleteResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${adminToken}` },
  })
  assert.equal(deleteResponse.status, 204)

  const missingResponse = await fetch(`${baseUrl}/api/v1/cars/${carInput.slug}`)
  assert.equal(missingResponse.status, 404)
})

test('customer registration hashes passwords and never grants an admin role', async () => {
  const registrationResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'New Customer',
      email: 'NEW-CUSTOMER@test.local',
      password: 'customer-password',
      role: 'admin',
    }),
  })
  assert.equal(registrationResponse.status, 201)
  const registration = await registrationResponse.json()
  assert.equal(registration.user.role, 'customer')
  assert.equal(registration.user.passwordHash, undefined)
  assert.ok(registration.token)

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'new-customer@test.local', password: 'customer-password' }),
  })
  assert.equal(loginResponse.status, 200)
  assert.equal((await loginResponse.json()).user.email, 'new-customer@test.local')
})
