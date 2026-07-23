import { usePlatformAuth } from '@/platform/auth/PlatformAuthContext'

export default function PlatformTopbar() {
  const { currentUser, logout } = usePlatformAuth()

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-slate-900">Platform Administration</h1>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{currentUser?.fullName ?? 'Platform User'}</p>
          <p className="text-xs text-slate-500">{currentUser?.email ?? ''}</p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
