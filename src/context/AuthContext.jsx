import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

const demoUser = {
  id: 'u-demo-1',
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  phone: '+91 99887 66554',
  drivingLicense: 'DL-2024-3345',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('autovia-user')
    return storedUser ? JSON.parse(storedUser) : null
  })

  const login = ({ email, password }) => {
    if (email === 'aarav@example.com' && password === 'password123') {
      const nextUser = { ...demoUser, email }
      setUser(nextUser)
      localStorage.setItem('autovia-user', JSON.stringify(nextUser))
      return true
    }

    return false
  }

  const register = ({ name, email, phone, drivingLicense }) => {
    const nextUser = { id: `u-${Date.now()}`, name, email, phone, drivingLicense: drivingLicense || 'Pending review' }
    setUser(nextUser)
    localStorage.setItem('autovia-user', JSON.stringify(nextUser))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('autovia-user')
  }

  const value = useMemo(() => ({ user, login, register, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
