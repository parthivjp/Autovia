import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, 'server', 'data', 'store.json');
const port = 4000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

async function ensureStore() {
  try {
    await fs.access(dataFilePath);
  } catch {
    await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
    const defaultData = {
      settings: {
        gstPercent: 18,
        businessName: 'DriveNGo Rentals',
        contactPhone: '+91 98765 43210',
        contactEmail: 'hello@drivengo.in',
        lateReturnChargePerHour: 250,
        cancellationCutoffHours: 24,
      },
      banners: [],
      carTypes: [],
      locations: [],
      addons: [],
      adminUser: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@drivengo.in',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
      },
      users: [],
      cars: [],
      festivalDates: [],
      bookings: [],
      wishlist: [],
    };
    await fs.writeFile(dataFilePath, JSON.stringify(defaultData, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(dataFilePath, 'utf8');
  return JSON.parse(raw);
}

async function writeStore(data) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
}

function buildCarSummary(car, locations, carTypes, festivalDates) {
  const carType = carTypes.find((type) => type.id === car.type)?.name || car.type;
  const locationLabels = (car.pickupLocations || []).map(
    (id) => locations.find((location) => location.id === id)?.name || id,
  );

  return {
    ...car,
    carType,
    pickupLocationNames: locationLabels,
    festivalDates,
  };
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'drive-n-go-api' });
});

app.get('/api/site', async (_, res) => {
  const store = await readStore();
  res.json({
    settings: store.settings,
    banners: store.banners,
    carTypes: store.carTypes,
    locations: store.locations,
    addons: store.addons,
    cars: store.cars.map((car) => buildCarSummary(car, store.locations, store.carTypes, store.festivalDates)),
    users: store.users,
    bookings: store.bookings,
    festivalDates: store.festivalDates,
  });
});

app.get('/api/dashboard', async (_, res) => {
  const store = await readStore();
  const today = new Date().toISOString().slice(0, 10);

  const todayPickups = store.bookings.filter((booking) => booking.pickupDate === today && booking.status !== 'Cancelled').length;
  const todayReturns = store.bookings.filter((booking) => booking.returnDate === today && booking.status !== 'Cancelled').length;
  const totalRevenue = store.bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
  const availableCars = store.cars.filter((car) => car.status === 'available').length;
  const usersCount = store.users.length;

  res.json({
    todayPickups,
    todayReturns,
    totalRevenue,
    usersCount,
    availableCars,
    bookingsCount: store.bookings.length,
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, address, drivingLicense } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const store = await readStore();
  const existing = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'A user with that email already exists.' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    address: address || '',
    drivingLicense: drivingLicense || '',
    passwordHash: await bcrypt.hash(password, 10),
    role: 'customer',
  };

  store.users.push(newUser);
  await writeStore(store);

  const { passwordHash: _passwordHash, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const store = await readStore();
  const user = store.users.find((record) => record.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const store = await readStore();
  const admin = store.adminUser;

  if (!admin || admin.email.toLowerCase() !== email.toLowerCase()) {
    return res.status(401).json({ error: 'Admin credentials are invalid.' });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Admin credentials are invalid.' });
  }

  const { passwordHash: _passwordHash, ...safeAdmin } = admin;
  res.json({ admin: safeAdmin });
});

app.post('/api/bookings', async (req, res) => {
  const store = await readStore();
  const booking = {
    id: `booking-${Date.now()}`,
    ...req.body,
    status: 'Pending',
  };

  store.bookings.push(booking);
  await writeStore(store);
  res.status(201).json({ booking });
});

app.put('/api/bookings/:id', async (req, res) => {
  const store = await readStore();
  const idx = store.bookings.findIndex((booking) => booking.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  store.bookings[idx] = { ...store.bookings[idx], ...req.body };
  await writeStore(store);
  res.json({ booking: store.bookings[idx] });
});

app.post('/api/cars', async (req, res) => {
  const store = await readStore();
  const car = {
    id: `car-${Date.now()}`,
    ...req.body,
    status: req.body.status || 'available',
    featured: Boolean(req.body.featured),
    pickupLocations: req.body.pickupLocations || [],
    serviceBlocks: req.body.serviceBlocks || [],
  };

  store.cars.push(car);
  await writeStore(store);
  res.status(201).json({ car });
});

app.put('/api/cars/:id', async (req, res) => {
  const store = await readStore();
  const idx = store.cars.findIndex((car) => car.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Car not found.' });
  }

  store.cars[idx] = { ...store.cars[idx], ...req.body };
  await writeStore(store);
  res.json({ car: store.cars[idx] });
});

app.delete('/api/cars/:id', async (req, res) => {
  const store = await readStore();
  const before = store.cars.length;
  store.cars = store.cars.filter((car) => car.id !== req.params.id);
  if (store.cars.length === before) {
    return res.status(404).json({ error: 'Car not found.' });
  }

  await writeStore(store);
  res.json({ success: true });
});

app.put('/api/settings', async (req, res) => {
  const store = await readStore();
  store.settings = { ...store.settings, ...req.body };
  await writeStore(store);
  res.json({ settings: store.settings });
});

app.put('/api/booking-status/:id', async (req, res) => {
  const store = await readStore();
  const idx = store.bookings.findIndex((booking) => booking.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  const booking = store.bookings[idx];
  store.bookings[idx] = { ...booking, ...req.body };
  await writeStore(store);
  res.json({ booking: store.bookings[idx] });
});

app.put('/api/wishlist', async (req, res) => {
  const store = await readStore();
  store.wishlist = req.body.items || [];
  await writeStore(store);
  res.json({ wishlist: store.wishlist });
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get(/^(?!\/api).*/, async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  try {
    const indexHtml = await fs.readFile(path.join(distPath, 'index.html'), 'utf8');
    return res.send(indexHtml);
  } catch {
    return res.send('Build the client before running the production mode.');
  }
});

app.listen(port, () => {
  console.log(`DriveNGo API running at http://localhost:${port}`);
});
