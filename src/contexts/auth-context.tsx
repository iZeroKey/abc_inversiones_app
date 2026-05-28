import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import { clearPersistedQueryCache } from "@/lib/query-client"

type AuthSession = {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
}

type AuthUser = {
  id: string
  authUserId?: string | null
  publicCode?: string | null
  email?: string | null
  firstName?: string
  lastName?: string
  phone?: string | null
  dni?: string | null
  address?: string | null
  bank?: string | null
  bankAccounts?: string[]
  maritalStatus?: "single" | "married" | "unspecified" | null
  avatarUrl?: string | null
  role?: string
  isOwner?: boolean
  active?: boolean
}

type AuthState = {
  session: AuthSession | null
  user: AuthUser | null
  isHydrating: boolean
}

type LoginPayload = {
  session: AuthSession
  user?: AuthUser
  remember: boolean
}

type AuthContextValue = AuthState & {
  isAuthenticated: boolean
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  login: (payload: LoginPayload) => void
  logout: () => void
  updateProfile: (userData: Partial<AuthUser>) => void
}

type RefreshResponse = {
  success: boolean
  data?: {
    session?: AuthSession
  }
}

type UserProfileResponse = {
  success: boolean
  data?: AuthUser
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")

const STORAGE_KEYS = {
  session: "auth.session",
  user: "auth.user",
} as const

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStorage(storage: Storage) {
  const sessionRaw = storage.getItem(STORAGE_KEYS.session)
  const userRaw = storage.getItem(STORAGE_KEYS.user)
  if (!sessionRaw) return null

  try {
    const session = JSON.parse(sessionRaw) as AuthSession
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null
    return { session, user }
  } catch {
    storage.removeItem(STORAGE_KEYS.session)
    storage.removeItem(STORAGE_KEYS.user)
    return null
  }
}

function getInitialAuthState(): AuthState {
  if (typeof window === "undefined") {
    return {
      session: null,
      user: null,
      isHydrating: true,
    }
  }

  const fromLocal = readStorage(localStorage)
  const fromSession = fromLocal ? null : readStorage(sessionStorage)
  const data = fromLocal ?? fromSession

  return {
    session: data?.session ?? null,
    user: data?.user ?? null,
    isHydrating: false,
  }
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEYS.session)
  localStorage.removeItem(STORAGE_KEYS.user)
  sessionStorage.removeItem(STORAGE_KEYS.session)
  sessionStorage.removeItem(STORAGE_KEYS.user)
}

function getActiveStorage() {
  return localStorage.getItem(STORAGE_KEYS.session) ? localStorage : sessionStorage
}

