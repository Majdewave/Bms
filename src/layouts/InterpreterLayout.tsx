import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function InterpreterLayout() {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isRTL = i18n.dir() === 'rtl'
  const isProfileRoute = location.pathname === '/interpreter/profile'

  const handleLogout = () => {
    setMobileMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/clienta-logo.png"
              alt="Clienta"
              className="h-9 w-auto"
            />

            <div className="hidden border-s border-slate-200 ps-3 sm:block">
              <div className="text-sm font-semibold text-slate-900">
                {t('interpreter.portalTitle')}
              </div>
              <div className="text-xs text-slate-500">
                {t('interpreter.portalSubtitle')}
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => navigate('/interpreter/requests')}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                !isProfileRoute
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              {t('interpreter.myInterpretations')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/interpreter/profile')}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isProfileRoute
                  ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
              }`}
            >
              <UserRound className="h-4 w-4" />
              {t('interpreter.myProfile')}
            </button>
            <LanguageSwitcher />
            <div className="ms-4 border-s border-slate-200 ps-4 text-end">
              <div className="text-sm font-medium text-slate-900">
                {user?.name}
              </div>
              <div className="text-xs text-slate-500">
                {t('interpreter.portalTitle')}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              {t('interpreter.logout')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 sm:hidden"
            aria-label={mobileMenuOpen ? t('common.close') : t('interpreter.portalTitle')}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 px-4 py-3 sm:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              <button type="button" onClick={() => { navigate('/interpreter/requests'); setMobileMenuOpen(false) }} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${!isProfileRoute ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                <ClipboardList className="h-4 w-4" />{t('interpreter.myInterpretations')}
              </button>
              <button type="button" onClick={() => { navigate('/interpreter/profile'); setMobileMenuOpen(false) }} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${isProfileRoute ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                <UserRound className="h-4 w-4" />{t('interpreter.myProfile')}
              </button>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                <LanguageSwitcher />
                <button type="button" onClick={handleLogout} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  <LogOut className="h-4 w-4" />{t('interpreter.logout')}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

