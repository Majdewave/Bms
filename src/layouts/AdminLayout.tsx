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
  MessageCircle,
  User,
  UserPlus,
  Users,
  CreditCard,
  Loader,
  X,
} from "lucide-react"

import { useAuth, UserRole } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'
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
  { icon: FileText, label: 'Quotes', path: '/admin/quotes', roles: ['admin'], permission: 'manage_quotes', feature: 'quotesEnabled' },
  { icon: BarChart3, label: 'Reports', path: '/admin/reports', roles: ['admin'], feature: 'reportsEnabled' },
  { icon: UserPlus, label: 'Staff Management', path: '/admin/staff', roles: ['admin'] },
  { icon: Pill, label: 'Drugs', path: '/admin/drugs', roles: ['admin'], feature: 'drugsEnabled' },
  { icon: Settings, label: 'Business Settings', path: '/admin/settings', roles: ['admin'] },
  { icon: MessageCircle, label: 'WhatsApp', path: '/admin/settings/whatsapp', roles: ['admin'], permission: 'manage_whatsapp' },
  { icon: CreditCard, label: 'Billing', path: '/admin/billing', roles: ['admin'] },
  { icon: Sliders, label: 'Feature Toggles', path: '/admin/features', roles: ['admin'] },
 
// Staff (permission based)
  { icon: LayoutDashboard, label: 'Dashboard', path: '/staff/dashboard', roles: ['staff'] },
  { icon: Calendar, label: 'My Appointments', path: '/staff/appointments', roles: ['staff'], permission: 'manage_appointments' },
  { icon: Users, label: 'Manage Clients', path: '/staff/clients', roles: ['staff'], permission: 'manage_clients' },
  { icon: FileText, label: 'Invoices', path: '/staff/invoices', roles: ['staff'], permission: 'manage_invoices', feature: 'invoicesEnabled' },
  { icon: FileText, label: 'Quotes', path: '/staff/quotes', roles: ['staff'], permission: 'manage_quotes', feature: 'quotesEnabled' },
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
  const { departmentFeatures } = useDepartmentFeatures()
  const { tenant } = useTenant()

  const { t } = useTranslation()

  const menuItems = useMemo(() => {
    if (!user) return []

    if (user.role === 'admin') {
      return allMenuItems.filter((item) => {
        if (!item.roles.includes('admin')) return false
        if (item.feature && !features?.[item.feature]) return false
        if (item.permission && !hasPermission(item.permission)) return false
        if ((item.path === '/admin/quotes' || item.path === '/staff/quotes') && !departmentFeatures?.quotesEnabled) return false
        if (item.path === '/admin/drugs' && !departmentFeatures?.drugsEnabled) return false
        return true
      })
    }

    return allMenuItems.filter((item) => {
      if (item.roles.includes('staff') && user.role === 'staff') {
        if (item.feature && !features?.[item.feature]) return false
        if ((item.path === '/admin/quotes' || item.path === '/staff/quotes') && !departmentFeatures?.quotesEnabled) return false
        if (item.path === '/admin/drugs' && !departmentFeatures?.drugsEnabled) return false
        if (!item.permission) return true
        return hasPermission(item.permission)
      }

      return false
    })
  }, [user, hasPermission, features, departmentFeatures?.drugsEnabled, departmentFeatures?.quotesEnabled])

  const isTeamChatEnabled = departmentFeatures?.teamChatEnabled === true

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
      case 'Quotes':
        return 'הצעות מחיר'
      case 'Business Settings':
        return t('nav.settings')
      case 'Feature Toggles':
        return t('features.title')
      case 'WhatsApp':
        return 'WhatsApp'
      case 'Drugs':
        return t('features.drugs')
      case 'My Appointments':
        return t('nav.appointments')
      default:
        return label
    }
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
    if (!isTeamChatEnabled) {
      window.localStorage.removeItem(TEAM_CHAT_OPEN_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(TEAM_CHAT_OPEN_STORAGE_KEY, isChatPanelOpen ? 'true' : 'false')
  }, [isTeamChatEnabled, isChatPanelOpen])

  useEffect(() => {
    if (!isTeamChatEnabled && isChatPanelOpen) {
      setIsChatPanelOpen(false)
    }
  }, [isTeamChatEnabled, isChatPanelOpen])

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
        whatsapp: 'WhatsApp',

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
  const displayName = (user?.name ?? user?.email ?? '').trim() || user?.email || 'User'

  function getTenantLogo(tenant: any) {
    if (tenant?.logoUrl) {
      if (tenant.logoUrl.startsWith('http')) return tenant.logoUrl;
      return `${(import.meta as any).env.VITE_API_URL || 'http://localhost:5146'}${tenant.logoUrl}`;
    }
    return '/clienta-logo.png';
  }
  const businessLogo = getTenantLogo(tenant);

  return (

    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">

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
          fixed inset-y-0 right-0 z-40 flex h-screen min-h-0 w-72 transform flex-col border-s border-slate-200 bg-white shadow-[-10px_0_24px_rgba(15,23,42,0.04)] transition-transform duration-300
          md:static md:z-auto md:w-64 md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >

        {/* Mobile close button */}
        <div className="flex justify-start border-b border-slate-100 p-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-2 transition hover:bg-slate-100"
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

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-5">

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
                className={`group relative flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >

                <span
                  className={`absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l ${isActive ? 'bg-primary-600' : 'bg-transparent'}`}
                />

                <Icon className={`h-5 w-5 ${isActive ? 'text-primary-700' : 'text-slate-400 group-hover:text-slate-600'}`} />

                {getMenuLabel(item.label)}

              </Link>
            )
          })}
          </div>
        </nav>

        <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-3">
          <div
            dir="ltr"
            style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
            className="flex flex-row items-center justify-start gap-[6px]"
          >
            <img
              src="/favicon.png"
              alt="Clienta"
              className="h-5 w-5 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="flex items-baseline gap-1 leading-none whitespace-nowrap">
              <span className="text-[12px] text-slate-500">Powered by</span>
              <span className="text-[12px] font-semibold text-blue-600">Clienta</span>
            </div>
          </div>
        </div>

      </aside>

      {/* Main */}

      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6 md:py-3.5">

          <div className="min-w-0">
            <div className="flex max-w-full items-center gap-1.5 text-sm font-bold text-slate-900 leading-tight">
              <User className="h-4 w-4 shrink-0 text-slate-600" />
              <span className="max-w-[220px] md:max-w-[300px] truncate" title={displayName}>
                {displayName}
              </span>
            </div>

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
            {(user.role === 'admin' || user.role === 'staff') && isTeamChatEnabled && (
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
              className="flex items-center justify-center gap-2 rounded-md border border-rose-100 bg-rose-50/70 px-2.5 py-2 text-sm text-rose-700 transition hover:bg-rose-100/80 hover:text-rose-800 md:ml-2 md:justify-start md:px-3"
              style={{ fontSize: '15px' }}
              aria-label={t('header.logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{t('header.logout')}</span>
            </button>
            {/* Hamburger – mobile only */}
            <button
              className="rounded-md p-2 transition hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="פתח תפריט"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-2.5 md:p-6">

          <Outlet />

        </main>

      </div>

    </div>
  )
}