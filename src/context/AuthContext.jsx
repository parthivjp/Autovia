import { createContext, useContext, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('autovia-token')
    const storedUser = localStorage.getItem('autovia-user')
    return storedToken && storedUser ? JSON.parse(storedUser) : null
  })

  const login = async ({ email, password }) => {
    const result = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setUser(result.user)
    localStorage.setItem('autovia-user', JSON.stringify(result.user))
    localStorage.setItem('autovia-token', result.token)
    return true
  }

  const register = async ({ name, email, password, phone, drivingLicense }) => {
    const result = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, drivingLicense }),
    })
    setUser(result.user)
    localStorage.setItem('autovia-user', JSON.stringify(result.user))
    localStorage.setItem('autovia-token', result.token)
    return result.user
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('autovia-user')
    localStorage.removeItem('autovia-token')
  }

  const value = useMemo(() => ({ user, login, register, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
