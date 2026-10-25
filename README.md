# Autovia Car Rental

Autovia is a customer-facing car rental site with a React/Vite frontend and a separate Express/MongoDB backend. Customer-facing catalog, pricing, availability, accounts, wishlists, and reservations use MongoDB-backed APIs. There is no admin interface.

## Stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express, Mongoose, MVC folders under `backend/src`
- Database: MongoDB

## Local setup

1. Install frontend dependencies from the repository root:

   ```sh
   npm install
   ```

2. Install backend dependencies:

   ```sh
   npm install --prefix backend
   ```

3. Ensure the local MongoDB service is running. Copy `backend/.env.example` to `backend/.env` and set a private, long `JWT_SECRET`. The default local database URI is:

   ```text
   mongodb://127.0.0.1:27017/autovia
   ```

4. Seed the initial customer website content and demo records:

   ```sh
   npm run seed
   ```

5. Start the frontend and backend together:

   ```sh
   npm run dev
   ```

   Frontend: `http://localhost:5173`
   Backend: `http://localhost:4000`
   Health check: `http://localhost:4000/api/v1/health`

## Backend MVC structure

- `backend/src/config`: database connection
- `backend/src/models`: Mongoose models for all 11 persisted collections (`users`, `cars`, `rentalrates`, `festivals`, `bookings`, `serviceblocks`, `cartypes`, `locations`, `addons`, `banners`, and `settings`):
  - `User`: customer/admin accounts, hashed passwords, licence document metadata, and wishlist references
  - `Car` and `RentalRate`: vehicle specifications, rates, deposits, and extra-kilometre packages
  - `Festival`: per-date pricing multipliers
  - `Booking`: customer reservation, driver, locations, price snapshot, and status
  - `ServiceBlock`: maintenance-unavailable dates
  - `CarType`, `Location`, `Addon`, `Banner`, and `Setting`: homepage categories, pickup/drop-off points, extras, promotions, and business pricing rules
- `backend/src/controllers`: request handling and persistence operations
- `backend/src/routes`: REST resource routes
- `backend/src/middleware`: authentication, role checks, and error responses
- `backend/src/seed`: development car fixtures
- `backend/src/scripts`: database seed command

## Car REST API

- `GET /api/v1/cars`: list, filter, sort, and paginate cars
- `GET /api/v1/cars/:id`: read a car by its stable slug
- `POST /api/v1/cars`: create a car and rental rate
- `PATCH /api/v1/cars/:id`: update a car and/or rental rate
- `DELETE /api/v1/cars/:id`: delete a car and its rental rate

Car creation, updates, and deletion require a bearer token for a user with the `admin` role. Public registration always creates a `customer`; clients cannot self-assign admin access. To provision a development admin, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` and run the seed command. No admin screens are included.

Customer registration and login are available at `POST /api/v1/auth/register` and `POST /api/v1/auth/login`. Passwords are bcrypt-hashed and the API returns a signed bearer token.

## Customer API

- `GET /api/v1/site`: active banners, car types, locations, add-ons, and general pricing settings
- `GET /api/v1/cars`: server-side search, filters, sorting, and pagination
- `GET /api/v1/bookings/availability/:carId?from=YYYY-MM-DD&to=YYYY-MM-DD`: availability based on bookings and service blocks
- `POST /api/v1/bookings/quote`: live server-side quote using rental rates, weekends, festivals, extra-kilometre packages, add-ons, and GST
- `POST /api/v1/bookings`: authenticated reservation creation; the server recalculates the quote and rejects unavailable dates
- `GET /api/v1/bookings/mine` and `GET /api/v1/bookings/mine/:bookingId`: authenticated booking history and detail
- `GET/PATCH /api/v1/profile/me`: authenticated profile
- `GET/POST /api/v1/profile/me/wishlist`: authenticated persisted wishlist

Licence uploads accept JPEG, PNG, WebP, or PDF files up to 3 MB. The file is stored with the user record, while profile APIs return only its filename and type. Booking totals use Pay at Pickup, and the security deposit is saved separately from the trip total. Seed content can be adapted in `backend/src/scripts/seedDemoCars.js`; run `npm run seed` after configuring MongoDB to populate initial database records.

The seed command inserts missing demo/site records without overwriting existing catalog or pricing data. It uses Mongoose's existing lowercase collection names (`rentalrates`, `serviceblocks`, and `cartypes`) so it will not create case-only duplicate collections. It also migrates embedded car service dates into `serviceblocks` without deleting the original legacy fields.

## Demo images

The seven car photos used by the demo fleet are stored locally in `public/assets/cars/` and served by the frontend.

## Tests

Run backend unit and MongoDB integration tests:

```sh
npm run test:backend
```

Integration tests use and clear only the `autovia_test` database. Keep that URI separate from any database containing user data.

Frontend checks:

```sh
npm run build
npm run lint
```
