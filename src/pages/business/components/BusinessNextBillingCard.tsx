import { AlertTriangle, CalendarClock, ExternalLink, Mail, Phone, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BusinessNextBilling } from '@/types/businessDashboard'
import { formatDueDate, formatMoney } from '@/utils/businessFormat'

type Props = {
  nextBilling: BusinessNextBilling | null
  currency: string
  onOpenBillingPlan: (nextBilling: BusinessNextBilling) => void
}

export default function BusinessNextBillingCard({ nextBilling, currency, onOpenBillingPlan }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.language

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6" aria-labelledby="business-next-billing">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary-600" />
        <h2 id="business-next-billing" className="text-base font-semibold text-slate-900">{t('businessShell.dashboard.nextBilling.title')}</h2>
      </div>

      {!nextBilling ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-5 text-center">
          <p className="font-medium text-slate-700">{t('businessShell.dashboard.nextBilling.empty')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('businessShell.dashboard.nextBilling.emptyHint')}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-lg font-semibold text-slate-900"><bdi>{nextBilling.milestoneTitle}</bdi></p>
              <p className="mt-0.5 text-sm text-slate-500">
                <bdi>{nextBilling.projectName}</bdi> | <bdi>{nextBilling.clientName}</bdi>
              </p>
            </div>
            <div className="text-end">
              <p className="text-2xl font-bold text-slate-900"><bdi>{formatMoney(nextBilling.amount, currency, language)}</bdi></p>
              <p className="text-xs text-slate-500">{t('businessShell.dashboard.nextBilling.amountNote')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">{t('businessShell.dashboard.nextBilling.dueDate')}:</span>
            <span className="font-medium text-slate-900"><bdi>{formatDueDate(nextBilling.dueDate, language)}</bdi></span>
            {nextBilling.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('businessShell.dashboard.nextBilling.overdue')}
              </span>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <UserRound className="h-3.5 w-3.5" />
              {t('businessShell.dashboard.nextBilling.billingContact')}
            </p>
            {nextBilling.billingContact ? (
              <div className="mt-2 space-y-1">
                <p className="font-medium text-slate-900">
                  <bdi>{nextBilling.billingContact.name}</bdi>
                  {nextBilling.billingContact.roleTitle ? <span className="font-normal text-slate-500"> | <bdi>{nextBilling.billingContact.roleTitle}</bdi></span> : null}
                </p>
                {nextBilling.billingContact.email && (
                  <p className="flex items-center gap-1.5 text-slate-700">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <a className="break-all text-primary-700 hover:underline" href={`mailto:${nextBilling.billingContact.email}`}><bdi>{nextBilling.billingContact.email}</bdi></a>
                  </p>
                )}
                {nextBilling.billingContact.phone && (
                  <p className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <a className="text-primary-700 hover:underline" href={`tel:${nextBilling.billingContact.phone}`}><bdi>{nextBilling.billingContact.phone}</bdi></a>
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-slate-500">{t('businessShell.dashboard.nextBilling.noContact')}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenBillingPlan(nextBilling)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" />
            {t('businessShell.dashboard.nextBilling.openPlan')}
          </button>
        </div>
      )}
    </section>
  )
}
