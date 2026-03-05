import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { useAuth, UserRole } from '@/contexts/AuthContext'
import NotificationsDropdown from '@/components/NotificationsDropdown'
import ClientaLogo from '@/components/Logo'

interface MenuItem {
  icon: ComponentType<{ className?: string }>
  label: string
  path: string
  roles: UserRole[]
}

const allMenuItems: MenuItem[] = [
  // Admin-only routes
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', roles: ['admin'] },
  { icon: Users, label: 'All Clients', path: '/admin/clients', roles: ['admin'] },
  { icon: Calendar, label: 'All Appointments', path: '/admin/appointments', roles: ['admin'] },
  { icon: FileText, label: 'All Invoices', path: '/admin/invoices', roles: ['admin'] },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports', roles: ['admin'] },
  { icon: UserPlus, label: 'Staff Management', path: '/admin/staff', roles: ['admin'] },
  { icon: Settings, label: 'Business Settings', path: '/admin/settings', roles: ['admin'] },
  // Staff routes
  { icon: LayoutDashboard, label: 'Dashboard', path: '/staff/dashboard', roles: ['staff'] },
  { icon: Calendar, label: 'My Appointments', path: '/staff/appointments', roles: ['staff'] },
  { icon: Users, label: 'Manage Clients', path: '/admin/clients', roles: ['staff'] },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()

  const menuItems = useMemo(() => {
    if (!user) return []
    return allMenuItems.filter((item) => item.roles.includes(user.role))
  }, [user])

  const getMenuLabel = (label: string) => {
    switch (label) {
      case 'Dashboard':
        return t('common.dashboard')
      case 'All Clients':
        return t('nav.allClients')
      case 'All Appointments':
        return t('nav.allAppointments')
      case 'All Invoices':
        return t('nav.allInvoices')
      case 'Reports':
        return t('nav.reports')
      case 'Staff Management':
        return t('nav.staff')
      case 'Business Settings':
        return t('nav.settings')
      case 'My Appointments':
        return t('nav.appointments')
      case 'My Clients':
        return t('nav.allClients')
      default:
        return label
    }
  }

  function getInitials(name?: string | null) {
    if (!name) return "U";

    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  const getRoleBadge = () => {
    if (!user) return null

    const badges = {
      admin: { label: t('login.demoAdmin'), icon: Shield, color: 'bg-purple-100 text-purple-800' },
      staff: { label: t('login.demoStaff'), icon: Users, color: 'bg-blue-100 text-blue-800' },
      client: { label: t('login.demoClient'), icon: User, color: 'bg-green-100 text-green-800' },
    }

    const badge = badges[user.role]
    const Icon = badge.icon

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}
      >
        <Icon className="w-3 h-3" />
        {badge.label}
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  if (!user) return null

  const homePath = user.role === 'admin' ? '/admin/dashboard' : '/staff/dashboard'

  const breadcrumbSegments = location.pathname.split('/').filter(Boolean)
  const buildBreadcrumbs = () => {
    const crumbs: { label: string; path: string }[] = []
    breadcrumbSegments.forEach((segment, index) => {
      const path = `/${breadcrumbSegments.slice(0, index + 1).join('/')}`
      const labelMap: Record<string, string> = {
        dashboard: t('common.dashboard'),
        clients: t('nav.allClients'),
        appointments: user.role === 'staff' ? t('nav.appointments') : t('nav.allAppointments'),
        settings: t('nav.settings'),
        invoices: t('nav.allInvoices'),
        reports: t('nav.reports'),
      }
      const fallbackLabel = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
      const label = labelMap[segment] ?? fallbackLabel
      crumbs.push({ label, path })
    })
    return crumbs
  }

  const breadcrumbs = buildBreadcrumbs()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-slate-200 transform transition-transform duration-300 flex flex-col overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 hover:shadow-md transition-all absolute top-1/2 -translate-y-1/2 ${
            i18n.language === 'ar' || i18n.language === 'he' ? '-left-5' : '-right-5'
          }`}
          aria-label={sidebarCollapsed ? t('common.expand') : t('common.collapse')}
        >
          {(i18n.language === 'ar' || i18n.language === 'he') ? (
            sidebarCollapsed ? (
              <ChevronsLeft className="w-5 h-5" />
            ) : (
              <ChevronsRight className="w-5 h-5" />
            )
          ) : (
            sidebarCollapsed ? (
              <ChevronsRight className="w-5 h-5" />
            ) : (
              <ChevronsLeft className="w-5 h-5" />
            )
          )}
        </button>

        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <Link to={homePath} className="group" onClick={closeSidebarOnMobile}>
            {sidebarCollapsed ? (
              <ClientaLogo variant="icon" className="mx-auto" iconClassName="w-6 h-6 text-indigo-600" />
            ) : (
              <ClientaLogo variant="full" />
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <p
            className={`text-xs font-bold text-slate-500 uppercase tracking-wide px-4 mb-4 ${
              sidebarCollapsed ? 'hidden' : 'block'
            }`}
          >
            {t('nav.mainMenu')}
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebarOnMobile}
                className={`flex items-center ${
                  sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
                } py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className={sidebarCollapsed ? 'hidden' : 'block'}>
                  {getMenuLabel(item.label)}
                </span>
                {isActive && (
                  <div
                    className={`w-1.5 h-1.5 bg-primary-600 rounded-full ml-auto ${
                      sidebarCollapsed ? 'hidden' : ''
                    }`}
                  />
                )}
              </Link>
            )})}
          </nav>

        <div className="flex-shrink-0 p-4 border-t border-slate-200 space-y-3">
          <div
            className={`px-3 py-3 bg-slate-50 rounded-lg ${
              sidebarCollapsed ? 'hidden' : 'block'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-semibold">{t('layout.signedInAs')}</p>
              {getRoleBadge()}
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${
              sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-4'
            } py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors`}
            aria-label={t('common.signOut')}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={sidebarCollapsed ? 'hidden' : 'block'}>{t('common.signOut')}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              aria-label={t('common.toggleMenu')}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <button
              onClick={() => navigate(-1)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </button>

            <div>
              <h1 className="text-lg font-semibold text-slate-900">{t('layout.welcomeBack')}</h1>
              <p className="text-sm text-slate-500">{t('layout.manageOperations')}</p>
              <nav className="mt-1 flex items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
                <Link to={homePath} className="hover:text-slate-700">
                  {t('common.home')}
                </Link>
                {breadcrumbs.slice(1).map((crumb) => (
                  <span key={crumb.path} className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                    <Link to={crumb.path} className="hover:text-slate-700">
                      {crumb.label}
                    </Link>
                  </span>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationsDropdown />

            <div className="hidden md:flex items-center gap-2">
              <label className="text-xs text-slate-500" htmlFor="lang-select-admin">
                {t('language.label')}
              </label>
              <select
                id="lang-select-admin"
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="input py-1 px-2 text-xs"
              >
                <option value="en">{t('language.en')}</option>
                <option value="he">{t('language.he')}</option>
                <option value="ar">{t('language.ar')}</option>
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">
                    {user.role === 'admin'
                      ? t('login.demoAdmin')
                      : user.role === 'staff'
                      ? t('login.demoStaff')
                      : t('login.demoClient')}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('common.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {user.role === 'staff' && (
            <div className="bg-blue-50 border-b border-blue-100">
              <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {t('staff.banner.title')}
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      {t('staff.banner.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
