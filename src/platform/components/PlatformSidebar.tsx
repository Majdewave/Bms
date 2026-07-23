import { LayoutDashboard, Building2, Clock3, Users, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const items = [
  { to: '/platform/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/platform/businesses', label: 'Businesses', icon: Building2 },
  { to: '/platform/pending-approvals', label: 'Pending Approvals', icon: Clock3 },
  { to: '/platform/users', label: 'Platform Users', icon: Users },
  { to: '/platform/settings', label: 'Settings', icon: Settings },
]

export default function PlatformSidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
      <div className="h-16 px-5 border-b border-slate-200 flex items-center">
        <p className="text-base font-semibold text-slate-900">Clienta Platform</p>
      </div>

      <nav className="p-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
