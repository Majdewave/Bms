import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePmAreaPrefix } from '@/pm/utils/pmPaths'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ExternalLink, FileText, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'
import { getAllQuotesList } from '@/api/quotes'
import { getInvoices } from '@/api/invoices'
import type { QuoteListItem } from '@/api/quotes'
import type { Invoice } from '@/api/invoices'
import type { Project } from '@/types/pm'
import PmProjectFilesSection from './PmProjectFilesSection'

type Props = { project: Project }

export default function PmProjectDocuments({ project }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { features } = useFeatures()
  const { departmentFeatures } = useDepartmentFeatures()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<QuoteListItem[] | null>(null)
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [quotesLoadFailed, setQuotesLoadFailed] = useState(false)
  const [invoicesLoadFailed, setInvoicesLoadFailed] = useState(false)

  const canLoadQuotes = hasPermission('manage_quotes') &&
    features?.quotesEnabled === true && departmentFeatures?.quotesEnabled === true
  const canLoadInvoices = hasPermission('manage_invoices') && features?.invoicesEnabled === true

  useEffect(() => {
    if (!open || (!canLoadQuotes && !canLoadInvoices)) return

    let cancelled = false
    setLoading(true)
    setQuotes(null)
    setInvoices(null)
    setQuotesLoadFailed(false)
    setInvoicesLoadFailed(false)
    const requests: Promise<unknown>[] = []

    if (canLoadQuotes) {
      requests.push(getAllQuotesList({
        dateRange: 'all',
        clientId: project.clientId,
        projectId: project.id,
        status: 'all',
        sortBy: 'newest',
        sortDirection: 'desc',
      }).then((items) => {
        if (!cancelled) setQuotes(items)
      }).catch((error) => {
        console.error('Failed to load project quotes:', error)
        if (!cancelled) setQuotesLoadFailed(true)
      }))
    } else {
      setQuotes(null)
    }

    if (canLoadInvoices) {
      requests.push(getInvoices({ clientId: project.clientId, projectId: project.id })
        .then((result) => {
          if (!cancelled) setInvoices(result)
        }).catch((error) => {
          console.error('Failed to load project invoices:', error)
          if (!cancelled) setInvoicesLoadFailed(true)
        }))
    } else {
      setInvoices(null)
    }

    Promise.all(requests).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [open, project.id, project.clientId, canLoadQuotes, canLoadInvoices])

  const quoteTotal = (quotes ?? []).reduce((sum, quote) => sum + quote.totalAmount, 0)
  const invoiceTotal = (invoices ?? []).reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const routePrefix = usePmAreaPrefix()
  const createQuoteUrl = `${routePrefix}/quotes?${new URLSearchParams({ clientId: project.clientId, projectId: project.id })}`
  const createInvoiceUrl = `${routePrefix}/invoices?${new URLSearchParams({ clientId: project.clientId, projectId: project.id })}`

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-start text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm"><FileText className="h-5 w-5" /></span>
        <span className="flex-1 text-base">{t('pm.viewProjectDocuments')}</span>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t('pm.quotedTotal')}</p>
              <p className="font-semibold text-slate-900">
                {!canLoadQuotes || quotesLoadFailed ? t('pm.featureUnavailable') : loading || quotes === null ? t('common.loading') : quoteTotal.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t('pm.invoicedTotal')}</p>
              <p className="font-semibold text-slate-900">
                {!canLoadInvoices || invoicesLoadFailed ? t('pm.featureUnavailable') : loading || invoices === null ? t('common.loading') : invoiceTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canLoadQuotes && (
              <button type="button" onClick={() => navigate(createQuoteUrl)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Plus className="h-3.5 w-3.5" />{t('pm.createQuote')}
              </button>
            )}
            {canLoadInvoices && (
              <button type="button" onClick={() => navigate(createInvoiceUrl)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Plus className="h-3.5 w-3.5" />{t('pm.createInvoice')}
              </button>
            )}
            {canLoadQuotes && (
              <button type="button" onClick={() => navigate(`${routePrefix}/quotes`)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50">
                <ExternalLink className="h-3.5 w-3.5" />{t('pm.openFullQuotes')}
              </button>
            )}
            {canLoadInvoices && (
              <button type="button" onClick={() => navigate(`${routePrefix}/invoices`)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50">
                <ExternalLink className="h-3.5 w-3.5" />{t('pm.openFullInvoices')}
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {canLoadQuotes ? (
                <div>
                  <h5 className="mb-1 text-xs font-semibold text-slate-600">{t('pm.projectQuotes')}</h5>
                  {quotesLoadFailed ? <p className="text-xs text-amber-700">{t('pm.featureUnavailable')}</p> : quotes?.length ? quotes.map((quote) => (
                    <p key={quote.id} className="truncate text-xs text-slate-700">{quote.quoteNumber} · {quote.totalAmount.toFixed(2)}</p>
                  )) : <p className="text-xs text-slate-400">{t('pm.quotes.empty')}</p>}
                </div>
              ) : <p className="text-xs text-amber-700">{t('pm.projectQuotes')}: {t('pm.featureUnavailable')}</p>}
              {canLoadInvoices ? (
                <div>
                  <h5 className="mb-1 text-xs font-semibold text-slate-600">{t('pm.projectInvoices')}</h5>
                  {invoicesLoadFailed ? <p className="text-xs text-amber-700">{t('pm.featureUnavailable')}</p> : invoices?.length ? invoices.map((invoice) => (
                    <p key={invoice.id} className="truncate text-xs text-slate-700">{invoice.number} · {invoice.totalAmount.toFixed(2)}</p>
                  )) : <p className="text-xs text-slate-400">{t('pm.invoices.empty')}</p>}
                </div>
              ) : <p className="text-xs text-amber-700">{t('pm.projectInvoices')}: {t('pm.featureUnavailable')}</p>}
            </div>
          )}

          <PmProjectFilesSection project={project} />
        </div>
      )}
    </div>
  )
}
