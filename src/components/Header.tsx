import { Bell, Settings, User, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        {/* Left Side - Spacer for layout */}
        <div className="md:hidden w-12" />

        {/* Right Side - Actions */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Notifications */}
          <button
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />
          </button>

          {/* Settings */}
          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              aria-label="User menu"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                JD
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <button className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <hr className="my-2" />
                <button className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm font-semibold text-red-600">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
