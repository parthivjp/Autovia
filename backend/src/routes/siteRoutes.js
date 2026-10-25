import { Router } from 'express'
import { getSiteContent } from '../controllers/siteController.js'
import { addSiteUpdateClient } from '../services/siteUpdates.js'

const router = Router()

router.get('/events', (_req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()
  const removeClient = addSiteUpdateClient(res)
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000)
  res.on('close', () => {
    clearInterval(heartbeat)
    removeClient()
  })
})

router.get('/', getSiteContent)

export default router
