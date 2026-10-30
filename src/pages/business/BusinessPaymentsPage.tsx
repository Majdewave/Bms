import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock3, ExternalLink } from 'lucide-react'
import { getInvoices } from '@/api/invoices'
import type { Invoice } from '@/api/invoices'
import { useTenant } from '@/contexts/TenantContext'
import InvoicePaymentsPanel from '@/components/InvoicePaymentsPanel'

const PAYMENT_BADGE_CLASSES = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  overdue: 'border-red-200 bg-red-50 text-red-800',
  other: 'border-amber-200 bg-amber-50 text-amber-800',
}

function getEndDateDetails(value: string | null | undefined, status: Invoice['projectStatus'], language: string) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(date.getTime())) return null
  const locale = language.startsWith('he') ? 'he-IL' : language.startsWith('ar') ? 'ar' : 'en-US'
  const formatted = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const daysRemaining = Math.floor((date.getTime() - todayUtc) / 86_400_000)
  const warning = status !== 'Completed' && status !== 'Cancelled' && daysRemaining <= 60

  return {
    formatted,
    warning,
    tone: daysRemaining <= 30
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-amber-200 bg-amber-50 text-amber-900',
    warningKey: daysRemaining < 0
      ? 'businessShell.payments.projectEndDateOverdue'
      : daysRemaining <= 30
        ? 'businessShell.payments.projectEndDateWithin30Days'
        : 'businessShell.payments.projectEndDateWithin60Days',
  }
}

function isInvoicePastDue(invoice: Invoice) {
  if (!invoice.dueDate || invoice.status === 'paid' || invoice.status === 'cancelled') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(invoice.dueDate)
  if (!match) return false
  const dueDateUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const today = new Date()
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return dueDateUtc < todayUtc
}

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
          {paymentInvoices.map((invoice) => {
            const projectName = invoice.projectName?.trim()
            const endDate = getEndDateDetails(invoice.projectEndDate, invoice.projectStatus, i18n.resolvedLanguage || i18n.language)
            const isOverdue = isInvoicePastDue(invoice)
            const displayedPaymentStatus = isOverdue ? 'overdue' : invoice.status
            const paymentTone = displayedPaymentStatus === 'paid'
              ? PAYMENT_BADGE_CLASSES.paid
              : displayedPaymentStatus === 'overdue'
                ? PAYMENT_BADGE_CLASSES.overdue
                : PAYMENT_BADGE_CLASSES.other

            return (
              <article key={invoice.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">{invoice.number}</h2>
                    <p className="mt-1 text-sm text-slate-600">{invoice.clientName}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('businessShell.payments.invoiceAmount')}: {formatAmount(invoice.finalAmountToPay ?? invoice.totalAmount)}</p>
                    <span className={`mt-2 inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-bold shadow-sm ${paymentTone}`}>{t(`payments.paymentStates.${displayedPaymentStatus}`)}</span>
                    {invoice.projectId && (
                      <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                        {projectName && <p className="text-sm font-semibold text-slate-800">{t('businessShell.payments.project')}: <span className="font-medium"><bdi>{projectName}</bdi></span></p>}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" />
                            <span>{t('businessShell.payments.projectEndDate')}:</span>
                            <bdi className="font-medium text-slate-800">{endDate?.formatted ?? t('pm.projects.notSet')}</bdi>
                          </span>
                          {invoice.projectPaymentType && (
                            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                              {t(`pm.paymentTypes.${invoice.projectPaymentType}`)}
                            </span>
                          )}
                        </div>
                        {endDate?.warning && (
                          <p className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${endDate.tone}`} role="status">
                            <Clock3 className="h-4 w-4" aria-hidden="true" />
                            {t(endDate.warningKey)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => navigate('/business/invoices')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <ExternalLink className="h-4 w-4" />{t('businessShell.payments.openInvoice')}
                  </button>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <InvoicePaymentsPanel invoice={invoice} />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
