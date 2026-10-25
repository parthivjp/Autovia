import { Router } from 'express'
import { getSiteContent } from '../controllers/siteController.js'

const router = Router()

router.get('/', getSiteContent)

export default router
