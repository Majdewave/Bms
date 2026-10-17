import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { getRoleLandingPath } from '@/utils/productRouting'

// Allows /business/* only for explicit Business tenants; everyone else returns to their existing landing page.
export const BusinessProductRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth()
  const { productType, productResolved } = useTenant()

  if (loading || (user && !productResolved)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (productType !== 'business') return <Navigate to={getRoleLandingPath(user.role)} replace />

  return <>{children}</>
}
