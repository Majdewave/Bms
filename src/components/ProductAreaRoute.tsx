import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { getProductRoleLandingPath } from '@/utils/productRouting'

/** Prevent explicit Business tenants from entering the shared Clinic/Legacy admin or staff shells. */
export default function ProductAreaRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { productType, productResolved } = useTenant()

  if (authLoading || (user && !productResolved)) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">…</div>
  }

  if (user && productType === 'business') {
    return <Navigate to={getProductRoleLandingPath(productType, user.role)} replace />
  }

  return <>{children}</>
}
