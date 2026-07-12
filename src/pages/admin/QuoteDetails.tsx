import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Loader2, Printer } from 'lucide-react'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'
import * as quotesService from '@/api/quotes'
import type { Quote } from '@/api/quotes'

const formatDate = (value: string | undefined, language: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(language)
}

const isRtlLanguage = (language: string) => {
  const normalizedLanguage = language.toLowerCase()
  return normalizedLanguage.startsWith('he') || normalizedLanguage.startsWith('ar')
}

export default function QuoteDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { departmentFeatures } = useDepartmentFeatures()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)

  const isQuotesEnabled = departmentFeatures?.quotesEnabled === true
  const isRtl = isRtlLanguage(i18n.language)

  useEffect(() => {
    if (departmentFeatures === null || !isQuotesEnabled) {
      return
    }

    const loadQuote = async () => {
      if (!id) return

      try {
        const data = await quotesService.getQuote(id)
        setQuote(data)
      } catch (error) {
        console.error('Failed to load quote', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuote()
  }, [departmentFeatures, isQuotesEnabled, id])

  if (departmentFeatures === null) {
    return <div className="p-6" dir={isRtl ? 'rtl' : 'ltr'}>{t('common.loading')}</div>
  }

  if (!isQuotesEnabled) {
    return <div className="p-6 text-center text-slate-500" dir={isRtl ? 'rtl' : 'ltr'}>{t('unauthorized.subtitle')}</div>
  }

  const handleDownload = async (shouldPrint: boolean) => {
    if (!quote) return

    const setLoadingState = shouldPrint ? setPrinting : setDownloading
    const isActionInProgress = shouldPrint ? printing : downloading

    if (isActionInProgress) {
      return
    }

    setLoadingState(true)

    try {
      const blob = await quotesService.downloadQuotePdf(quote.id)
      const url = window.URL.createObjectURL(blob)

      if (shouldPrint) {
        const printWindow = window.open(url, '_blank')
        if (printWindow) {
          printWindow.onload = () => printWindow.print()
        }
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = `${quote.quoteNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download quote PDF', error)
    } finally {
      setLoadingState(false)
    }
  }

  if (loading) {
    return <div className="p-6" dir={isRtl ? 'rtl' : 'ltr'}>{t('common.loading')}</div>
  }

  if (!quote) {
    return <div className="p-6" dir={isRtl ? 'rtl' : 'ltr'}>{t('admin.quotes.notFound')}</div>
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{quote.quoteNumber}</h1>
          <p className="text-slate-600 mt-1">{t('admin.quotes.detailsSubtitle')}</p>
        </div>

        <button type="button" className="btn btn-secondary btn-md" onClick={() => navigate(-1)}>{t('common.back')}</button>
      </div>

      <div className="card p-5 space-y-2">
        <div><strong>{t('admin.quotes.table.client')}:</strong> {quote.clientName}</div>
        <div><strong>{t('admin.quotes.table.date')}:</strong> {formatDate(quote.quoteDate, i18n.language)}</div>
        <div><strong>{t('admin.quotes.table.validUntil')}:</strong> {formatDate(quote.validUntil, i18n.language)}</div>
        <div><strong>{t('common.status')}:</strong> {t(`admin.quotes.status.${quote.status}`)}</div>
        <div><strong>{t('admin.quotes.form.grandTotal')}:</strong> {quote.totalAmount.toFixed(2)}</div>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-3">{t('admin.quotes.form.lineItems')}</h2>
        <div className="mb-2 hidden grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
          <div className="col-span-6">{t('admin.quotes.form.description')}</div>
          <div className="col-span-2">{t('admin.quotes.form.quantity')}</div>
          <div className="col-span-2">{t('admin.quotes.form.unitPrice')}</div>
          <div className="col-span-2">{t('admin.quotes.form.total')}</div>
        </div>
        <div className="space-y-2">
          {quote.lineItems.map((lineItem) => (
            <div key={lineItem.id} className="grid grid-cols-12 gap-2 text-sm border-b border-slate-100 pb-2">
              <div className="col-span-6">{lineItem.description}</div>
              <div className="col-span-2">{lineItem.quantity}</div>
              <div className="col-span-2">{lineItem.unitPrice.toFixed(2)}</div>
              <div className="col-span-2">{lineItem.total.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" disabled={downloading} onClick={() => handleDownload(false)} className="btn btn-secondary btn-md gap-2">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? t('admin.quotes.actions.downloading') : t('admin.quotes.actions.download')}
        </button>
        <button type="button" disabled={printing} onClick={() => handleDownload(true)} className="btn btn-primary btn-md gap-2">
          {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          {printing ? t('admin.quotes.actions.printing') : t('common.print')}
        </button>
      </div>
    </div>
  )
}
