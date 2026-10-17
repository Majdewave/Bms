import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'

export default function BusinessBillingPage() {
  const { tenant } = useTenant()
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const [showUpgradeInfo, setShowUpgradeInfo] = useState(() => searchParams.get('upgrade') === 'basic')
  const plan = tenant?.plan ?? '—'
  const trialEnd = tenant?.trialEndsAt ? new Date(tenant.trialEndsAt) : null
  const validTrialEnd = trialEnd && !Number.isNaN(trialEnd.getTime()) ? trialEnd : null
  const daysLeft = validTrialEnd ? Math.max(0, Math.ceil((validTrialEnd.getTime() - Date.now()) / 86_400_000)) : null
  const isRtl = i18n.language.startsWith('he') || i18n.language.startsWith('ar')

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t('businessShell.billing.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('businessShell.billing.subtitle')}</p>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">{t('businessShell.billing.currentPlan')}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{plan}</p>
        {plan === 'Trial' && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
            <p className="font-semibold">{t('businessShell.billing.trialStatus')}</p>
            {validTrialEnd && <p className="mt-1 text-sm">{t('businessShell.billing.trialEnds', { date: validTrialEnd.toLocaleDateString(i18n.language) })}</p>}
            {daysLeft !== null && <p className="mt-1 text-sm">{t('businessShell.billing.daysRemaining', { count: daysLeft })}</p>}
          </div>
        )}
        {plan === 'Trial' && (
          <div className="mt-5">
            <button type="button" onClick={() => setShowUpgradeInfo(true)} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
              {t('businessShell.billing.upgradeToBasic')}
            </button>
            {showUpgradeInfo && <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('businessShell.billing.checkoutUnavailable')}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
