import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Briefcase,
  CreditCard,
  FileText,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// Phase 7.6B - separate CLIENTA Business shell. Deliberately independent of AdminLayout / the clinic menu.
// The business shell intentionally exposes a Business-only navigation set while reusing the underlying admin/PM pages.
const NAV_ITEMS = [
  { to: '/business/dashboard', labelKey: 'businessShell.nav.dashboard', icon: LayoutDashboard },
  { to: '/business/clients', labelKey: 'businessShell.nav.clients', icon: Users },
  { to: '/business/projects', labelKey: 'businessShell.nav.projects', icon: FolderKanban },
  { to: '/business/quotes', labelKey: 'businessShell.nav.quotes', icon: FileText },
  { to: '/business/invoices', labelKey: 'businessShell.nav.invoices', icon: FileText },
  { to: '/business/payments', labelKey: 'businessShell.nav.payments', icon: CreditCard },
  { to: '/business/files', labelKey: 'businessShell.nav.files', icon: FolderOpen },
  { to: '/business/team', labelKey: 'businessShell.nav.team', icon: Users },
  { to: '/business/settings', labelKey: 'businessShell.nav.settings', icon: Settings },
  { to: '/business/billing', labelKey: 'businessShell.nav.billing', icon: Briefcase },
]

export default function BusinessLayout() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)
  const isRtl = i18n.dir() === 'rtl'

  const displayName = (user?.name ?? user?.email ?? '').trim() || user?.email || ''
  const tenantLogo = tenant?.logoUrl
    ? tenant.logoUrl.startsWith('http')
      ? tenant.logoUrl
      : `${((import.meta as any).env.VITE_API_URL ?? '').replace(/\/$/, '')}${tenant.logoUrl}`
    : null

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="flex h-screen overflow-hidden bg-[#f8fafc]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 ${isRtl ? 'right-0 border-s' : 'left-0 border-e'} z-40 flex h-screen w-72 transform flex-col border-slate-200 bg-white transition-transform duration-300 md:static md:z-auto md:w-64 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <Link to="/business/dashboard" className="flex items-center gap-2 text-slate-900">
            {tenantLogo && failedLogoUrl !== tenantLogo ? (
              <img key={tenantLogo} src={tenantLogo} onError={() => setFailedLogoUrl(tenantLogo)} alt={tenant?.name || t('businessShell.appName')} className="h-9 max-w-28 object-contain" />
            ) : (
              <Briefcase className="h-6 w-6 shrink-0 text-primary-600" />
            )}
            <span className="min-w-0 truncate text-base font-semibold" dir="auto">{tenant?.name || t('businessShell.appName')}</span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-2 hover:bg-slate-100 md:hidden"
            aria-label={t('businessShell.closeMenu')}
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {NAV_ITEMS.filter(({ to }) => to !== '/business/billing' || user?.role === 'admin').map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-4 py-3" dir="ltr">
          <span className="text-[12px] text-slate-500">Powered by </span>
          <span className="text-[12px] font-semibold text-blue-600">Clienta</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-slate-900">
            <User className="h-4 w-4 shrink-0 text-slate-600" />
            <span className="truncate" title={displayName}>{displayName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 md:gap-4">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md border border-rose-100 bg-rose-50/70 px-2.5 py-2 text-sm text-rose-700 hover:bg-rose-100/80 md:px-3"
              aria-label={t('header.logout')}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">{t('header.logout')}</span>
            </button>
            <button
              type="button"
              className="rounded-md p-2 hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('businessShell.openMenu')}
            >
              <Menu className="h-6 w-6 text-slate-600" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
