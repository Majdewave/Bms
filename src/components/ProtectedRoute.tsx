import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useFeatures } from '@/contexts/FeatureContext'
import { TeamChatProvider } from '@/team-chat/context/TeamChatProvider'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { features } = useFeatures()
  const token = localStorage.getItem('token')
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

  const isTeamChatEnabled = features?.teamChatEnabled === true

  if (!isTeamChatEnabled) {
    return <>{children}</>
  }

  return (
    <TeamChatProvider>
      {children}
    </TeamChatProvider>
  )
}
