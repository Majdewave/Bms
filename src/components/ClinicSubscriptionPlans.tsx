import { useTranslation } from 'react-i18next'
import { PlanType } from '@/services/billingService'

type ClinicPurchasablePlan = PlanType.Basic | PlanType.Enterprise

type ClinicPlan = {
  planType: PlanType
  nameKey: 'basic' | 'pro' | 'enterprise'
  price: string | null
  available: boolean
}

const clinicPlans: ClinicPlan[] = [
  { planType: PlanType.Basic, nameKey: 'basic', price: '€86', available: true },
  { planType: PlanType.Pro, nameKey: 'pro', price: null, available: false },
  { planType: PlanType.Enterprise, nameKey: 'enterprise', price: '€315', available: true },
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

type ClinicSubscriptionPlansProps = {
  isLoading: boolean
  onChoosePlan: (planType: ClinicPurchasablePlan) => void
}

export default function ClinicSubscriptionPlans({
  isLoading,
  onChoosePlan,
}: ClinicSubscriptionPlansProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language.startsWith('he') || i18n.language.startsWith('ar')

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-5xl" aria-label={t('billing.clinicPlans.title')}>
      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {clinicPlans.map((plan) => {
          const isPurchasable = plan.available && plan.planType !== PlanType.Pro

          return (
            <article
              key={plan.planType}
              className={`flex h-full flex-col rounded-2xl border bg-white p-7 text-center shadow-lg ${
                isPurchasable
                  ? 'border-blue-200'
                  : 'border-slate-200 opacity-80'
              }`}
            >
              <span
                className={`mx-auto rounded-full px-3 py-1 text-xs font-semibold ${
                  isPurchasable
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t(isPurchasable ? 'billing.clinicPlans.available' : 'billing.clinicPlans.comingSoon')}
              </span>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">{plan.nameKey.toUpperCase()}</h2>

              <div className="mt-4 min-h-16">
                {plan.price ? (
                  <>
                    <p className="text-4xl font-semibold text-slate-900">{plan.price}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t('billing.clinicPlans.perMonth')}
                    </p>
                  </>
                ) : (
                  <p className="pt-3 text-lg font-medium text-slate-500">
                    {t('billing.clinicPlans.comingSoon')}
                  </p>
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

              <button
                type="button"
                disabled={!isPurchasable || isLoading}
                onClick={() => {
                  if (
                    isPurchasable &&
                    (plan.planType === PlanType.Basic || plan.planType === PlanType.Enterprise)
                  ) {
                    onChoosePlan(plan.planType)
                  }
                }}
                className={`mt-auto w-full rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  isPurchasable
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60'
                    : 'cursor-not-allowed bg-slate-100 text-slate-500'
                }`}
              >
                {isPurchasable && isLoading
                  ? t('billing.redirect')
                  : t(isPurchasable ? 'billing.clinicPlans.choosePlan' : 'billing.clinicPlans.comingSoon')}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
