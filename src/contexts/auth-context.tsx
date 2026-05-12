import { createContext, useContext, useEffect, useMemo, useState } from "react"

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

  const value = useMemo<AuthContextValue>(() => {
    const persistSession = (session: AuthSession) => {
      const sessionWithExpiry = addExpiry(session)
      getActiveStorage().setItem(STORAGE_KEYS.session, JSON.stringify(sessionWithExpiry))
      setState((prev) => ({ ...prev, session: sessionWithExpiry, isHydrating: false }))
      return sessionWithExpiry
    }

    const logout = () => {
      if (state.session?.access_token && API_BASE_URL) {
        void fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${state.session.access_token}`,
          },
        }).catch(() => undefined)
      }
      clearStoredAuth()
      setState({ session: null, user: null, isHydrating: false })
    }

    const refreshSession = async () => {
      if (!state.session?.refresh_token || !API_BASE_URL) {
        logout()
        return null
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
          logout()
          return null
        }

        return persistSession(payload.data.session)
      } catch {
        logout()
        return null
      }
    }

    const fetchWithAuth = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const activeSession =
        state.session?.expires_at && state.session.expires_at <= Date.now() + 30_000
          ? await refreshSession()
          : state.session
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
    }

    const login = ({ session, user, remember }: LoginPayload) => {
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
    }

    const updateProfile = (userData: Partial<AuthUser>) => {
      setState((prev) => {
        if (!prev.user) return prev
        const newUser = { ...prev.user, ...userData }
        
        // Update storage
        const storage = localStorage.getItem(STORAGE_KEYS.session) ? localStorage : sessionStorage
        storage.setItem(STORAGE_KEYS.user, JSON.stringify(newUser))
        
        return { ...prev, user: newUser }
      })
    }

    return {
      ...state,
      isAuthenticated: Boolean(state.session?.access_token),
      fetchWithAuth,
      login,
      logout,
      updateProfile,
    }
  }, [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
