import { useState, useMemo } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  FolderOpen,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import ClientaLogo from '@/components/Logo'

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
}

const allMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/client/dashboard' },
  { icon: Calendar, label: 'Appointments', path: '/client/appointments' },
  { icon: FileText, label: 'Invoices', path: '/client/invoices' },
  { icon: FolderOpen, label: 'Files', path: '/client/files' },
  { icon: User, label: 'Profile', path: '/client/profile' },
]

export default function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()

  const menuItems = useMemo(() => allMenuItems, [])

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const getRoleBadge = () => {
    if (!user) return null

    const badge = { label: t('login.demoClient'), icon: User, color: 'bg-green-100 text-green-800' }
    const Icon = badge.icon

    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) return null

  const breadcrumbSegments = location.pathname.split('/').filter(Boolean)
  const buildBreadcrumbs = () => {
    const crumbs: { label: string; path: string }[] = []
    breadcrumbSegments.forEach((segment, index) => {
      const path = `/${breadcrumbSegments.slice(0, index + 1).join('/')}`
      const labelMap: Record<string, string> = {
        dashboard: t('common.dashboard'),
        appointments: t('nav.appointments'),
        invoices: t('nav.invoices'),
        files: t('nav.files'),
        profile: t('nav.profile'),
      }
      const label = labelMap[segment] || segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
      crumbs.push({ label, path })
    })
    return crumbs
  }

  const breadcrumbs = buildBreadcrumbs()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-white border-r border-slate-200 transform transition-transform duration-300 flex flex-col overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 hover:shadow-md transition-all absolute -right-5 top-1/2 -translate-y-1/2"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="w-5 h-5" />
          ) : (
            <ChevronsLeft className="w-5 h-5" />
          )}
        </button>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <Link
            to="/client/dashboard"
            className="group"
            onClick={closeSidebarOnMobile}
          >
            {sidebarCollapsed ? (
              <ClientaLogo variant="icon" className="mx-auto" iconClassName="w-6 h-6 text-indigo-600" />
            ) : (
              <ClientaLogo variant="full" />
            )}
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          <p className={`text-xs font-bold text-slate-500 uppercase tracking-wide px-4 mb-4 ${
            sidebarCollapsed ? 'hidden' : 'block'
          }`}>
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
                  {item.label === 'Dashboard'
                    ? t('common.dashboard')
                    : item.label === 'Appointments'
                    ? t('nav.appointments')
                    : item.label === 'Invoices'
                    ? t('nav.invoices')
                    : item.label === 'Files'
                    ? t('nav.files')
                    : t('nav.profile')}
                </span>
                {isActive && (
                  <div className={`w-1.5 h-1.5 bg-primary-600 rounded-full ml-auto ${
                    sidebarCollapsed ? 'hidden' : ''
                  }`} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-200 space-y-3">
          <div className={`px-3 py-3 bg-slate-50 rounded-lg ${
            sidebarCollapsed ? 'hidden' : 'block'
          }`}>
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              aria-label="Toggle menu"
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={() => navigate(-1)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </button>

            <div className="hidden sm:block">
              <p className="text-base font-semibold text-slate-900">
                {t('layout.welcomeBack')}, {user.name.split(' ')[0]}!
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <nav className="mt-1 flex items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
                <Link to="/client/dashboard" className="hover:text-slate-700">
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

            <div className="sm:hidden flex-1">
              <p className="text-sm font-semibold text-slate-900">{user.name.split(' ')[0]}</p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1 lg:gap-2">
            {/* User Menu */}
            <div className="hidden md:flex items-center gap-2">
              <label className="text-xs text-slate-500" htmlFor="lang-select-client">
                {t('language.label')}
              </label>
              <select
                id="lang-select-client"
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="input py-1 px-2 text-xs"
              >
                <option value="en">{t('language.en')}</option>
                <option value="he">{t('language.he')}</option>
                <option value="ar">{t('language.ar')}</option>
              </select>
            </div>

            <div className="relative ml-2 lg:ml-4">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors group"
                aria-label={t('layout.userMenu')}
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(user.name)}
                </div>
                <ChevronDown className="w-4 h-4 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{user.email}</p>
                    <div className="mt-2">{getRoleBadge()}</div>
                  </div>

                  <Link
                    to="/client/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="block w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors border-b border-slate-200"
                  >
                    <User className="w-4 h-4" />
                    {t('nav.profile')}
                  </Link>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-2 text-sm font-medium text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('common.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="h-full max-w-7xl mx-auto w-full px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
