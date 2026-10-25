import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)
const EMPTY_WISHLIST = []

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [wishlist, setWishlist] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!user) {
      return () => { active = false }
    }
    apiRequest('/api/v1/profile/me/wishlist')
      .then(({ cars }) => {
        if (active) setWishlist(cars.map((car) => car.id))
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
    return () => { active = false }
  }, [user])

  const toggleWishlist = useCallback(async (carId) => {
    if (!user) return false
    const action = wishlist.includes(carId) ? 'remove' : 'add'
    const result = await apiRequest('/api/v1/profile/me/wishlist', {
      method: 'POST',
      body: JSON.stringify({ carId, action }),
    })
    setWishlist(result.wishlist)
    setError('')
    return true
  }, [user, wishlist])

  const clearWishlist = useCallback(async () => {
    await Promise.all(wishlist.map((carId) => apiRequest('/api/v1/profile/me/wishlist', {
      method: 'POST',
      body: JSON.stringify({ carId, action: 'remove' }),
    })))
    setWishlist([])
  }, [wishlist])

  const visibleWishlist = user ? wishlist : EMPTY_WISHLIST
  const value = useMemo(
    () => ({ wishlist: visibleWishlist, toggleWishlist, clearWishlist, error }),
    [visibleWishlist, toggleWishlist, clearWishlist, error],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider')
  return context
}
