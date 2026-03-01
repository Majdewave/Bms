import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth, UserRole } from '@/contexts/AuthContext'
import { Permission } from '@/utils/permissions'

interface PermissionBasedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  requiredPermission?: Permission
  redirectTo?: string
}

/**
 * Route guard component that checks both role and permissions
 * Redirects to unauthorized page if access is denied
 */
export const PermissionBasedRoute = ({
  children,
  allowedRoles,
  requiredPermission,
  redirectTo = '/unauthorized',
}: PermissionBasedRouteProps) => {
  const { user, loading, hasPermission } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  // Check permission if specified
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
