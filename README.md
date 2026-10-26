# Autovia

Autovia is a full-stack self-drive car rental platform. Customers can discover
cars, compare vehicle specifications, check date-based availability, receive a
live quote, make a reservation, manage their profile, and review or cancel
eligible bookings. Administrators control the fleet, rates, website content,
availability blocks, bookings, business settings, and administrator account
from a protected workspace.

The customer application and the admin workspace use the same Express API and
MongoDB database. This makes the admin panel the source of truth: changes to
cars, rates, festivals, add-ons, pickup locations, banners, or service blocks
are reflected in customer-facing data without rebuilding the frontend.

## Product capabilities

### Customer experience

- Homepage with database-driven banners, vehicle categories, featured cars,
  benefits, and booking guidance.
- Fleet browsing with server-side search, filtering, sorting, and pagination.
- Filters for vehicle type, fuel, transmission, minimum seats, and maximum
  daily price.
- Vehicle details with images, model year, seats, fuel, transmission, free
  kilometres, current price, pickup locations, and a 14-day availability
  calendar.
- Availability statuses of `Available`, `Booked`, and `Under Service`.
- Registration and login with JWT authentication.
- Profile management for name, phone number, driving licence number, and
  licence document upload.
- Persistent wishlist for saved cars.
- Booking form with pickup and return date, time, location, driver details,
  add-ons, and extra-kilometre packages.
- Server-calculated price quote with a complete breakdown.
- Pay-at-Pickup checkout and confirmation page.
- Booking history with status, booking details, cancellation eligibility, and
  customer cancellation reason.

### Admin workspace

The admin workspace is available under `/admin` and is protected by both
authentication and an administrator-role check.

- Dashboard with today's pickups, returns, completed-return revenue, customer
  count, available cars, and recent bookings.
- Fleet management: add, edit, search, and delete cars.
- Vehicle fields including images, model year, category, fuel, transmission,
  seats, registration number, free-kilometre allowance, featured status, and
  availability status.
- Per-car rental rates for weekday rental, weekend rental, extra kilometres,
  security deposit, and extra-kilometre packages.
- Website content management for car types, pickup locations, add-ons,
  homepage banners, and festival rates.
- Service blocks for marking a particular car unavailable on a particular
  date, with an optional reason.
- Booking search, status filtering, detail review, driver and customer
  information, licence verification, and controlled status transitions.
- Return processing with actual kilometres driven and late hours. The backend
  calculates extra-kilometre and late-return charges and stores the final
  total.
- Business settings for business identity, contact details, GST, late-return
  fee, and cancellation cut-off.
- Administrator profile editing and current-password-protected password
  changes.

## Pricing and booking rules

Quotes are calculated by the backend at `/api/v1/bookings/quote`. The client
does not determine the final price, and booking creation recalculates the
quote before saving the reservation.

For each rental day:

1. The weekday daily rate is used by default.
2. The configured weekend rate is used for Saturday and Sunday.
3. If that exact date has a festival record, the configured festival
   multiplier is applied to that day's base rate.
4. The daily results are stored in the booking's rate breakdown.

The customer total is calculated as:

```text
date-based rental total
+ selected extra-kilometre package
+ selected add-ons
+ GST
```

The refundable security deposit is shown and stored separately from the trip
total. The default free-kilometre allowance is stored per car. At return, the
administrator enters actual kilometres driven; kilometres beyond the allowed
amount are charged using the car's extra-kilometre rate. Late hours are
charged using the configured late-return fee.

A quote is rejected when:

- the pickup or return dates are invalid;
- the pickup date is in the past;
- the return date is not after pickup;
- the car is under service;
- the selected dates overlap a service block or active booking;
- either location is inactive or invalid;
- an add-on or extra-kilometre package is unavailable; or
- the car has no configured rental rate.

Customer cancellation is allowed only for `pending` or `confirmed` bookings
and only before the configured cancellation deadline. The cancellation reason,
time, and actor are persisted in the booking document. Cancelled bookings no
longer block the car's dates.

## Application routes

### Customer routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/cars` | Searchable and filterable fleet |
| `/cars/:carId` | Vehicle details and availability |
| `/booking/:carId` | Booking form and live quote |
| `/confirmation/:bookingId` | Saved booking confirmation |
| `/wishlist` | Saved cars |
| `/login` | Customer login |
| `/register` | Customer registration |
| `/profile` | Profile, licence document, and booking history |

### Admin routes

| Route | Purpose |
| --- | --- |
| `/admin/login` | Administrator login |
| `/admin` | Dashboard |
| `/admin/cars` | Fleet and per-car rates |
| `/admin/bookings` | Booking operations |
| `/admin/content` | Car types, locations, add-ons, banners, festivals, and service blocks |
| `/admin/settings` | Business settings, admin profile, and password |

## Technology stack

### Frontend

- React 19
- Vite
- React Router
- Framer Motion
- Lucide React
- React Hot Toast
- Plain CSS files organized by page/component convention

### Backend

- Node.js with native ES modules
- Express 5
- Mongoose 8
- MongoDB
- JSON Web Tokens
- bcryptjs
- Server-Sent Events for site-content update notifications

