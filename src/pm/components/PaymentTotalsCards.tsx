import { CircleDollarSign, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PaymentTotals } from '@/api/payments'

type Props = { totals: PaymentTotals | null; loading: boolean; unavailable?: boolean; title?: string }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)

export default function PaymentTotalsCards({ totals, loading, unavailable = false, title }: Props) {
  const { t } = useTranslation()
  const items = [
    { label: t('payments.invoiceAmountDue'), value: totals?.invoiceAmountDue ?? 0, icon: CircleDollarSign, color: 'text-blue-600' },
    { label: t('payments.actualPaid'), value: totals?.paid ?? 0, icon: CircleDollarSign, color: 'text-emerald-600' },
    { label: t('payments.outstanding'), value: totals?.outstanding ?? 0, icon: Wallet, color: 'text-amber-600' },
  ]

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title ?? t('payments.projectPayments')}</h3>
        <p className="mt-1 text-xs text-slate-500">{t('payments.actualIncludingVat')}</p>
      </div>
      {unavailable ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t('pm.featureUnavailable')}</p> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <p className="mt-2 text-xl font-semibold text-slate-900">{loading ? t('common.loading') : formatCurrency(value)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
