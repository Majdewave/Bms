import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Briefcase, CircleDollarSign, FileText, Wallet } from 'lucide-react'
import { getProjectsByClient } from '@/api/projects'
import { getClientContacts } from '@/api/clientContacts'
import { getInvoices } from '@/api/invoices'
import { getClientPaymentSummary } from '@/api/payments'
import type { PaymentTotals } from '@/api/payments'
import PaymentTotalsCards from './PaymentTotalsCards'
import type { Project } from '@/types/pm'
import type { ClientContact } from '@/types/pm'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'

type Props = { clientId: string }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)

export default function PmOverviewTab({ clientId }: Props) {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const { features } = useFeatures()
  const canLoadInvoices = hasPermission('manage_invoices') && features?.invoicesEnabled === true
  const [projects, setProjects] = useState<Project[]>([])
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [clientInvoicedTotal, setClientInvoicedTotal] = useState(0)
  const [clientOutstandingTotal, setClientOutstandingTotal] = useState(0)
  const [clientPaymentTotals, setClientPaymentTotals] = useState<PaymentTotals | null>(null)
  const [paymentTotalsFailed, setPaymentTotalsFailed] = useState(false)
  const [invoiceLoadFailed, setInvoiceLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setInvoiceLoadFailed(false)
    setPaymentTotalsFailed(false)

    const invoiceRequest = canLoadInvoices ? getInvoices({ clientId }) : Promise.resolve(null)
    const paymentRequest = canLoadInvoices ? getClientPaymentSummary(clientId) : Promise.resolve(null)
    Promise.allSettled([
      getProjectsByClient(clientId),
      getClientContacts(clientId),
      invoiceRequest,
      paymentRequest,
    ]).then(([projectsResult, contactsResult, invoicesResult, paymentTotalsResult]) => {
      if (cancelled) return

      setProjects(projectsResult.status === 'fulfilled' ? projectsResult.value : [])
      setContacts(contactsResult.status === 'fulfilled' ? contactsResult.value : [])

      if (canLoadInvoices && invoicesResult.status === 'fulfilled' && invoicesResult.value) {
        const clientInvoices = invoicesResult.value.filter((invoice) => invoice.clientId === clientId)
        const invoiced = clientInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0)
        const outstanding = clientInvoices
          .filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled')
          .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0)
        setClientInvoicedTotal(invoiced)
        setClientOutstandingTotal(outstanding)
      } else if (canLoadInvoices && invoicesResult.status === 'rejected') {
        setInvoiceLoadFailed(true)
      }
      if (canLoadInvoices && paymentTotalsResult.status === 'fulfilled' && paymentTotalsResult.value) {
        setClientPaymentTotals(paymentTotalsResult.value)
      } else if (canLoadInvoices && paymentTotalsResult.status === 'rejected') {
        setPaymentTotalsFailed(true)
      }
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId, canLoadInvoices])

  const activeProjects = projects.filter((project) => project.status === 'Active')
  const totalProjectValue = projects.reduce((sum, project) => sum + (project.value || 0), 0)
  const primaryContact = contacts.find((contact) => contact.isPrimary)
  const billingContact = contacts.find((contact) => contact.isBillingContact)
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (loading) {
    return <div className="py-6 text-center text-slate-500">{t('common.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">{t('pm.overview.activeProjects')}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{activeProjects.length}</p>
            </div>
            <Briefcase className="h-6 w-6 text-primary-500" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">{t('pm.overview.projectValue')}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(totalProjectValue)}</p>
            </div>
            <CircleDollarSign className="h-6 w-6 text-emerald-500" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">{t('pm.overview.clientInvoiced')}</p>
              {canLoadInvoices && !invoiceLoadFailed ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(clientInvoicedTotal)}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{t('pm.overview.clientLevelHint')}</p>
                </>
              ) : <p className="mt-2 text-xs text-amber-700">{t('pm.featureUnavailable')}</p>}
            </div>
            <FileText className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">{t('pm.overview.clientOutstanding')}</p>
              {canLoadInvoices && !invoiceLoadFailed ? (
                <>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(clientOutstandingTotal)}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{t('pm.overview.clientLevelHint')}</p>
                </>
              ) : <p className="mt-2 text-xs text-amber-700">{t('pm.featureUnavailable')}</p>}
            </div>
            <Wallet className="h-6 w-6 text-amber-500" />
          </div>
        </div>
      </div>

      <PaymentTotalsCards title={t('payments.clientPayments')} totals={clientPaymentTotals} loading={loading} unavailable={!canLoadInvoices || paymentTotalsFailed} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">{t('pm.overview.recentProjects')}</h3>
          {recentProjects.length === 0 ? (
            <p className="text-sm text-slate-500">{t('pm.projects.empty')}</p>
          ) : (
            <ul className="space-y-2">
              {recentProjects.map((project) => (
                <li key={project.id} className="flex items-center justify-between rounded-lg bg-white p-3 text-sm shadow-sm">
                  <span className="font-medium text-slate-800">{project.name}</span>
                  <span className="text-slate-500">{formatCurrency(project.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{t('pm.overview.primaryContact')}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {primaryContact ? <>{primaryContact.name} {primaryContact.phone ? <>• <span dir="ltr" className="inline-block text-left">{primaryContact.phone}</span></> : ''}</> : t('none')}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{t('pm.overview.billingContact')}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {billingContact ? <>{billingContact.name} {billingContact.phone ? <>• <span dir="ltr" className="inline-block text-left">{billingContact.phone}</span></> : ''}</> : t('none')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
