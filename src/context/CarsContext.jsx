import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { CarsContext } from './CarsContextValue'

export function CarsProvider({ children }) {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshCars = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/api/v1/cars')
      setCars(result.cars)
      return result.cars
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    apiRequest('/api/v1/cars')
      .then((result) => {
        if (active) setCars(result.cars)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => ({ cars, loading, error, refreshCars }), [cars, loading, error])
  return <CarsContext.Provider value={value}>{children}</CarsContext.Provider>
}
