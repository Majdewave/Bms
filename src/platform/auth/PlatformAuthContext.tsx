import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PLATFORM_TOKEN_STORAGE_KEY, isPlatformJwtValid } from '@/platform/auth/platformToken'

export type PlatformRole = 'Owner' | 'PlatformAdmin' | 'Support'

export interface PlatformUser {
  id: string
  fullName: string
  email: string
  role: PlatformRole
  isActive: boolean
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string
}

interface PlatformAuthContextValue {
  currentUser: PlatformUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  getAccessToken: () => string
}

interface PlatformLoginResponse {
  token: string
  user: PlatformUser
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | undefined>(undefined)

const getApiBaseUrl = () => {
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
  return (fromEnv ?? '').replace(/\/$/, '')
}

export const PlatformAuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<PlatformUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState('')
  const accessTokenRef = useRef('')

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  const getAccessToken = useCallback(() => accessTokenRef.current, [])

  const logout = useCallback(() => {
    localStorage.removeItem(PLATFORM_TOKEN_STORAGE_KEY)
    setAccessToken('')
    setCurrentUser(null)
  }, [])

  const fetchPlatformMe = useCallback(async (token: string, signal?: AbortSignal): Promise<PlatformUser> => {
    const response = await fetch(`${getApiBaseUrl()}/api/platform/auth/me`, {
      method: 'GET',
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to load platform user')
    }

    return response.json()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 10000)
    let isActive = true

    const initialize = async () => {
      const token = localStorage.getItem(PLATFORM_TOKEN_STORAGE_KEY)

      if (!token || !isPlatformJwtValid(token)) {
        localStorage.removeItem(PLATFORM_TOKEN_STORAGE_KEY)
        setAccessToken('')
        setCurrentUser(null)
        setLoading(false)
        return
      }

      setAccessToken(token)

      try {
        const user = await fetchPlatformMe(token, controller.signal)
        if (isActive) {
          setCurrentUser(user)
        }
      } catch {
        if (isActive) {
          localStorage.removeItem(PLATFORM_TOKEN_STORAGE_KEY)
          setAccessToken('')
          setCurrentUser(null)
        }
      } finally {
        window.clearTimeout(timeoutId)
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void initialize()

    return () => {
      isActive = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [fetchPlatformMe])

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${getApiBaseUrl()}/api/platform/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      let errorMessage = 'Platform login failed'
      try {
        const payload = await response.json()
        if (typeof payload?.message === 'string') {
          errorMessage = payload.message
        }
      } catch {
        // Ignore parse failure and keep generic message.
      }
      throw new Error(errorMessage)
    }

    const payload = (await response.json()) as PlatformLoginResponse

    if (!payload.token || !isPlatformJwtValid(payload.token)) {
      throw new Error('Invalid platform token received')
    }

    localStorage.setItem(PLATFORM_TOKEN_STORAGE_KEY, payload.token)
    setAccessToken(payload.token)
    setCurrentUser(payload.user)
  }, [])

  const value = useMemo<PlatformAuthContextValue>(
    () => ({
      currentUser,
      loading,
      isAuthenticated: !!currentUser,
      login,
      logout,
      getAccessToken,
    }),
    [currentUser, loading, login, logout, getAccessToken],
  )

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>
}

export const usePlatformAuth = () => {
  const context = useContext(PlatformAuthContext)
  if (!context) {
    throw new Error('usePlatformAuth must be used within PlatformAuthProvider')
  }
  return context
}
