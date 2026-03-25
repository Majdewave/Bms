import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { authService } from '@/api'
import { Permission } from '@/utils/permissions'

export type UserRole = 'admin' | 'staff' | 'client'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  businessId?: string
  avatar?: string
  permissions: string[]
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  hasRole: (roles: UserRole | UserRole[]) => boolean
  hasPermission: (permission: Permission) => boolean
  isAdmin: boolean
  isStaff: boolean
  isClient: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    // During hot reload, context might be temporarily unavailable
    // Return a safe default instead of throwing
    if ((import.meta as any).hot) {
      console.warn('useAuth called during hot reload, returning safe defaults')
      return {
        user: null,
        loading: true,
        login: async () => {},
        logout: () => {},
        refreshUser: async () => {},
        isAuthenticated: false,
        hasRole: () => false,
        hasPermission: () => false,
        isAdmin: false,
        isStaff: false,
        isClient: false,
      } as AuthContextType
    }
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

const normalizeUser = (user: any): AuthUser | null => {
  if (!user) return null
  return {
    ...user,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  }
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const updatedUser = await authService.getCurrentUser()
      setUser(normalizeUser(updatedUser))
    } catch (error) {
      localStorage.removeItem('authToken')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check for existing auth token on mount
    const initAuth = async () => {
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser()
          setUser(normalizeUser(currentUser))
        } catch (error) {
          localStorage.removeItem('authToken')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password })
    localStorage.setItem('authToken', response.token)
    setUser(normalizeUser(response.user))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('rememberedEmail')
    setUser(null)
  }, [])

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }, [user])

  const checkPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false
    if (user.role === 'admin') return true
    return user.permissions?.includes(permission)
  }, [user])

  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      isAuthenticated: !!user,
      hasRole,
      hasPermission: checkPermission,
      isAdmin: user?.role === 'admin',
      isStaff: user?.role === 'staff',
      isClient: user?.role === 'client',
    }),
    [user, loading, login, logout, refreshUser, hasRole, checkPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
