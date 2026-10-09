import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { getToken, setToken, setUnauthorizedHandler } from "../api/client"
import * as authApi from "../api/auth"
import type { User } from "../types"

const USER_KEY = "stocksense_user"

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, role?: User["role"]) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    const token = getToken()
    const storedUser = localStorage.getItem(USER_KEY)
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        logout()
      }
    }
    setIsLoading(false)
    setUnauthorizedHandler(logout)
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password })
    setToken(result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
    setUser(result.user)
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string, role?: User["role"]) => {
    const result = await authApi.signup({ name, email, password, role })
    setToken(result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
    setUser(result.user)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isLoading, login, signup, logout }),
    [user, isLoading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
