const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('autovia-token')
  const headers = new Headers(options.headers || {})
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  if (token) headers.set('authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  const result = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    throw new Error(result?.error || `Request failed with status ${response.status}.`)
  }
  return result
}
