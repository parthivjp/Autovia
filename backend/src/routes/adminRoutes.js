import { Router } from 'express'
import {
  createAdminResource,
  createServiceBlock,
  deleteAdminResource,
  deleteServiceBlock,
  getAdminBooking,
  getAdminDashboard,
  getAdminResources,
  listAdminBookings,
  updateAdminBooking,
  updateAdminResource,
  updateAdminSettings,
  updateServiceBlock,
} from '../controllers/adminController.js'
import { listAdminCars } from '../controllers/carController.js'
import { authenticate, requireAdmin } from '../middleware/authenticate.js'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/dashboard', getAdminDashboard)
router.get('/resources', getAdminResources)
router.get('/cars', listAdminCars)
router.get('/bookings', listAdminBookings)
router.get('/bookings/:bookingId', getAdminBooking)
router.patch('/bookings/:bookingId', updateAdminBooking)
router.put('/settings', updateAdminSettings)
router.post('/service-blocks', createServiceBlock)
router.patch('/service-blocks/:id', updateServiceBlock)
router.delete('/service-blocks/:id', deleteServiceBlock)
router.post('/resources/:resource', createAdminResource)
router.patch('/resources/:resource/:id', updateAdminResource)
router.delete('/resources/:resource/:id', deleteAdminResource)

export default router
