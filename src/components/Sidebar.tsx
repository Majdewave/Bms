import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import type { Permission } from '@/utils/permissions'
import type { Features } from '@/contexts/FeatureContext'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  FolderOpen,
  User,
  CreditCard,
  Menu,
  X,
  Pill,
} from 'lucide-react'

interface MenuItem {
  icon: typeof LayoutDashboard
  label: string
  path: string
  adminOnly?: boolean
  permission?: Permission
  feature?: keyof Features
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Calendar, label: 'Appointments', path: '/appointments' },
  { icon: FileText, label: 'Invoices', path: '/invoices' },
  { icon: FolderOpen, label: 'Files', path: '/files' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: CreditCard, label: 'ניהול מנוי', path: '/billing', adminOnly: true },

  // ✅ Drugs with feature toggle
  {
    icon: Pill,
    label: 'Drugs',
    path: '/admin/drugs',
    adminOnly: true,
    feature: 'drugsEnabled',
  },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const location = useLocation()
  const { user, hasPermission } = useAuth()
  const { features } = useFeatures() // ✅ חשוב מאוד

  // ✅ סינון נכון של התפריט
  const visibleMenuItems = menuItems.filter((item) => {
    // אם אין user → לא להציג כלום
    if (!user) return false

    // adminOnly
    if (item.adminOnly && user.role?.toLowerCase() !== 'admin') {
      return false
    }

    // feature toggle
    if (item.feature && features?.[item.feature] === false) {
      return false
    }

    // permissions
    if (item.permission && !hasPermission(item.permission)) {
      return false
    }

    return true
  })



  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-white p-2 rounded-lg shadow"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-secondary-800 text-white transform transition-transform md:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-secondary-700">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-lg">
              P
            </div>
            <span className="text-xl font-bold">Portal</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-secondary-300 hover:bg-secondary-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-secondary-700">
          <div className="text-xs text-secondary-400">
            <p className="font-semibold">Signed in as</p>
            <p className="text-secondary-300 mt-1">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}