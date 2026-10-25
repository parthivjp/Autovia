import { useContext } from 'react'
import { CarsContext } from './CarsContextValue'

export function useCars() {
  const context = useContext(CarsContext)
  if (!context) throw new Error('useCars must be used within CarsProvider')
  return context
}
