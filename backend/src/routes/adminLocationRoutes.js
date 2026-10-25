import { Router } from 'express'
import { createLocation, deleteLocation, listAdminLocations, updateLocation } from '../controllers/locationController.js'
import { authenticate, requireAdmin } from '../middleware/authenticate.js'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/', listAdminLocations)
router.post('/', createLocation)
router.patch('/:id', updateLocation)
router.delete('/:id', deleteLocation)

export default router
