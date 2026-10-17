import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { getInvoices } from '@/api/invoices'
import type { Invoice } from '@/api/invoices'
import { useTenant } from '@/contexts/TenantContext'
import InvoicePaymentsPanel from '@/components/InvoicePaymentsPanel'

export default function BusinessPaymentsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { tenant } = useTenant()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let active = true
    getInvoices()
      .then((items) => { if (active) setInvoices(items) })
      .catch((error) => {
        console.error('Failed to load Business payment index:', error)
        if (active) setLoadFailed(true)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const isRtl = i18n.dir() === 'rtl'
  const currency = tenant?.currency ?? 'ILS'
  const formatAmount = (amount: number) => new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(amount || 0)
  const paymentInvoices = invoices

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t('businessShell.payments.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('businessShell.payments.subtitle')}</p>
      </header>

      {loading ? <p className="py-8 text-center text-slate-500">{t('common.loading')}</p> : loadFailed ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('businessShell.payments.loadError')}</p>
      ) : paymentInvoices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">{t('businessShell.payments.empty')}</div>
      ) : (
        <div className="space-y-3">
          {paymentInvoices.map((invoice) => (
            <article key={invoice.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{invoice.number}</h2>
                  <p className="mt-1 text-sm text-slate-600">{invoice.clientName}</p>
                  <p className="mt-1 text-xs text-slate-500">{t('businessShell.payments.invoiceAmount')}: {formatAmount(invoice.finalAmountToPay ?? invoice.totalAmount)}</p>
                  <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{t(`payments.paymentStates.${invoice.status}`)}</span>
                </div>
                <button type="button" onClick={() => navigate('/business/invoices')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <ExternalLink className="h-4 w-4" />{t('businessShell.payments.openInvoice')}
                </button>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <InvoicePaymentsPanel invoice={invoice} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
