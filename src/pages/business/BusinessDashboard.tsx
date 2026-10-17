import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Banknote, CircleDollarSign, FileText, FolderKanban, Hourglass, Receipt, Scale, UserPlus, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { useTenant } from '@/contexts/TenantContext'
import CreateClientModal from '@/components/CreateClientModal'
import { BusinessDashboardUnavailableError, getBusinessDashboard } from '@/api/businessDashboard'
import { pmBillingPath, pmClientPath } from '@/pm/utils/pmPaths'
import { formatMoney } from '@/utils/businessFormat'
import type { BusinessDashboard as BusinessDashboardData, BusinessNextBilling } from '@/types/businessDashboard'
import BusinessKpiCard from './components/BusinessKpiCard'
import BusinessNextBillingCard from './components/BusinessNextBillingCard'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unavailable' }
  | { status: 'ready'; data: BusinessDashboardData }

// Phase 8B - CLIENTA Business financial dashboard. All figures come from GET /api/business/dashboard; nothing is recomputed here.
export default function BusinessDashboard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission, user } = useAuth()
  const { features } = useFeatures()
  const { tenant } = useTenant()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [showCreateClient, setShowCreateClient] = useState(false)

  const load = useCallback(() => {
    setState({ status: 'loading' })
    getBusinessDashboard()
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => {
        console.error('Failed to load the business dashboard:', error)
        setState({ status: error instanceof BusinessDashboardUnavailableError ? 'unavailable' : 'error' })
      })
  }, [])

  useEffect(() => { load() }, [load])

  const canClients = hasPermission('manage_clients')
  const canQuotes = hasPermission('manage_quotes') && features?.quotesEnabled === true
  const canInvoices = hasPermission('manage_invoices') && features?.invoicesEnabled === true
  const trialEnd = tenant?.trialEndsAt ? new Date(tenant.trialEndsAt) : null
  const validTrialEnd = trialEnd && !Number.isNaN(trialEnd.getTime()) ? trialEnd : null
  const trialDaysRemaining = validTrialEnd
    ? Math.max(0, Math.ceil((validTrialEnd.getTime() - Date.now()) / 86_400_000))
    : null
  const openBillingPlan = (next: BusinessNextBilling) => navigate(pmBillingPath('/business', next.clientId, next.projectId))

  const quickActions = [
    { key: 'projects', icon: FolderKanban, label: t('businessShell.dashboard.quick.projects'), onClick: () => navigate('/business/projects'), show: true },
    { key: 'newClient', icon: UserPlus, label: t('businessShell.dashboard.quick.newClient'), onClick: () => setShowCreateClient(true), show: canClients },
    { key: 'quotes', icon: FileText, label: t('businessShell.dashboard.quick.quotes'), onClick: () => navigate('/business/quotes'), show: canQuotes },
    { key: 'invoices', icon: Receipt, label: t('businessShell.dashboard.quick.invoices'), onClick: () => navigate('/business/invoices'), show: canInvoices },
  ].filter((action) => action.show)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary-700" dir="ltr">{t('businessShell.appName')}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{t('businessShell.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-slate-600 md:text-base">{t('businessShell.dashboard.subtitle')}</p>
      </header>

      <section
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${tenant?.plan === 'Trial' && trialDaysRemaining !== null && trialDaysRemaining <= 3 ? 'border-rose-200 bg-rose-50 text-rose-900' : tenant?.plan === 'Trial' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}
        aria-label={t('businessShell.billing.currentPlan')}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-bold">{t('businessShell.billing.currentPlan')}: {tenant?.plan || '—'}</span>
          {tenant?.plan === 'Trial' && (
            <span className="text-sm">
              {validTrialEnd
                ? t('businessShell.billing.dashboardTrial', { date: validTrialEnd.toLocaleDateString(i18n.language), count: trialDaysRemaining ?? 0 })
                : t('businessShell.billing.trialStatus')}
            </span>
          )}
          {tenant?.plan && tenant.plan !== 'Trial' && <span className="text-sm">{t('businessShell.billing.activeStatus')}</span>}
        </div>
        {tenant?.plan === 'Trial' && user?.role === 'admin' && (
          <button type="button" onClick={() => navigate('/business/billing?upgrade=basic')} className="shrink-0 rounded-lg border border-current/20 bg-white/80 px-3 py-1.5 text-sm font-semibold hover:bg-white">
            {t('businessShell.billing.upgradeToBasic')}
          </button>
        )}
      </section>

      {state.status === 'loading' && (
        <div aria-busy="true" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 lg:col-span-2" />
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          </div>
        </div>
      )}

      {(state.status === 'error' || state.status === 'unavailable') && (
        <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">
            {state.status === 'unavailable' ? t('businessShell.dashboard.unavailable') : t('businessShell.dashboard.error')}
          </p>
          {state.status === 'error' && (
            <button type="button" onClick={load} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              {t('businessShell.dashboard.retry')}
            </button>
          )}
        </div>
      )}

      {state.status === 'ready' && (() => {
        const { data } = state
        const money = (value: number | null) => (value === null ? null : formatMoney(value, data.currency, i18n.language))
        const unavailable = t('businessShell.dashboard.notAvailable')
        return (
          <>
            {data.projectCount === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-5">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{t('businessShell.dashboard.empty.title')}</p>
                  <p className="text-sm text-slate-600">{t('businessShell.dashboard.empty.text')}</p>
                </div>
                <button type="button" onClick={() => navigate('/business/projects')} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                  {t('businessShell.dashboard.empty.cta')}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              <BusinessKpiCard icon={Banknote} tone="primary" label={t('businessShell.dashboard.kpi.projectValue.label')} hint={t('businessShell.dashboard.kpi.projectValue.hint', { count: data.projectCount })} value={money(data.projectValue)} unavailableText={unavailable} />
              <BusinessKpiCard icon={Receipt} tone="slate" label={t('businessShell.dashboard.kpi.invoiced.label')} hint={t('businessShell.dashboard.kpi.invoiced.hint')} value={money(data.invoiced)} unavailableText={unavailable} />
              <BusinessKpiCard icon={Wallet} tone="emerald" label={t('businessShell.dashboard.kpi.paid.label')} hint={t('businessShell.dashboard.kpi.paid.hint')} value={money(data.paid)} unavailableText={unavailable} />
              <BusinessKpiCard icon={Scale} tone="amber" label={t('businessShell.dashboard.kpi.outstanding.label')} hint={t('businessShell.dashboard.kpi.outstanding.hint')} value={money(data.outstanding)} unavailableText={unavailable} />
              <BusinessKpiCard icon={Hourglass} tone="violet" label={t('businessShell.dashboard.kpi.notYetInvoiced.label')} hint={t('businessShell.dashboard.kpi.notYetInvoiced.hint')} value={money(data.notYetInvoiced)} unavailableText={unavailable} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                <BusinessNextBillingCard nextBilling={data.nextBilling} currency={data.currency} onOpenBillingPlan={openBillingPlan} />
              </div>
              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6" aria-labelledby="business-quick-actions">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-5 w-5 text-primary-600" />
                  <h2 id="business-quick-actions" className="text-base font-semibold text-slate-900">{t('businessShell.dashboard.quick.title')}</h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {quickActions.map(({ key, icon: Icon, label, onClick }) => (
                    <button key={key} type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                      <Icon className="h-4 w-4 text-slate-500" />
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        )
      })()}

      {showCreateClient && (
        <CreateClientModal
          onClose={() => setShowCreateClient(false)}
          onCreated={(client: { id: string }) => {
            setShowCreateClient(false)
            navigate(pmClientPath('/business', client.id))
          }}
        />
      )}
    </div>
  )
}
