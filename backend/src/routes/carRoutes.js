import { Router } from 'express'
import { createCar, deleteCar, getCar, listCars, updateCar } from '../controllers/carController.js'
import { authenticate, requireAdmin } from '../middleware/authenticate.js'

const router = Router()

router.get('/', listCars)
router.get('/:id', getCar)
router.post('/', authenticate, requireAdmin, createCar)
router.patch('/:id', authenticate, requireAdmin, updateCar)
router.delete('/:id', authenticate, requireAdmin, deleteCar)

export default router
