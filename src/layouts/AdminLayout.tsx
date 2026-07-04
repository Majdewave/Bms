import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  Calendar,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  Settings,
  Sliders,
  UserPlus,
  Users,
  CreditCard,
  Loader,
  X,
} from "lucide-react"

import { useAuth, UserRole } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { useTenant } from '@/contexts/TenantContext'
import type { Features } from '@/contexts/FeatureContext'
import type { Permission } from '@/utils/permissions'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { TeamChatEntry } from '@/team-chat/components'

const TEAM_CHAT_OPEN_STORAGE_KEY = 'teamChat:isOpen'

const readInitialChatOpenState = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(TEAM_CHAT_OPEN_STORAGE_KEY) === 'true'
}

interface MenuItem {
  icon: ComponentType<{ className?: string }>
  label: string
  path: string
  roles: UserRole[]
  permission?: Permission
  feature?: keyof Features
}

const allMenuItems: MenuItem[] = [
  // Admin
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', roles: ['admin'] },
  { icon: Users, label: 'All Clients', path: '/admin/clients', roles: ['admin'] },
  { icon: Calendar, label: 'All Appointments', path: '/admin/appointments', roles: ['admin'] },
  { icon: FileText, label: 'All Invoices', path: '/admin/invoices', roles: ['admin'], feature: 'invoicesEnabled' },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports', roles: ['admin'], feature: 'reportsEnabled' },
  { icon: UserPlus, label: 'Staff Management', path: '/admin/staff', roles: ['admin'] },
  { icon: Pill, label: 'Drugs', path: '/admin/drugs', roles: ['admin'], feature: 'drugsEnabled' },
  { icon: Settings, label: 'Business Settings', path: '/admin/settings', roles: ['admin'] },
  { icon: CreditCard, label: 'Billing', path: '/admin/billing', roles: ['admin'] },
  { icon: Sliders, label: 'Feature Toggles', path: '/admin/features', roles: ['admin'] },
 
// Staff (permission based)
  { icon: LayoutDashboard, label: 'Dashboard', path: '/staff/dashboard', roles: ['staff'] },
  { icon: Calendar, label: 'My Appointments', path: '/staff/appointments', roles: ['staff'], permission: 'manage_appointments' },
  { icon: Users, label: 'Manage Clients', path: '/staff/clients', roles: ['staff'], permission: 'manage_clients' },
  { icon: FileText, label: 'Invoices', path: '/staff/invoices', roles: ['staff'], permission: 'manage_invoices', feature: 'invoicesEnabled' },
]

