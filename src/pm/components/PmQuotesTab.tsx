import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isBusinessPath } from '@/pm/utils/pmPaths'
import { useTranslation } from 'react-i18next'
import { Download, ExternalLink } from 'lucide-react'
import { getAllQuotesList, downloadQuotePdf } from '@/api/quotes'
import type { QuoteListItem, QuoteStatus } from '@/api/quotes'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'

type Props = { clientId: string }

const STATUS_BADGE: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
  converted: 'bg-purple-100 text-purple-700',
}

// Client-level view: include all quotes belonging to the Client, whether or not they are project-linked.
export default function PmQuotesTab({ clientId }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { hasPermission } = useAuth()
  const { features } = useFeatures()
  const { departmentFeatures } = useDepartmentFeatures()
  const canViewQuotes = hasPermission('manage_quotes') &&
    features?.quotesEnabled === true && departmentFeatures?.quotesEnabled === true
  const [quotes, setQuotes] = useState<QuoteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)

    if (!canViewQuotes) {
      setQuotes([])
      setLoading(false)
      return () => { cancelled = true }
    }

    getAllQuotesList({
      dateRange: 'all',
      clientId,
      status: 'all',
      sortBy: 'newest',
      sortDirection: 'desc',
    })
      .then((items) => { if (!cancelled) setQuotes(items) })
      .catch((error) => {
        console.error('Failed to load client quotes:', error)
        if (!cancelled) {
          setQuotes([])
          setLoadFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clientId, canViewQuotes])

  const handleDownload = async (quoteId: string, quoteNumber: string) => {
    try {
      const blob = await downloadQuotePdf(quoteId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quoteNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download quote PDF:', error)
    }
  }

  if (!canViewQuotes) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t('pm.featureUnavailable')}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{t('pm.tabs.quotes')}</h3>
        <button
          type="button"
          onClick={() => navigate(isBusinessPath(pathname) ? '/business/quotes' : '/admin/quotes')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t('pm.openFullQuotes')}
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-500">{t('common.loading')}</div>
      ) : loadFailed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{t('pm.featureUnavailable')}</div>
      ) : quotes.length === 0 ? (
        <div className="py-6 text-center text-slate-500">{t('pm.quotes.empty')}</div>
      ) : (
        <div className="space-y-2">
          {quotes.map((quote) => (
            <div key={quote.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-800">{quote.quoteNumber}</p>
                <p className="text-xs text-slate-500">{new Date(quote.quoteDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">{quote.totalAmount.toFixed(2)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[quote.status]}`}>
                  {t(`admin.quotes.status.${quote.status}`, quote.status)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDownload(quote.id, quote.quoteNumber)}
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
