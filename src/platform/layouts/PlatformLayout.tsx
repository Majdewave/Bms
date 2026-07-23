import { Navigate, Outlet, useLocation } from 'react-router-dom'
import PlatformSidebar from '@/platform/components/PlatformSidebar'
import PlatformTopbar from '@/platform/components/PlatformTopbar'

export default function PlatformLayout() {
  const location = useLocation()

  if (location.pathname === '/platform') {
    return <Navigate to="/platform/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-white flex">
      <PlatformSidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <PlatformTopbar />
        <main className="p-6 bg-white flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