### Repository layout

```text
.
├── backend/
│   ├── src/
│   │   ├── config/          MongoDB configuration
│   │   ├── controllers/     Request handling and business rules
│   │   ├── middleware/      Authentication, authorization, and errors
│   │   ├── models/          Mongoose schemas
│   │   ├── routes/          API route definitions
│   │   ├── scripts/         Seeding and data migration scripts
│   │   ├── seed/            Development fixture data
│   │   └── server.js        Backend entry point
│   ├── test/                Backend tests
│   └── .env.example         Environment template
├── public/                  Static assets and demo car images
├── src/
│   ├── components/          Shared customer and layout components
│   ├── context/             Authentication, cars, and wishlist state
│   ├── hooks/               Site-content hooks
│   ├── pages/               Customer and admin screens
│   ├── services/            API and live-update clients
│   └── styles/              Global styles and design tokens
├── index.html
└── package.json
```

## Data model

MongoDB stores the following application areas:

- `users`: customer and administrator accounts, password hashes, profile
  details, licence metadata, and wishlist references.
- `cars`: vehicle identity, specifications, images, registration number,
  featured flag, and status.
- `rentalrates`: weekday/weekend rates, extra-kilometre pricing, packages,
  and security deposits.
- `bookings`: reservation dates, locations, driver details, price snapshot,
  status, cancellation details, licence verification, and return charges.
- `festivals`: exact calendar dates and pricing multipliers.
- `serviceblocks`: car-specific unavailable dates and reasons.
- `cartypes`: customer-visible vehicle categories.
- `locations`: active pickup and return locations.
- `addons`: optional booking extras and prices.
- `banners`: homepage content and ordering.
- `settings`: general business and pricing settings.

Booking documents keep a pricing snapshot and per-day rate breakdown. This
preserves the amount quoted at booking time even if an administrator later
changes the current catalogue rate.

## API overview

The backend listens under `/api/v1`.

### Public and customer APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register a customer |
| `POST` | `/auth/login` | Log in a customer or administrator |
| `GET` | `/cars` | Search, filter, sort, and paginate cars |
| `GET` | `/cars/:id` | Read a car by slug |
| `GET` | `/site` | Read active banners, categories, locations, add-ons, and settings |
| `GET` | `/site/events` | Receive live site-content update events |
| `GET` | `/bookings/availability/:id` | Read date availability for a car |
| `POST` | `/bookings/quote` | Calculate a live quote |
| `POST` | `/bookings` | Create an authenticated booking |
| `GET` | `/bookings/mine` | List the signed-in customer's bookings |
| `GET` | `/bookings/mine/:id` | Read one customer booking |
| `POST` | `/bookings/mine/:id/cancel` | Cancel an eligible customer booking |
| `GET/PATCH` | `/profile/me` | Read or update the customer profile |
| `GET/POST` | `/profile/me/wishlist` | Read or update the customer wishlist |

### Admin APIs

All admin endpoints require a bearer token for a user with `role: admin`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/admin/dashboard` | Dashboard metrics and schedules |
| `GET/PATCH` | `/admin/profile` | Read or update administrator profile |
| `PATCH` | `/admin/profile/password` | Change administrator password |
| `GET` | `/admin/cars` | Read the admin fleet view with rates |
| `GET` | `/admin/bookings` | Search and filter bookings |
| `GET/PATCH` | `/admin/bookings/:bookingId` | Read or update a booking |
| `GET` | `/admin/resources` | Read all managed website resources |
| `PUT` | `/admin/settings` | Update business settings |
| `POST/PATCH/DELETE` | `/admin/resources/:resource[/:id]` | Manage car types, add-ons, banners, and festivals |
| `POST/PATCH/DELETE` | `/admin/locations[/:id]` | Manage pickup locations |
| `POST/PATCH/DELETE` | `/admin/service-blocks[/:id]` | Manage car service blocks |

## Local development

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or an accessible MongoDB deployment

### Installation

From the repository root:

```sh
npm install
npm install --prefix backend
```

Create `backend/.env` from the supplied template:

```sh
copy backend\.env.example backend\.env
```

Use a long, private value for `JWT_SECRET`. The default local configuration
uses:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/autovia
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
```

To create or update a development administrator during seeding, set
`ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`. Do not commit
`backend/.env`.

### Seed development data

```sh
npm run seed
```

The seed is idempotent. It inserts missing demo cars, rates, car types,
locations, add-ons, banners, festivals, settings, and other site records
without intentionally overwriting existing catalogue or pricing data.

### Run the application

Run both applications together:

```sh
npm run dev
```

The default URLs are:

- Customer website: `http://localhost:5173`
- Backend API: `http://localhost:4000`
- API health check: `http://localhost:4000/api/v1/health`
- Admin login: `http://localhost:5173/admin/login`

Run either side independently when needed:

```sh
npm run client
npm run server
```

Customer accounts are created through `/register`. The administrator account
is provisioned from the `ADMIN_EMAIL` and `ADMIN_PASSWORD` seed settings; a
normal customer account cannot grant itself admin access.

