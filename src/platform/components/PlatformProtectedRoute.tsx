import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePlatformAuth } from '@/platform/auth/PlatformAuthContext'

export const PlatformProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { loading, isAuthenticated } = usePlatformAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/platform/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
