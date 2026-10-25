import { Router } from 'express'
import { getProfile, getWishlist, updateProfile, updateWishlist } from '../controllers/profileController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.use(authenticate)
router.get('/me', getProfile)
router.patch('/me', updateProfile)
router.get('/me/wishlist', getWishlist)
router.post('/me/wishlist', updateWishlist)

export default router
