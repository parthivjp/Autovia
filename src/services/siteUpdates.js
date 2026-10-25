let eventSource
const subscribers = new Set()

function connect() {
  if (eventSource || !subscribers.size || typeof EventSource === 'undefined') return

  eventSource = new EventSource('/api/v1/site/events')
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
