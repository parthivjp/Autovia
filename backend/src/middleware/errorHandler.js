export function errorHandler(error, _req, res, _next) {
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ error: error.message })
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value'
    return res.status(409).json({ error: `A record with this ${field} already exists.` })
  }

  console.error(error)
  return res.status(500).json({ error: 'An unexpected server error occurred.' })
}
