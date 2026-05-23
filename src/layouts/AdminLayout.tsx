import { useMemo } from 'react'
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
  Pill,
  Settings,
  Sliders,
  UserPlus,
  Users,
  CreditCard,
} from "lucide-react"

import { useAuth, UserRole } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { useTenant } from '@/contexts/TenantContext'
import type { Features } from '@/contexts/FeatureContext'
import type { Permission } from '@/utils/permissions'
import NotificationsDropdown from '@/components/NotificationsDropdown'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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
]

export default function AdminLayout() {

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

  const handleLogout = () => {

    logout()
    navigate('/')
  }

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

      {/* Sidebar */}

      <aside
        className={`${
          'w-64'
        } bg-white border-r border-slate-200 flex flex-col h-screen min-h-0`}
      >

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

        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between">

          <div>

            <h1 className="text-lg font-semibold">
              {t('layout.welcomeBack')} {getInitials(user?.name)}
            </h1>

            <nav className="flex gap-2 text-xs text-slate-500">

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

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <NotificationsDropdown />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition ml-2"
              style={{ fontSize: '18px' }}
            >
              <LogOut className="w-4 h-4" />
              {t('header.logout')}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">

          <Outlet />

        </main>

      </div>

    </div>
  )
}