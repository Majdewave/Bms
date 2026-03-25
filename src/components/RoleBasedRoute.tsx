import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth, UserRole } from '@/contexts/AuthContext'

interface RoleBasedRouteProps {
  children: ReactNode
  allowedRoles: UserRole[]
  redirectTo?: string
}

export const RoleBasedRoute = ({
  children,
  allowedRoles,
  redirectTo = '/unauthorized',
}: RoleBasedRouteProps) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const currentPath = location.pathname

  const shouldRedirectTo = (target: string) => {
    const normalize = (path: string) => (path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path)
    return normalize(currentPath) !== normalize(target)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    if (!shouldRedirectTo('/')) return <>{children}</>
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    if (!shouldRedirectTo(redirectTo)) return <>{children}</>
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

interface ConditionalRenderProps {
  children: ReactNode
  roles?: UserRole[]
  requireAll?: boolean
}

export const RoleGuard = ({ children, roles }: ConditionalRenderProps) => {
  const { hasRole } = useAuth()

  if (!roles || roles.length === 0) {
    return <>{children}</>
  }

  if (!hasRole(roles)) {
    return null
  }

  return <>{children}</>
}
