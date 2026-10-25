import cors from 'cors'
import express from 'express'
import authRoutes from './routes/authRoutes.js'
import carRoutes from './routes/carRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
  app.use(express.json({ limit: '1mb' }))
  app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/cars', carRoutes)
  app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }))
  app.use(errorHandler)

  return app
}