## Configuration reference

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Backend port; defaults to `4000` |
| `MONGODB_URI` | No | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign authentication tokens |
| `CLIENT_ORIGIN` | No | Allowed frontend origin for CORS |
| `ADMIN_EMAIL` | For seeding admin | Development administrator email |
| `ADMIN_PASSWORD` | For seeding admin | Development administrator password |

## Testing and quality checks

Run the backend unit and integration tests:

```sh
npm run test:backend
```

The integration tests use the separate `autovia_test` database. Keep that
database separate from any database containing real or development user data.

Build the production frontend:

```sh
npm run build
```

Run the repository linter:

```sh
npm run lint
```

## Render and MongoDB Atlas deployment

The repository includes [render.yaml](./render.yaml), which defines:

- `autovia-api`: a Node web service running the Express backend;
- `autovia-web`: a Render Static Site serving the Vite build; and
- a linked frontend-to-backend API URL and backend CORS origin.

The Blueprint does not create the MongoDB Atlas project or cluster. Atlas is
kept separate from Render so the database lifecycle and network access can be
managed independently.

### 1. Create the MongoDB Atlas database

1. Create a MongoDB Atlas project and a free or paid cluster.
2. Create a database user with a strong password.
3. Add the Render outbound IP policy required by your Atlas plan. For an
   initial Render deployment, Atlas commonly uses `0.0.0.0/0`; restrict this
   later with a managed network policy or private networking where available.
4. Copy the Atlas driver connection string and replace its username,
   password, and database name with `autovia`.

The value should resemble:

```text
mongodb+srv://<username>:<password>@<cluster-host>/autovia?retryWrites=true&w=majority
```

Keep the connection string private. It must only be entered as the Render
`MONGODB_URI` environment variable and must never be committed.

### 2. Create the Render services

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select this repository.
3. Render reads `render.yaml` and proposes both services.
4. Enter the secret values requested for:
   - `MONGODB_URI`: the Atlas connection string;
   - `ADMIN_EMAIL`: the administrator email to provision; and
   - `ADMIN_PASSWORD`: a strong administrator password.
5. Deploy the Blueprint and wait for `autovia-api` to pass
   `/api/v1/health`.
6. Open the frontend service URL and use `/admin/login` for the administrator
   workspace.

The Blueprint generates `JWT_SECRET` on Render. Do not replace it with a
value committed to source control. The frontend receives the backend URL at
build time through `VITE_API_URL`, while the backend receives the frontend
host through `CLIENT_ORIGIN`.

### 3. Seed Atlas data

After the backend service is deployed, run the seed command from a local
checkout using the Atlas URI:

```powershell
$env:MONGODB_URI = "mongodb+srv://<username>:<password>@<cluster-host>/autovia?retryWrites=true&w=majority"
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_PASSWORD = "use-a-strong-password"
npm run seed
```

Alternatively, run the same command through a Render Shell for the
`autovia-api` service if the plan provides shell access. The seed is
idempotent and inserts missing demo and site records without intentionally
overwriting existing catalogue or pricing data.

### 4. Verify the deployment

Check the following after deployment:

```text
https://<autovia-api>.onrender.com/api/v1/health
https://<autovia-web>.onrender.com/
https://<autovia-web>.onrender.com/admin/login
```

Create a customer account, browse the fleet, request a quote, and place a
test Pay-at-Pickup booking. Then update a banner, rate, location, or service
block in the admin panel and confirm that the customer site reflects it.

Render free web services may sleep after inactivity. The first request after a
sleep can take longer while the service starts.

The cancellation migration is available for databases containing records
created before structured cancellation data was introduced:

```sh
npm --prefix backend run migrate:cancellations
```

## Security and data handling

- Passwords are stored as bcrypt hashes and never returned by profile APIs.
- JWTs are required for authenticated customer operations.
- Admin routes require both authentication and the administrator role.
- Customer registration always creates a customer account.
- Licence document contents are excluded from normal user JSON responses.
- File uploads are limited to JPEG, PNG, WebP, or PDF and 3 MB for customer
  licence documents. Admin car images accept JPEG, PNG, or WebP within the
  configured request-size limit.
- API-side validation is applied again during quote and booking creation; the
  frontend is not trusted to provide final totals or availability.
- CORS is restricted to the configured frontend origin.
- Environment files containing secrets are excluded from source control.

## Live content updates

The frontend subscribes to `/api/v1/site/events` using Server-Sent Events.
Admin mutations publish an update event after successful changes. Customer
catalogue, homepage content, locations, pricing settings, admin views, and
booking lists refresh when they receive that event, while normal page loads
always fetch the current database state.

If the frontend reports a Vite proxy error for `/api/v1/site/events` while the
backend is restarting, wait for the backend to finish listening on port 4000
and refresh the page. The endpoint is a long-lived event stream, so a browser
may show a normal reconnect attempt during development restarts.

## Scope notes

The core rental workflow is implemented around daily rentals, pay-at-pickup,
database-managed content, and MongoDB persistence. Coupon codes, hourly rental
plans, payment-gateway collection of security deposits, and production
deployment configuration are not part of the current application scope.
