import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../services/api'
import { subscribeToSiteUpdates } from '../services/siteUpdates'

const initialContent = {
  banners: [],
  carTypes: [],
  locations: [],
  addons: [],
  settings: { businessName: 'Autovia', gstRate: 0.18 },
}

export function useSiteContent() {
  const [data, setData] = useState(initialContent)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const requestVersion = useRef(0)

  useEffect(() => {
    let active = true
    const refresh = () => {
      const currentRequest = ++requestVersion.current
      apiRequest('/api/v1/site')
        .then((content) => {
          if (!active || currentRequest !== requestVersion.current) return
          setData(content)
          setError('')
          setVersion((current) => current + 1)
        })
        .catch((requestError) => {
          if (active && currentRequest === requestVersion.current) setError(requestError.message)
        })
        .finally(() => {
          if (active && currentRequest === requestVersion.current) setLoading(false)
        })
    }

    refresh()
    const unsubscribe = subscribeToSiteUpdates(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return { data, loading, error, version }
}