function addExpiry(session: AuthSession): AuthSession {
  return {
    ...session,
    expires_at: Date.now() + session.expires_in * 1000,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialAuthState)
  const stateRef = useRef<AuthState>(state)
  const refreshPromiseRef = useRef<Promise<AuthSession | null> | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!state.session?.expires_at) return

    const remainingMs = state.session.expires_at - Date.now() - 60_000
    const timeoutId = window.setTimeout(() => {
      void refreshSession()
    }, Math.max(remainingMs, 0))

    return () => window.clearTimeout(timeoutId)

    async function refreshSession() {
      if (!state.session?.refresh_token || !API_BASE_URL) {
        clearStoredAuth()
        setState({ session: null, user: null, isHydrating: false })
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token: state.session.refresh_token,
          }),
        })
        const payload = (await response.json().catch(() => null)) as RefreshResponse | null

        if (!response.ok || !payload?.success || !payload.data?.session) {
          throw new Error("Refresh token invalido o expirado")
        }

        const refreshedSession = addExpiry(payload.data.session)
        getActiveStorage().setItem(STORAGE_KEYS.session, JSON.stringify(refreshedSession))
        setState((prev) => ({ ...prev, session: refreshedSession, isHydrating: false }))
      } catch {
        clearStoredAuth()
        setState({ session: null, user: null, isHydrating: false })
      }
    }
  }, [state.session?.expires_at, state.session?.refresh_token])

  useEffect(() => {
    if (!state.session?.access_token || !API_BASE_URL) return

    const accessToken = state.session.access_token
    let cancelled = false

    void (async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const payload = (await response.json().catch(() => null)) as UserProfileResponse | null

      if (cancelled || !response.ok || !payload?.success || !payload.data) return

      const profile = payload.data
      setState((prev) => {
        if (!prev.session) return prev
        const nextUser: AuthUser = { ...prev.user, ...profile, id: profile.id }
        getActiveStorage().setItem(STORAGE_KEYS.user, JSON.stringify(nextUser))
        return { ...prev, user: nextUser, isHydrating: false }
      })
    })().catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [state.session?.access_token])

  const persistSession = useCallback((session: AuthSession) => {
    const sessionWithExpiry = addExpiry(session)
    getActiveStorage().setItem(STORAGE_KEYS.session, JSON.stringify(sessionWithExpiry))
    setState((prev) => ({ ...prev, session: sessionWithExpiry, isHydrating: false }))
    return sessionWithExpiry
  }, [])

  const logout = useCallback(() => {
    const currentSession = stateRef.current.session
    if (currentSession?.access_token && API_BASE_URL) {
      void fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      }).catch(() => undefined)
    }
    clearStoredAuth()
    clearPersistedQueryCache()
    setState({ session: null, user: null, isHydrating: false })
  }, [])

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const currentSession = stateRef.current.session
    if (!currentSession?.refresh_token || !API_BASE_URL) {
      logout()
      return null
    }

    refreshPromiseRef.current = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh_token: currentSession.refresh_token,
          }),
        })
        const payload = (await response.json().catch(() => null)) as RefreshResponse | null

        if (!response.ok || !payload?.success || !payload.data?.session) {
          logout()
          return null
        }

        return persistSession(payload.data.session)
      } catch {
        logout()
        return null
      } finally {
        refreshPromiseRef.current = null
      }
    })()

    return refreshPromiseRef.current
  }, [logout, persistSession])

  const fetchWithAuth = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const currentSession = stateRef.current.session
    const activeSession =
      currentSession?.expires_at && currentSession.expires_at <= Date.now() + 30_000
        ? await refreshSession()
        : currentSession
    const headers = new Headers(init.headers)
    if (activeSession?.access_token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${activeSession.access_token}`)
    }

    const response = await fetch(input, { ...init, headers })
    if (response.status !== 401) return response

    const refreshedSession = await refreshSession()
    if (!refreshedSession) return response

    const retryHeaders = new Headers(init.headers)
    retryHeaders.set("Authorization", `Bearer ${refreshedSession.access_token}`)
    return fetch(input, { ...init, headers: retryHeaders })
  }, [refreshSession])

  const login = useCallback(({ session, user, remember }: LoginPayload) => {
    const previousUserId = stateRef.current.user?.id
    if (previousUserId && user?.id && previousUserId !== user.id) {
      clearPersistedQueryCache()
    }

    const sessionWithExpiry = addExpiry(session)
    const storage = remember ? localStorage : sessionStorage
    const otherStorage = remember ? sessionStorage : localStorage

    storage.setItem(STORAGE_KEYS.session, JSON.stringify(sessionWithExpiry))
    if (user) {
      storage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
    } else {
      storage.removeItem(STORAGE_KEYS.user)
    }

    otherStorage.removeItem(STORAGE_KEYS.session)
    otherStorage.removeItem(STORAGE_KEYS.user)

    setState({ session: sessionWithExpiry, user: user ?? null, isHydrating: false })
  }, [])

  const updateProfile = useCallback((userData: Partial<AuthUser>) => {
    setState((prev) => {
      if (!prev.user) return prev
      const newUser = { ...prev.user, ...userData }

      const storage = localStorage.getItem(STORAGE_KEYS.session) ? localStorage : sessionStorage
      storage.setItem(STORAGE_KEYS.user, JSON.stringify(newUser))

      return { ...prev, user: newUser }
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    isAuthenticated: Boolean(state.session?.access_token),
    fetchWithAuth,
    login,
    logout,
    updateProfile,
  }), [state, fetchWithAuth, login, logout, updateProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
