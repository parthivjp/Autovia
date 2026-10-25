import { createContext, useContext, useMemo, useState } from 'react'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem('autovia-wishlist')
    return saved ? JSON.parse(saved) : []
  })

  const toggleWishlist = (carId) => {
    setWishlist((current) => {
      const next = current.includes(carId)
        ? current.filter((id) => id !== carId)
        : [...current, carId]
      localStorage.setItem('autovia-wishlist', JSON.stringify(next))
      return next
    })
  }

  const clearWishlist = () => {
    setWishlist([])
    localStorage.removeItem('autovia-wishlist')
  }

  const value = useMemo(() => ({ wishlist, toggleWishlist, clearWishlist }), [wishlist])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider')
  return context
}