export default function AdminLayout() {

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(readInitialChatOpenState)
  const chatBellButtonRef = useRef<HTMLButtonElement | null>(null)

  const location = useLocation()
  const navigate = useNavigate()

  const { user, logout, hasPermission } = useAuth()
  const { features } = useFeatures()
  const { tenant } = useTenant()

  const { t } = useTranslation()

  const menuItems = useMemo(() => {
    if (!user) return []

    if (user.role === 'admin') {
      return allMenuItems.filter((item) => {
        if (!item.roles.includes('admin')) return false
        if (item.feature && !features?.[item.feature]) return false
        return true
      })
    }

    return allMenuItems.filter((item) => {
      if (item.roles.includes('staff') && user.role === 'staff') {
        if (item.feature && !features?.[item.feature]) return false
        if (!item.permission) return true
        return hasPermission(item.permission)
      }

      return false
    })
  }, [user, hasPermission, features])

  const getMenuLabel = (label: string) => {
    switch (label) {
      case 'Dashboard':
        return t('common.dashboard')
      case 'Billing': 
        return t('חיובים ומנויים')
      case 'All Clients':
        return t('nav.allClients')
      case 'All Appointments':
        return t('nav.allAppointments')
      case 'All Invoices':
        return t('nav.allInvoices')
      case 'Reports':
        return t('features.reports')
      case 'Staff Management':
        return t('nav.staff')
      case 'Manage Clients':
        return t('staff.clients.viewTitle')
      case 'Invoices':
        return t('nav.invoices')
      case 'Business Settings':
        return t('nav.settings')
      case 'Feature Toggles':
        return t('features.title')
      case 'Drugs':
        return t('features.drugs')
      case 'My Appointments':
        return t('nav.appointments')
      default:
        return label
    }
  }

  function getInitials(name?: string | null) {

    if (!name) return "U"

    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    await new Promise((resolve) => setTimeout(resolve, 600))

    setIsChatPanelOpen(false)
    logout()
    navigate('/')
  }

  const closeChatPanel = useCallback(() => {
    setIsChatPanelOpen(false)
  }, [])

  const toggleChatPanel = useCallback(() => {
    setIsChatPanelOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    if (!features?.teamChatEnabled) {
      window.localStorage.removeItem(TEAM_CHAT_OPEN_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(TEAM_CHAT_OPEN_STORAGE_KEY, isChatPanelOpen ? 'true' : 'false')
  }, [features?.teamChatEnabled, isChatPanelOpen])

  useEffect(() => {
    if (!features?.teamChatEnabled && isChatPanelOpen) {
      setIsChatPanelOpen(false)
    }
  }, [features?.teamChatEnabled, isChatPanelOpen])

  if (!user) return null

  const homePath =
    user.role === 'admin'
      ? '/admin/dashboard'
      : '/staff/dashboard'

  const breadcrumbSegments =
    location.pathname.split('/').filter(Boolean)

  const buildBreadcrumbs = () => {

    const crumbs: { label: string; path: string }[] = []

    breadcrumbSegments.forEach((segment, index) => {

      const path =
        `/${breadcrumbSegments.slice(0, index + 1).join('/')}`

      const labelMap: Record<string, string> = {

        dashboard: t('common.dashboard'),

        clients: t('nav.allClients'),

        appointments:
          user.role === 'staff'
            ? t('nav.appointments')
            : t('nav.allAppointments'),

        settings: t('nav.settings'),

        invoices: t('nav.allInvoices'),

        reports: t('nav.reports'),

      }

      const fallbackLabel =
        segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase())

      const label =
        labelMap[segment] ?? fallbackLabel

      crumbs.push({ label, path })

    })

    return crumbs
  }

  const breadcrumbs = buildBreadcrumbs()
  const currentPageLabel = breadcrumbs[breadcrumbs.length - 1]?.label ?? t('common.home')

  function getTenantLogo(tenant: any) {
    if (tenant?.logoUrl) {
      if (tenant.logoUrl.startsWith('http')) return tenant.logoUrl;
      return `${(import.meta as any).env.VITE_API_URL || 'http://localhost:5146'}${tenant.logoUrl}`;
    }
    return '/clienta-logo.png';
  }
  const businessLogo = getTenantLogo(tenant);

  return (

    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] bg-slate-900/25 backdrop-blur-[1px] flex items-center justify-center pointer-events-auto">
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-9 h-9 text-white animate-spin" />
            <p className="text-white text-base font-medium">מתנתק...</p>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}

      <aside
        className={`
          bg-white border-s border-slate-200 flex flex-col h-screen min-h-0
          fixed inset-y-0 right-0 z-40 w-72 transform transition-transform duration-300
          md:static md:w-64 md:translate-x-0 md:z-auto
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >

        {/* Mobile close button */}
        <div className="md:hidden flex justify-start p-3 border-b border-slate-100">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="סגור תפריט"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 sideBarTopBlock" style={{ padding: 0, borderBottom: 0 }}>
          <Link to={homePath} className="block BusinessLogoLink" style={{ padding: 0 }}>
            <div className="flex flex-col items-center py-4 gap-3 BusinessLogoContainer" style={{ padding: 0 }}>
              {/* BUSINESS OR CLIENTA LOGO */}
              <img
                src={businessLogo}
                alt="Logo"
                className="object-contain BusinessLogoImg"
                style={{ height: 'auto', maxHeight: '150px', width: '100%', borderBottom: 0 }}
                onError={(e) => (e.currentTarget.src = '/clienta-logo.png')}
              />
            </div>
          </Link>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-6">

          <div className="space-y-1">
          {menuItems.map((item) => {

            const Icon = item.icon

            const isActive =
              location.pathname === item.path

            return (

              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >

                <Icon className="w-5 h-5" />

                {getMenuLabel(item.label)}

              </Link>
            )
          })}
          </div>
        </nav>

        {/* Sidebar footer remains with only the logout button and user info card, no dropdown */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4 space-y-4 bg-white">

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="block">
              {t('common.signOut')}
            </span>
          </button>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
              {getInitials(user?.name)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">
                {user?.name}
              </span>
              <span className="text-xs text-gray-500">
                {user?.email}
              </span>
            </div>
          </div>
         <div className="ClientaBrand">
            <span className='ClientaIcon'>C</span><span>Powered by</span><span className='ClientaText'>CLIENTA</span>
        </div>

        </div>

      </aside>

      {/* Main */}

      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center gap-3">

          <div className="min-w-0">

            <h1 className="text-[21px] md:text-lg font-semibold text-slate-900 leading-tight truncate">
              {t('layout.welcomeBack')} {getInitials(user?.name)}
            </h1>

            <div className="mt-1 text-[11px] text-slate-500 leading-tight md:hidden truncate">
              {currentPageLabel}
            </div>

            <nav className="hidden md:flex mt-1 gap-1.5 md:gap-2 text-[11px] md:text-xs text-slate-500 flex-wrap leading-tight">

              <Link to={homePath}>
                {t('common.home')}
              </Link>

              {breadcrumbs.slice(1).map((crumb) => (

                <span key={crumb.path}>

                  <ChevronRight className="inline w-3 h-3" />

                  <Link to={crumb.path}>
                    {crumb.label}
                  </Link>

                </span>
              ))}

            </nav>

          </div>

          <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
            <LanguageSwitcher />
            {(user.role === 'admin' || user.role === 'staff') && features?.teamChatEnabled && (
              <TeamChatEntry
                bellButtonRef={chatBellButtonRef}
                isOpen={isChatPanelOpen}
                onToggle={toggleChatPanel}
                onClose={closeChatPanel}
              />
            )}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center md:justify-start gap-2 px-2.5 md:px-3 py-2 text-sm text-rose-700 bg-rose-50/70 border border-rose-100 hover:text-rose-800 hover:bg-rose-100/80 rounded-lg transition md:ml-2"
              style={{ fontSize: '15px' }}
              aria-label={t('header.logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{t('header.logout')}</span>
            </button>
            {/* Hamburger – mobile only */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
              onClick={() => setSidebarOpen(true)}
              aria-label="פתח תפריט"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-2 md:p-6">

          <Outlet />

        </main>

      </div>

    </div>
  )
}