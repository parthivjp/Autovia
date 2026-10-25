import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../services/api'
import { subscribeToSiteUpdates } from '../services/siteUpdates'
import { CarsContext } from './CarsContextValue'

export function CarsProvider({ children }) {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestVersion = useRef(0)
  const fetchCars = useCallback(() => apiRequest('/api/v1/cars'), [])

  const loadCars = useCallback(async (showLoading = false) => {
    const currentRequest = ++requestVersion.current
    if (showLoading) setLoading(true)
    try {
      const result = await fetchCars()
      if (currentRequest === requestVersion.current) {
        setCars(result.cars)
        setError('')
      }
      return result.cars
    } catch (requestError) {
      if (currentRequest === requestVersion.current) setError(requestError.message)
    } finally {
      if (currentRequest === requestVersion.current) setLoading(false)
    }
  }, [fetchCars])

  const refreshCars = useCallback(() => loadCars(true), [loadCars])

  useEffect(() => {
    let active = true
    const currentRequest = ++requestVersion.current
    fetchCars()
      .then((result) => {
        if (active && currentRequest === requestVersion.current) {
          setCars(result.cars)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active && currentRequest === requestVersion.current) setError(requestError.message)
      })
      .finally(() => {
        if (active && currentRequest === requestVersion.current) setLoading(false)
      })
    const unsubscribe = subscribeToSiteUpdates(() => loadCars())
    return () => {
      active = false
      requestVersion.current += 1
      unsubscribe()
    }
  }, [fetchCars, loadCars])

  const value = useMemo(() => ({ cars, loading, error, refreshCars }), [cars, loading, error, refreshCars])
  return <CarsContext.Provider value={value}>{children}</CarsContext.Provider>
}
