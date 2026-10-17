import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isBusinessPath } from '@/pm/utils/pmPaths'
import { useTranslation } from 'react-i18next'
import { Download, ExternalLink } from 'lucide-react'
import { getInvoices, downloadInvoice } from '@/api/invoices'
import type { Invoice, InvoiceStatus } from '@/api/invoices'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'

type Props = { clientId: string }

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
}

// Client-level view: include all invoices belonging to the Client, whether or not they are project-linked.
export default function PmInvoicesTab({ clientId }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { hasPermission } = useAuth()
  const { features } = useFeatures()
  const canViewInvoices = hasPermission('manage_invoices') && features?.invoicesEnabled === true
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)

    if (!canViewInvoices) {
      setInvoices([])
      setLoading(false)
      return () => { cancelled = true }
    }

    getInvoices({ clientId })
      .then((all) => {
        if (!cancelled) setInvoices(all)
      })
      .catch((error) => {
        console.error('Failed to load client invoices:', error)
        if (!cancelled) {
          setInvoices([])
          setLoadFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clientId, canViewInvoices])

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const blob = await downloadInvoice(invoiceId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download invoice PDF:', error)
    }
  }

  if (!canViewInvoices) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t('pm.featureUnavailable')}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{t('pm.tabs.invoices')}</h3>
        <button
          type="button"
          onClick={() => navigate(isBusinessPath(pathname) ? '/business/invoices' : '/admin/invoices')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('pm.openFullInvoices')}
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-500">{t('common.loading')}</div>
      ) : loadFailed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t('pm.featureUnavailable')}</div>
      ) : invoices.length === 0 ? (
        <div className="py-6 text-center text-slate-500">{t('pm.invoices.empty')}</div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-800">{invoice.number}</p>
                <p className="text-xs text-slate-500">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">{invoice.totalAmount.toFixed(2)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[invoice.status]}`}>
                  {t(`admin.invoices.status.${invoice.status}`, invoice.status)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload(invoice.id, invoice.number)}
                  className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                  title={t('admin.clientProfile.download')}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
