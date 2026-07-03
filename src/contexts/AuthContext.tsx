import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react'
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
  stampUrl?: string
  useStamp?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  getAccessToken: () => string
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
        getAccessToken: () => '',
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
    stampUrl: user.stampUrl ?? user.StampUrl,
    useStamp: user.useStamp ?? user.UseStamp ?? false,
  }
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState('')
  const accessTokenRef = useRef('')

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  const getAccessToken = useCallback(() => accessTokenRef.current, [])

  const refreshUser = useCallback(async () => {
    setLoading(true)
    try {
      const updatedUser = await authService.getCurrentUser()
      setUser(normalizeUser(updatedUser))
    } catch (error) {
      localStorage.removeItem('token')
      setAccessToken('')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

useEffect(() => {
  const token = localStorage.getItem('token');

  if (!token) {
    setAccessToken('');
    setLoading(false);
    return; // ⛔ לא קורא /auth/me בלי token
  }

  setAccessToken(token);

  authService.getCurrentUser()
    .then(user => setUser(normalizeUser(user)))
    .catch(() => {
      localStorage.removeItem('token');
      setAccessToken('');
      setUser(null);
    })
    .finally(() => setLoading(false));

}, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password })
    localStorage.setItem('token', response.token)
    setAccessToken(response.token)
    setUser(normalizeUser(response.user))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('rememberedEmail')
    setAccessToken('')
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
      getAccessToken,
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
    [user, loading, getAccessToken, login, logout, refreshUser, hasRole, checkPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
