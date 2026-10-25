# DriveNGo Car Rental Website

A self-drive car rental web app featuring a customer website and an admin control panel.

## Features

- Customer homepage with banners, featured cars and segmented car types
- Car listings with search, filters, sorting and pricing details
- Car detail page with availability calendar
- Booking flow with add-ons, GST breakdown and security deposit
- Customer registration, login and profile state
- Wishlist saving for cars
- Admin login and dashboard for customers, bookings and settings
- Admin CRUD for cars and configuration changes that flow directly to the customer website

## Stack

- React + Vite frontend
- Express backend with JSON persistence
- Shared data model serving both the customer app and admin panel

## Local setup

1. Install dependencies:
   npm install
2. Start the app in development mode:
   npm run dev
3. Open the frontend at http://localhost:5173
4. API runs at http://localhost:4000

## Demo accounts

Customer:
- Email: customer@example.com
- Password: password123

Admin:
- Email: admin@drivengo.in
- Password: admin123

## Notes

- The application uses a local JSON store under `server/data/store.json` for quick demo persistence.
- The admin panel updates the same shared data source used by the customer-facing pages, so changes are reflected immediately.
- Do not commit `.env`; use `.env.example` as the template.
