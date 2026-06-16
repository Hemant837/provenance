"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { clearToken, fetchMe, getToken } from "@/lib/api"
import type { User } from "@/lib/schemas"

type AuthState = {
  user: User | null
  loading: boolean
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()

  const refresh = React.useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      setUser(await fetchMe())
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    // Defer to a microtask so the initial load doesn't setState synchronously
    // within the effect body.
    void Promise.resolve().then(refresh)
  }, [refresh])

  const logout = React.useCallback(() => {
    clearToken()
    setUser(null)
    router.push("/login")
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

/** Redirects to /login if not authenticated once loading settles. */
export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()
  React.useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [loading, user, router])
  return { user, loading }
}
