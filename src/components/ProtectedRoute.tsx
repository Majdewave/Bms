import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const token = localStorage.getItem('authToken')
  const location = useLocation()

  const currentPath = location.pathname

  const shouldRedirectTo = (target: string) => {
    const normalize = (path: string) => (path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path)
    return normalize(currentPath) !== normalize(target)
  }

  if (!token) {
    if (!shouldRedirectTo('/')) return <>{children}</>
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}
