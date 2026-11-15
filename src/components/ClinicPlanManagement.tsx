import { useTranslation } from 'react-i18next'
import { PlanType } from '@/services/billingService'

type ClinicPlan = {
  planType: PlanType
  nameKey: 'basic' | 'pro' | 'enterprise'
  price: string | null
}

const clinicPlans: ClinicPlan[] = [
  { planType: PlanType.Basic, nameKey: 'basic', price: '€86' },
  { planType: PlanType.Pro, nameKey: 'pro', price: null },
  { planType: PlanType.Enterprise, nameKey: 'enterprise', price: '€315' },
]

const clinicPlanFeatures: Record<ClinicPlan['nameKey'], string[]> = {
  basic: [
    'billing.clinicPlans.features.clientAppointments',
    'billing.clinicPlans.features.invoicesDocuments',
    'billing.clinicPlans.features.prescriptions',
    'billing.clinicPlans.features.staffManagement',
    'billing.clinicPlans.features.reports',
  ],
  pro: [
    'billing.clinicPlans.features.everythingBasic',
    'billing.clinicPlans.features.advancedClinicTools',
    'billing.clinicPlans.features.advancedReports',
    'billing.clinicPlans.features.moreComingSoon',
  ],
  enterprise: [
    'billing.clinicPlans.features.everythingPro',
    'billing.clinicPlans.features.medicalImaging',
    'billing.clinicPlans.features.dentalModule',
    'billing.clinicPlans.features.advancedClinicCapabilities',
    'billing.clinicPlans.features.prioritySupport',
  ],
}

type ClinicPlanManagementProps = {
  currentPlan: string
  scheduledPlan?: string | null
  scheduledPlanChangeAt?: string | null
  isLoading: boolean
  error: string | null
  notice: string | null
  hasStripeCustomer: boolean
  portalError: string | null
  onChangePlan: (planType: PlanType.Basic | PlanType.Enterprise) => void
  onManageBilling: () => void
}

function formatPlan(plan: string) {
  const key = plan.toLowerCase()
  return ['basic', 'pro', 'enterprise'].includes(key) ? key.toUpperCase() : plan.toUpperCase()
}

export default function ClinicPlanManagement({
  currentPlan,
  scheduledPlan,
  scheduledPlanChangeAt,
  isLoading,
  error,
  notice,
  hasStripeCustomer,
  portalError,
  onChangePlan,
  onManageBilling,
}: ClinicPlanManagementProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('he') || i18n.language.startsWith('ar')
  const normalizedCurrentPlan = currentPlan.toLowerCase()
  const normalizedScheduledPlan = scheduledPlan?.toLowerCase()
  const effectiveDate = scheduledPlanChangeAt ? new Date(scheduledPlanChangeAt) : null
  const validEffectiveDate = effectiveDate && !Number.isNaN(effectiveDate.getTime()) ? effectiveDate : null

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-5xl" aria-label={t('billing.clinicPlans.title')}>
      <div className="mb-5 flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">✓</span>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-wide">{formatPlan(currentPlan)} {t('billing.clinicPlans.planActive')}</p>
          <p className="mt-0.5 text-xs font-medium text-emerald-700">{t('billing.clinicPlans.currentPlan')}</p>
        </div>
      </div>
      <div className="mb-6 flex flex-col items-end gap-3">
        {hasStripeCustomer ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={onManageBilling}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('billing.redirect') : t('billing.manageBilling')}
          </button>
        ) : (
          <p role="status" className="text-sm text-slate-600">{t('billing.portalUnavailable')}</p>
        )}
        {portalError && <p role="alert" className="text-sm text-red-700">{portalError}</p>}
      </div>
      <div className="mb-6">
        {scheduledPlan && (
          <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <span className="font-semibold">{t('billing.clinicPlans.scheduled')}:</span>{' '}
            {formatPlan(scheduledPlan)}
            {validEffectiveDate && (
              <span className="block mt-1">
                {t('billing.clinicPlans.effectiveDate', { date: validEffectiveDate.toLocaleDateString(i18n.language) })}
              </span>
            )}
          </p>
        )}
        {notice && <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {clinicPlans.map((plan) => {
          const isPro = plan.planType === PlanType.Pro
          const planName = plan.nameKey
          const isCurrent = normalizedCurrentPlan === planName
          const isScheduled = normalizedScheduledPlan === planName
          const actionDisabled = isPro || isCurrent || isScheduled || isLoading
          const actionLabel = isPro
            ? t('billing.clinicPlans.comingSoon')
            : isCurrent
              ? t('billing.clinicPlans.currentPlan')
              : isScheduled
                ? t('billing.clinicPlans.scheduled')
                : plan.planType === PlanType.Basic
                  ? t('billing.clinicPlans.switchToBasic')
                  : t('billing.clinicPlans.changeToEnterprise')

          return (
            <article
              key={plan.planType}
              className={`flex h-full flex-col rounded-2xl border bg-white p-7 text-center shadow-lg ${isCurrent ? 'border-blue-500 ring-1 ring-blue-200' : 'border-slate-200'}`}
            >
              <span className={`mx-auto rounded-full px-3 py-1 text-xs font-semibold ${isCurrent ? 'bg-blue-100 text-blue-700' : isPro ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {isPro ? t('billing.clinicPlans.comingSoon') : isCurrent ? t('billing.clinicPlans.currentPlan') : t('billing.clinicPlans.available')}
              </span>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">{plan.nameKey.toUpperCase()}</h2>
              <div className="mt-4 min-h-16">
                {plan.price ? (
                  <>
                    <p className="text-4xl font-semibold text-slate-900">{plan.price}</p>
                    <p className="mt-1 text-sm text-slate-500">{t('billing.clinicPlans.perMonth')}</p>
                  </>
                ) : (
                  <p className="pt-3 text-lg font-medium text-slate-500">{t('billing.clinicPlans.comingSoon')}</p>
                )}
              </div>

              <ul className="mt-4 flex-1 space-y-2 text-start text-sm text-slate-700">
                {clinicPlanFeatures[plan.nameKey].map((featureKey) => (
                  <li key={featureKey} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold leading-none text-emerald-700">✓</span>
                    <span>{t(featureKey)}</span>
                  </li>
                ))}
              </ul>

              {normalizedCurrentPlan === 'basic' && plan.planType === PlanType.Enterprise && (
                <p className="mt-2 min-h-12 text-sm text-amber-800">{t('billing.clinicPlans.prorationWarning')}</p>
              )}
              <button
                type="button"
                disabled={actionDisabled}
                onClick={() => {
                  if (plan.planType === PlanType.Basic || plan.planType === PlanType.Enterprise) {
                    onChangePlan(plan.planType)
                  }
                }}
                className={`mt-auto w-full rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${actionDisabled ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isLoading && !isPro ? t('billing.redirect') : actionLabel}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
