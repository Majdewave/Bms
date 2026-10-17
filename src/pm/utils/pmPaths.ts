import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const isBusinessPath = (pathname: string) => pathname === '/business' || pathname.startsWith('/business/')

// PM screens are shared by the Admin/Staff routes and the Business shell; this keeps their links in the area they were opened from.
export function usePmAreaPrefix() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  if (isBusinessPath(pathname)) return '/business'
  return user?.role === 'staff' ? '/staff' : '/admin'
}

export const pmClientPath = (prefix: string, clientId: string) =>
  prefix === '/business' ? `/business/projects/${clientId}` : `${prefix}/clients/${clientId}`

export const pmBillingPath = (prefix: string, clientId: string, projectId: string) =>
  prefix === '/business'
    ? `/business/projects/${clientId}/projects/${projectId}/billing`
    : `${prefix}/clients/${clientId}/projects/${projectId}/billing`
