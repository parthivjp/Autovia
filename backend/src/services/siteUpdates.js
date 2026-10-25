const clients = new Set()

export function addSiteUpdateClient(response) {
  clients.add(response)
  response.write('event: connected\ndata: {}\n\n')
  return () => clients.delete(response)
}

export function publishSiteUpdate() {
  for (const response of clients) {
    response.write('event: site-updated\ndata: {}\n\n')
  }
}
