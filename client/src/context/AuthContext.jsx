import { createContext, useContext, useState, useCallback } from 'react'
import { getApiBase } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('fsm_auth_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${getApiBase()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('fsm_auth_token', data.token)
    localStorage.setItem('fsm_auth_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('fsm_auth_token')
    localStorage.removeItem('fsm_auth_user')
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'
  const isEngineer = user?.role === 'engineer'

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isEngineer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
