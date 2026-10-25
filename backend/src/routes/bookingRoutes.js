import { Router } from 'express'
import { createBooking, getAvailability, getMyBooking, listMyBookings, quoteBooking } from '../controllers/bookingController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.post('/quote', quoteBooking)
router.post('/', authenticate, createBooking)
router.get('/mine', authenticate, listMyBookings)
router.get('/mine/:id', authenticate, getMyBooking)
router.get('/availability/:id', getAvailability)

export default router
