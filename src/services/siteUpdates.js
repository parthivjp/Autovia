let eventSource
const subscribers = new Set()
const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function connect() {
  if (eventSource || !subscribers.size || typeof EventSource === 'undefined') return

  eventSource = new EventSource(`${apiBaseUrl}/api/v1/site/events`)
  eventSource.addEventListener('site-updated', () => {
    for (const subscriber of subscribers) subscriber()
  })
  eventSource.onerror = () => {
    eventSource?.close()
    eventSource = undefined
    window.setTimeout(connect, 1000)
  }
}

export function subscribeToSiteUpdates(callback) {
  subscribers.add(callback)
  connect()

  return () => {
    subscribers.delete(callback)
    if (!subscribers.size) {
      eventSource?.close()
      eventSource = undefined
    }
  }
}
