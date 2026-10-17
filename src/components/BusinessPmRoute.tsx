import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { usePmEnabled } from '@/pm/hooks/usePmEnabled'

// Business PM routes stay fail-closed: without PM enabled they send the user back to the Business dashboard (never to the clinic client page).
export const BusinessPmRoute = ({ children }: { children: ReactNode }) => {
  const { pmEnabled, loading } = usePmEnabled()

  if (loading) return <div className="p-10 text-center text-slate-500">…</div>
  if (!pmEnabled) return <Navigate to="/business/dashboard" replace />

  return <>{children}</>
}
