import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '@/api'
import { hasPermission, Permission } from '@/utils/permissions'

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
    if (import.meta.hot) {
      console.warn('useAuth called during hot reload, returning safe defaults')
      return {
        user: null,
        loading: true,
        login: async () => {},
        logout: () => {},
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
    // Refresh user state from API
    const refreshUser = async () => {
      setLoading(true);
      try {
        const updatedUser = await authService.getCurrentUser();
        setUser(updatedUser);
      } catch (error) {
        localStorage.removeItem('authToken');
        setUser(null);
      }
      setLoading(false);
    };
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth token on mount
    const initAuth = async () => {
      const token = localStorage.getItem('authToken')
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
        } catch (error) {
          localStorage.removeItem('authToken')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authService.login({ Email: email, Password: password })
    localStorage.setItem('authToken', response.token)
    setUser(response.user)
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('rememberedEmail')
    setUser(null)
  }

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false
    return user.permissions?.includes(permission)
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    hasPermission: checkPermission,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff',
    isClient: user?.role === 'client',
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
