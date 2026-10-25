import { createContext, useContext, useMemo, useState } from 'react'
import { apiRequest } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('autovia-token')
    const storedUser = localStorage.getItem('autovia-user')
    return storedToken && storedUser ? JSON.parse(storedUser) : null
  })

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('autovia-user', JSON.stringify(updatedUser))
  }

  const login = async ({ email, password }) => {
    const result = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    updateUser(result.user)
    localStorage.setItem('autovia-token', result.token)
    return result.user
  }

  const register = async ({ name, email, password, phone, drivingLicense, drivingLicenseDocument }) => {
    const result = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, drivingLicense, drivingLicenseDocument }),
    })
    updateUser(result.user)
    localStorage.setItem('autovia-token', result.token)
    return result.user
  }

  const saveProfile = async (profile) => {
    const result = await apiRequest('/api/v1/profile/me', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    })
    updateUser(result.user)
    return result.user
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('autovia-user')
    localStorage.removeItem('autovia-token')
  }

  const value = useMemo(() => ({ user, login, register, saveProfile, updateUser, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
