import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'
import { useTenant } from '@/contexts/TenantContext'
import { clientsService } from '@/api'
import * as quotesService from '@/api/quotes'
import type { Client } from '@/api'
import type { Quote, QuoteStatus, CreateQuoteRequest, QuoteListItem, QuoteDateRange } from '@/api/quotes'
import { calculateInvoiceTotals, DEFAULT_VAT_RATE } from '@/api/invoices'
import Autocomplete from '@/components/Autocomplete'
import { Download, Eye, FilePlus2, Pencil, Plus, Printer, Repeat2, Search, Trash2, User, UserPlus, Loader2 } from 'lucide-react'

type QuoteFormLineItem = {
  id: string
  description: string
  quantity: string
  unitPrice: string
}

type QuoteFormState = {
  clientId: string
  departmentId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  quoteDate: string
  validUntil: string
  status: QuoteStatus
  notes: string
  termsAndConditions: string
  lineItems: QuoteFormLineItem[]
}

type QuoteActionType = 'download' | 'print' | 'duplicate' | 'delete' | 'convert'
type QuoteListSortBy = 'newest' | 'date' | 'quoteNumber' | 'client' | 'status' | 'amount'

const QUOTES_PAGE_SIZE = 20

const QUOTE_NOTES_SEPARATOR = '\n\n---QUOTE-TERMS---\n\n'

const STATUS_META: Record<QuoteStatus, { className: string }> = {
  draft: { className: 'bg-slate-100 text-slate-700' },
  sent: { className: 'bg-blue-100 text-blue-700' },
  approved: { className: 'bg-green-100 text-green-700' },
  rejected: { className: 'bg-red-100 text-red-700' },
  expired: { className: 'bg-amber-100 text-amber-700' },
  converted: { className: 'bg-purple-100 text-purple-700' },
}

const createLineItemId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `quote-line-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const createEmptyLineItem = (): QuoteFormLineItem => ({
  id: createLineItemId(),
  description: '',
  quantity: '1',
  unitPrice: '0',
})

const createDefaultForm = (defaultDepartmentId = ''): QuoteFormState => ({
  clientId: '',
  departmentId: defaultDepartmentId,
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  quoteDate: new Date().toISOString().split('T')[0],
  validUntil: '',
  status: 'draft',
  notes: '',
  termsAndConditions: '',
  lineItems: [createEmptyLineItem()],
})

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toCurrency = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const toIsoDate = (date: string) => new Date(`${date}T00:00:00`).toISOString()

const formatDate = (value?: string, language = 'en-US') => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(language)
}

const isRtlLanguage = (language: string) => {
  const normalizedLanguage = language.toLowerCase()
  return normalizedLanguage.startsWith('he') || normalizedLanguage.startsWith('ar')
}

const splitQuoteNotes = (value?: string | null) => {
  const raw = value ?? ''
  const separatorIndex = raw.indexOf(QUOTE_NOTES_SEPARATOR)

  if (separatorIndex === -1) {
    return { notes: raw, termsAndConditions: '' }
  }

  return {
    notes: raw.slice(0, separatorIndex).trim(),
    termsAndConditions: raw.slice(separatorIndex + QUOTE_NOTES_SEPARATOR.length).trim(),
  }
}

export default function AdminQuotes() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { hasPermission } = useAuth()
  const { departmentFeatures } = useDepartmentFeatures()
  const { tenant } = useTenant()

  const canManageQuotes = hasPermission('manage_quotes')

  const [loading, setLoading] = useState(true)
  const [listRefreshing, setListRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [quotes, setQuotes] = useState<QuoteListItem[]>([])
  const [pageNumber, setPageNumber] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isBootstrapLoaded, setIsBootstrapLoaded] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [availableDepartments, setAvailableDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')
  const [clientQuery, setClientQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | QuoteStatus>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [dateRange, setDateRange] = useState<QuoteDateRange>('last30days')
  const [sortBy] = useState<QuoteListSortBy>('newest')
  const [sortDirection] = useState<'asc' | 'desc'>('desc')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<QuoteFormState>(() => createDefaultForm())
  const requestCounterRef = useRef(0)

  const isQuotesEnabled = departmentFeatures?.quotesEnabled === true
  const isRtl = isRtlLanguage(i18n.language)

  const getActionLoadingKey = (quoteId: string, action: QuoteActionType) => `${quoteId}:${action}`
  const isActionLoading = (quoteId: string, action: QuoteActionType) => Boolean(actionLoading[getActionLoadingKey(quoteId, action)])
  const setActionLoadingState = (quoteId: string, action: QuoteActionType, nextValue: boolean) => {
    const key = getActionLoadingKey(quoteId, action)

    setActionLoading((current) => {
      if (nextValue) {
        return { ...current, [key]: true }
      }

      if (!current[key]) {
        return current
      }

      const { [key]: _, ...rest } = current
      return rest
    })
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput)
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const loadBootstrapData = async () => {
    try {
      const [departmentsData, clientsData] = await Promise.all([
        quotesService.getQuoteDepartments(),
        clientsService.getClients(),
      ])

      if (departmentsData.length === 0) {
        navigate('/unauthorized')
        return
      }

      setClients(clientsData)
      setAvailableDepartments(departmentsData)
      setIsBootstrapLoaded(true)
    } catch (error) {
      if ((error as { status?: number } | null)?.status === 403) {
        navigate('/unauthorized')
        return
      }
      console.error('Failed to load quotes', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuotes = async (options?: { pageNumber?: number; append?: boolean; showSkeleton?: boolean }) => {
    const targetPageNumber = options?.pageNumber ?? 1
    const append = options?.append ?? false
    const showSkeleton = options?.showSkeleton ?? false
    const requestId = ++requestCounterRef.current

    if (append) {
      setLoadingMore(true)
    } else if (showSkeleton) {
      setListRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await quotesService.getQuotesList({
        pageNumber: targetPageNumber,
        pageSize: QUOTES_PAGE_SIZE,
        dateRange,
        search,
        status: statusFilter,
        clientId: clientFilter,
        sortBy,
        sortDirection,
      })

      if (requestCounterRef.current !== requestId) {
        return
      }

      setQuotes((current) => (append ? [...current, ...response.items] : response.items))
      setPageNumber(response.pageNumber)
      setHasNextPage(response.hasNextPage)
      setTotalCount(response.totalCount)
    } catch (error) {
      if ((error as { status?: number } | null)?.status === 403) {
        navigate('/unauthorized')
        return
      }
      console.error('Failed to load quotes', error)
    } finally {
      if (requestCounterRef.current === requestId) {
        setLoading(false)
        setListRefreshing(false)
        setLoadingMore(false)
      }
    }
  }

  useEffect(() => {
    if (!canManageQuotes || departmentFeatures === null) {
      return
    }

    if (!isQuotesEnabled) {
      navigate('/unauthorized')
      setLoading(false)
      return
    }

    void loadBootstrapData()
  }, [canManageQuotes, departmentFeatures, isQuotesEnabled, navigate])

  useEffect(() => {
    if (!isBootstrapLoaded) {
      return
    }

    void fetchQuotes({ pageNumber: 1, append: false, showSkeleton: true })
  }, [isBootstrapLoaded, dateRange, search, statusFilter, clientFilter])

  const refreshQuotes = async () => {
    await fetchQuotes({ pageNumber: 1, append: false, showSkeleton: true })
  }

  const handleLoadMore = async () => {
    if (!hasNextPage || loadingMore) {
      return
    }

    await fetchQuotes({ pageNumber: pageNumber + 1, append: true })
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setCustomerMode('existing')
    setClientQuery('')
    setForm(createDefaultForm(availableDepartments[0]?.id ?? ''))
  }

  const openCreateModal = () => {
    setEditingId(null)
    setCustomerMode('existing')
    setClientQuery('')
    setForm(createDefaultForm(availableDepartments[0]?.id ?? ''))
    setShowModal(true)
  }

  const updateField = <K extends keyof QuoteFormState>(field: K, value: QuoteFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateLineItem = (lineItemId: string, field: keyof Omit<QuoteFormLineItem, 'id'>, value: string) => {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((lineItem) =>
        lineItem.id === lineItemId ? { ...lineItem, [field]: value } : lineItem
      ),
    }))
  }

  const addLineItem = () => {
    setForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, createEmptyLineItem()],
    }))
  }

  const removeLineItem = (lineItemId: string) => {
    setForm((current) => {
      const nextLineItems = current.lineItems.filter((lineItem) => lineItem.id !== lineItemId)
      return {
        ...current,
        lineItems: nextLineItems.length > 0 ? nextLineItems : [createEmptyLineItem()],
      }
    })
  }

  const lineItemPayload = form.lineItems.map((lineItem) => ({
    description: lineItem.description.trim(),
    quantity: toNumber(lineItem.quantity),
    unitPrice: toCurrency(toNumber(lineItem.unitPrice)),
  }))

  const vatRate = Number(tenant?.defaultVatRate)
  const normalizedVatRate = Number.isFinite(vatRate) && vatRate >= 0 && vatRate <= 100 ? vatRate : DEFAULT_VAT_RATE

  const totals = calculateInvoiceTotals(
    lineItemPayload.map((lineItem) => ({ quantity: lineItem.quantity, price: lineItem.unitPrice })),
    normalizedVatRate
  )

  const validationMessages = [
    customerMode === 'existing' && !form.clientId ? t('admin.quotes.form.validationClient') : null,
    customerMode === 'new' && !form.customerName.trim() ? t('admin.quotes.form.validationCustomerName') : null,
    !form.departmentId ? t('admin.quotes.form.validationDepartment') : null,
    form.lineItems.length === 0 ? t('admin.quotes.form.validationLineItems') : null,
    form.lineItems.some((lineItem) => !lineItem.description.trim()) ? t('admin.quotes.form.validationDescription') : null,
    form.lineItems.some((lineItem) => toNumber(lineItem.quantity) <= 0) ? t('admin.quotes.form.validationQuantity') : null,
    form.lineItems.some((lineItem) => toNumber(lineItem.unitPrice, -1) < 0) ? t('admin.quotes.form.validationPrice') : null,
  ].filter((m): m is string => Boolean(m))

  const isFormValid = validationMessages.length === 0

  const buildRequest = (): CreateQuoteRequest => ({
    isExistingClient: customerMode === 'existing',
    clientId: customerMode === 'existing' ? form.clientId : undefined,
    departmentId: form.departmentId,
    customerName: customerMode === 'new' ? form.customerName.trim() || undefined : undefined,
    customerPhone: customerMode === 'new' ? form.customerPhone.trim() || undefined : undefined,
    customerEmail: customerMode === 'new' ? form.customerEmail.trim() || undefined : undefined,
    quoteDate: toIsoDate(form.quoteDate),
    validUntil: form.validUntil ? toIsoDate(form.validUntil) : undefined,
    status: form.status,
    notes: [form.notes.trim(), form.termsAndConditions.trim()].filter(Boolean).join(QUOTE_NOTES_SEPARATOR) || undefined,
    vatRate: normalizedVatRate,
    lineItems: lineItemPayload,
  })

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isFormValid) return

    setSaving(true)

    try {
      const payload = buildRequest()

      if (editingId) {
        await quotesService.updateQuote(editingId, payload)
      } else {
        await quotesService.createQuote(payload)
      }

      await refreshQuotes()
      closeModal()
    } catch (error) {
      console.error('Failed to save quote', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (quoteListItem: QuoteListItem) => {
    const quote = await quotesService.getQuote(quoteListItem.id)
    if (!quote) {
      return
    }

    const nextLineItems = quote.lineItems.length > 0
      ? quote.lineItems.map((lineItem) => ({
          id: lineItem.id || createLineItemId(),
          description: lineItem.description,
          quantity: String(lineItem.quantity),
          unitPrice: String(lineItem.unitPrice),
        }))
      : [createEmptyLineItem()]

    setForm({
      clientId: quote.clientId ?? '',
      departmentId: quote.departmentId ?? '',
      customerName: quote.clientName,
      customerPhone: quote.customerPhone ?? '',
      customerEmail: quote.customerEmail ?? '',
      quoteDate: quote.quoteDate ? quote.quoteDate.split('T')[0] : new Date().toISOString().split('T')[0],
      validUntil: quote.validUntil ? quote.validUntil.split('T')[0] : '',
      status: quote.status,
      ...splitQuoteNotes(quote.notes),
      lineItems: nextLineItems,
    })

    setCustomerMode(quote.clientId ? 'existing' : 'new')
    setClientQuery(quote.clientId ? quote.clientName : '')
    setEditingId(quote.id)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.quotes.confirmDelete'))) return
    if (isActionLoading(id, 'delete')) return

    setActionLoadingState(id, 'delete', true)

    try {
      await quotesService.deleteQuote(id)
      await refreshQuotes()
    } catch (error) {
      console.error('Failed to delete quote', error)
    } finally {
      setActionLoadingState(id, 'delete', false)
    }
  }

  const handleDuplicate = async (id: string) => {
    if (isActionLoading(id, 'duplicate')) return

    setActionLoadingState(id, 'duplicate', true)

    try {
      await quotesService.duplicateQuote(id)
      await refreshQuotes()
    } catch (error) {
      console.error('Failed to duplicate quote', error)
    } finally {
      setActionLoadingState(id, 'duplicate', false)
    }
  }

  const handleConvert = async (id: string) => {
    if (isActionLoading(id, 'convert')) return

    setActionLoadingState(id, 'convert', true)

    try {
      const result = await quotesService.convertQuoteToInvoice(id)
      alert(t('admin.quotes.convertSuccess', { invoiceNumber: result.invoiceNumber }))
      await refreshQuotes()
    } catch (error) {
      console.error('Failed to convert quote', error)
    } finally {
      setActionLoadingState(id, 'convert', false)
    }
  }

  const handleDownloadPdf = async (quote: Quote, shouldPrint: boolean) => {
    const action: QuoteActionType = shouldPrint ? 'print' : 'download'
    if (isActionLoading(quote.id, action)) return

    setActionLoadingState(quote.id, action, true)

    try {
      const blob = await quotesService.downloadQuotePdf(quote.id)
      const url = window.URL.createObjectURL(blob)

      if (shouldPrint) {
        const printWindow = window.open(url, '_blank')
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print()
          }
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
      console.error('Failed to load quote PDF', error)
    } finally {
      setActionLoadingState(quote.id, action, false)
    }
  }

  const canCreateQuote = isQuotesEnabled && availableDepartments.length > 0
  const departmentNameById = new Map(availableDepartments.map((department) => [department.id, department.name]))

  if (departmentFeatures === null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
          <span className="text-sm font-medium">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  if (!isQuotesEnabled) {
    return (
      <div className="p-6 text-center text-slate-500" dir={isRtl ? 'rtl' : 'ltr'}>
        {t('unauthorized.subtitle')}
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between min-w-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('admin.quotes.title')}</h1>
          <p className="text-slate-600 mt-1">{t('admin.quotes.description')}</p>
        </div>

        {canCreateQuote ? (
          <button
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary btn-md w-full sm:w-auto gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('admin.quotes.create')}
          </button>
        ) : null}
      </div>

      <div className="card p-4 space-y-3 min-w-0">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2 min-w-0">
            <label className="block text-sm font-semibold text-slate-700">{t('common.search')}</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('admin.quotes.search')}
                className="input pl-9"
              />
            </div>
          </div>

          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.client')}</label>
            <select className="input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="all">{t('admin.quotes.filter.allClients')}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.fullName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.status')}</label>
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">{t('admin.quotes.filter.allStatuses')}</option>
              <option value="draft">{t('admin.quotes.status.draft')}</option>
              <option value="sent">{t('admin.quotes.status.sent')}</option>
              <option value="approved">{t('admin.quotes.status.approved')}</option>
              <option value="rejected">{t('admin.quotes.status.rejected')}</option>
              <option value="expired">{t('admin.quotes.status.expired')}</option>
              <option value="converted">{t('admin.quotes.status.converted')}</option>
            </select>
          </div>

          <div className="space-y-2 min-w-0">
            <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.filter.quickRange')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDateRange('last30days')}
                className={`btn btn-sm ${dateRange === 'last30days' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t('admin.quotes.filter.last30Days')}
              </button>
              <button
                type="button"
                onClick={() => setDateRange('last3months')}
                className={`btn btn-sm ${dateRange === 'last3months' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t('admin.quotes.filter.last3Months')}
              </button>
              <button
                type="button"
                onClick={() => setDateRange('lastyear')}
                className={`btn btn-sm ${dateRange === 'lastyear' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t('admin.quotes.filter.lastYear')}
              </button>
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className={`btn btn-sm ${dateRange === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t('admin.quotes.filter.all')}
              </button>
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-500">{t('admin.quotes.totalCount', { count: totalCount })}</div>
      </div>

      <div className="card overflow-hidden min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
              <span className="text-sm font-medium">{t('common.loading')}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:hidden">
              {listRefreshing ? Array.from({ length: 3 }).map((_, index) => (
                <div key={`mobile-skeleton-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="mt-2 h-5 w-2/3 rounded bg-slate-200" />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="h-10 rounded bg-slate-100" />
                    <div className="h-10 rounded bg-slate-100" />
                    <div className="h-10 rounded bg-slate-100" />
                    <div className="h-10 rounded bg-slate-100" />
                  </div>
                </div>
              )) : quotes.map((quote) => (
                <div key={quote.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm min-w-0">
                  {(() => {
                    const isDownloading = isActionLoading(quote.id, 'download')
                    const isPrinting = isActionLoading(quote.id, 'print')
                    const isDuplicating = isActionLoading(quote.id, 'duplicate')
                    const isConverting = isActionLoading(quote.id, 'convert')
                    const isDeleting = isActionLoading(quote.id, 'delete')

                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-slate-500">{quote.quoteNumber}</div>
                      <div className="mt-1 truncate text-base font-semibold text-slate-900">{quote.clientName}</div>
                    </div>
                    <span className={`inline-flex shrink-0 px-2 py-1 rounded-full text-xs ${STATUS_META[quote.status].className}`}>
                      {t(`admin.quotes.status.${quote.status}`)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <div className="text-xs text-slate-400">{t('admin.quotes.table.date')}</div>
                      <div>{formatDate(quote.quoteDate, i18n.language)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{t('admin.quotes.table.validUntil')}</div>
                      <div>{formatDate(quote.validUntil, i18n.language)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{t('admin.quotes.table.amount')}</div>
                      <div>{quote.totalAmount.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">{t('admin.quotes.form.department')}</div>
                      <div className="truncate">{quote.departmentId ? departmentNameById.get(quote.departmentId) ?? '-' : '-'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate(`/admin/quotes/${quote.id}`)} className="btn btn-secondary btn-sm flex-1 min-w-[120px] gap-2">
                      <Eye className="w-4 h-4" />
                      {t('admin.quotes.actions.view')}
                    </button>
                    <button type="button" onClick={() => void handleEdit(quote)} className="btn btn-secondary btn-sm flex-1 min-w-[120px] gap-2">
                      <Pencil className="w-4 h-4" />
                      {t('common.edit')}
                    </button>
                    <button type="button" disabled={isDownloading} onClick={() => handleDownloadPdf(quote, false)} className="btn btn-secondary btn-sm flex-1 min-w-[120px] gap-2">
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isDownloading ? t('admin.quotes.actions.downloading') : t('admin.quotes.actions.pdf')}
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={isDuplicating} onClick={() => handleDuplicate(quote.id)} className="btn btn-secondary btn-sm flex-1 min-w-[120px] gap-2">
                      {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat2 className="w-4 h-4" />}
                      {isDuplicating ? t('admin.quotes.actions.duplicating') : t('admin.quotes.actions.duplicate')}
                    </button>
                    <button type="button" disabled={isPrinting} onClick={() => handleDownloadPdf(quote, true)} className="btn btn-secondary btn-sm flex-1 min-w-[120px] gap-2">
                      {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      {isPrinting ? t('admin.quotes.actions.printing') : t('common.print')}
                    </button>
                    <button type="button" disabled={isConverting} onClick={() => handleConvert(quote.id)} className="btn btn-secondary btn-sm flex-1 min-w-[120px] gap-2">
                      {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
                      {isConverting ? t('admin.quotes.actions.converting') : t('admin.quotes.actions.convert')}
                    </button>
                    <button type="button" disabled={isDeleting} onClick={() => handleDelete(quote.id)} className="btn btn-danger btn-sm flex-1 min-w-[120px] gap-2">
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {isDeleting ? t('admin.quotes.actions.deleting') : t('common.delete')}
                    </button>
                  </div>
                      </>
                    )
                  })()}
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-right">{t('admin.quotes.table.number')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.quotes.table.client')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.quotes.table.date')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.quotes.table.validUntil')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.quotes.table.amount')}</th>
                    <th className="px-4 py-3 text-right">{t('common.status')}</th>
                    <th className="px-4 py-3 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {listRefreshing ? Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`table-skeleton-${index}`} className="border-t border-slate-100 animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-40 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                    </tr>
                  )) : quotes.map((quote) => (
                    <tr key={quote.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono">{quote.quoteNumber}</td>
                      <td className="px-4 py-3">{quote.clientName}</td>
                      <td className="px-4 py-3">{formatDate(quote.quoteDate, i18n.language)}</td>
                      <td className="px-4 py-3">{formatDate(quote.validUntil, i18n.language)}</td>
                      <td className="px-4 py-3">{quote.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${STATUS_META[quote.status].className}`}>
                          {t(`admin.quotes.status.${quote.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const isDownloading = isActionLoading(quote.id, 'download')
                          const isPrinting = isActionLoading(quote.id, 'print')
                          const isDuplicating = isActionLoading(quote.id, 'duplicate')
                          const isConverting = isActionLoading(quote.id, 'convert')
                          const isDeleting = isActionLoading(quote.id, 'delete')

                          return (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button type="button" title={t('admin.quotes.actions.view')} onClick={() => navigate(`/admin/quotes/${quote.id}`)} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"><Eye className="w-4 h-4" /></button>
                          <button type="button" title={t('common.edit')} onClick={() => void handleEdit(quote)} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>
                          <button type="button" disabled={isDuplicating} title={isDuplicating ? t('admin.quotes.actions.duplicating') : t('admin.quotes.actions.duplicate')} onClick={() => handleDuplicate(quote.id)} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat2 className="w-4 h-4" />}</button>
                          <button type="button" disabled={isPrinting} title={isPrinting ? t('admin.quotes.actions.printing') : t('common.print')} onClick={() => handleDownloadPdf(quote, true)} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}</button>
                          <button type="button" disabled={isDownloading} title={isDownloading ? t('admin.quotes.actions.downloading') : t('admin.quotes.actions.download')} onClick={() => handleDownloadPdf(quote, false)} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}</button>
                          <button type="button" disabled={isConverting} title={isConverting ? t('admin.quotes.actions.converting') : t('admin.quotes.actions.convert')} onClick={() => handleConvert(quote.id)} className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">{isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}</button>
                          <button type="button" disabled={isDeleting} title={isDeleting ? t('admin.quotes.actions.deleting') : t('common.delete')} onClick={() => handleDelete(quote.id)} className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>
                        </div>
                          )
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {quotes.length === 0 && !listRefreshing && (
              <div className="py-16 text-center">
                <p className="text-slate-500">{t('admin.quotes.empty')}</p>
              </div>
            )}

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <button type="button" onClick={() => void handleLoadMore()} disabled={loadingMore} className="btn btn-secondary btn-md gap-2">
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loadingMore ? t('admin.quotes.loadingMore') : t('admin.quotes.loadMore')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-2 sm:p-4 overflow-y-auto">
          <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-6xl items-center">
            <form onSubmit={handleSave} className="flex max-h-[calc(100vh-1rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900">{editingId ? t('admin.quotes.editTitle') : t('admin.quotes.createNew')}</h2>
                </div>
                <button type="button" onClick={closeModal} className="btn btn-secondary btn-sm">{t('common.close')}</button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-6">
                {validationMessages.length > 0 ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {validationMessages.map((message) => (
                      <div key={message}>{message}</div>
                    ))}
                  </div>
                ) : null}

                <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{t('admin.quotes.form.customerInformation')}</h3>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerMode('existing')
                          if (form.customerName) {
                            setForm((current) => ({ ...current, customerName: '', customerPhone: '', customerEmail: '' }))
                          }
                        }}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${customerMode === 'existing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                      >
                        <User className="h-4 w-4" />
                        {t('admin.quotes.form.existingClient')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerMode('new')
                          setForm((current) => ({ ...current, clientId: '' }))
                          setClientQuery('')
                        }}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${customerMode === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                      >
                        <UserPlus className="h-4 w-4" />
                        {t('admin.quotes.form.newClient')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {customerMode === 'existing' ? (
                      <div className="space-y-2 min-w-0 md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.client')}</label>
                        <Autocomplete
                          items={clients}
                          query={clientQuery}
                          onQueryChange={(value) => {
                            setClientQuery(value)
                            setForm((current) => ({ ...current, clientId: '' }))
                          }}
                          onSelect={(client) => {
                            setForm((current) => ({ ...current, clientId: client.id }))
                            setClientQuery(client.fullName || client.email || '')
                          }}
                          getItemId={(client) => client.id}
                          getItemLabel={(client) => client.fullName}
                          getItemSearchText={(client) => `${client.fullName} ${client.phone ?? ''} ${client.email ?? ''}`}
                          getItemSecondaryText={(client) => client.phone || client.email || undefined}
                          placeholder={t('admin.quotes.form.selectClient')}
                          inputClassName="input"
                          emptyQueryShowsAll
                          maxResults={8}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.fullName')}</label>
                          <input
                            className="input"
                            value={form.customerName}
                            onChange={(e) => updateField('customerName', e.target.value)}
                            placeholder={t('admin.quotes.form.fullNamePlaceholder')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.phone')}</label>
                          <input
                            className="input"
                            value={form.customerPhone}
                            onChange={(e) => updateField('customerPhone', e.target.value)}
                            placeholder={t('admin.quotes.form.phone')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-slate-700">{t('common.email')}</label>
                          <input
                            className="input"
                            type="email"
                            value={form.customerEmail}
                            onChange={(e) => updateField('customerEmail', e.target.value)}
                            placeholder={t('common.email')}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.department')}</label>
                      <select className="input" value={form.departmentId} onChange={(e) => updateField('departmentId', e.target.value)}>
                        <option value="">{t('admin.quotes.form.selectDepartment')}</option>
                        {availableDepartments.map((department) => (
                          <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.quoteDate')}</label>
                      <input type="date" className="input" value={form.quoteDate} onChange={(e) => updateField('quoteDate', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.validUntil')}</label>
                      <input type="date" className="input" value={form.validUntil} onChange={(e) => updateField('validUntil', e.target.value)} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700">{t('admin.quotes.form.status')}</label>
                      <select className="input" value={form.status} onChange={(e) => updateField('status', e.target.value as QuoteStatus)}>
                        <option value="draft">{t('admin.quotes.status.draft')}</option>
                        <option value="sent">{t('admin.quotes.status.sent')}</option>
                        <option value="approved">{t('admin.quotes.status.approved')}</option>
                        <option value="rejected">{t('admin.quotes.status.rejected')}</option>
                        <option value="expired">{t('admin.quotes.status.expired')}</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{t('admin.quotes.form.lineItems')}</h3>
                    </div>
                    <button type="button" onClick={addLineItem} className="btn btn-secondary btn-sm">{t('admin.quotes.form.addItem')}</button>
                  </div>

                  <div className="hidden md:grid md:grid-cols-12 gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <div className="md:col-span-4">{t('admin.quotes.form.description')}</div>
                    <div className="md:col-span-1">{t('admin.quotes.form.quantity')}</div>
                    <div className="md:col-span-2">{t('admin.quotes.form.unitPrice')}</div>
                    <div className="md:col-span-1">{t('admin.quotes.form.discount')}</div>
                    <div className="md:col-span-1">{t('admin.quotes.form.vat')}</div>
                    <div className="md:col-span-2">{t('admin.quotes.form.total')}</div>
                  </div>

                  <div className="space-y-3">
                    {form.lineItems.map((lineItem) => {
                      const quantity = toNumber(lineItem.quantity)
                      const unitPrice = toNumber(lineItem.unitPrice)
                      const lineTotal = toCurrency(quantity * unitPrice)

                      return (
                        <div key={lineItem.id} className="rounded-xl border border-slate-200 p-3 space-y-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                            <div className="space-y-2 md:col-span-4">
                              <label className="block text-sm font-semibold text-slate-700 md:hidden">{t('admin.quotes.form.description')}</label>
                              <input
                                className="input"
                                value={lineItem.description}
                                onChange={(e) => updateLineItem(lineItem.id, 'description', e.target.value)}
                                placeholder={t('admin.quotes.form.description')}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                              <label className="block text-sm font-semibold text-slate-700 md:hidden">{t('admin.quotes.form.quantity')}</label>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={lineItem.quantity}
                                onChange={(e) => updateLineItem(lineItem.id, 'quantity', e.target.value)}
                                placeholder={t('admin.quotes.form.quantity')}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 md:hidden">{t('admin.quotes.form.unitPrice')}</label>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={lineItem.unitPrice}
                                onChange={(e) => updateLineItem(lineItem.id, 'unitPrice', e.target.value)}
                                placeholder={t('admin.quotes.form.unitPrice')}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-1">
                              <label className="block text-sm font-semibold text-slate-700 md:hidden">{t('admin.quotes.form.discount')}</label>
                              <div className="input bg-slate-50 text-slate-600">0%</div>
                            </div>
                            <div className="space-y-2 md:col-span-1">
                              <label className="block text-sm font-semibold text-slate-700 md:hidden">{t('admin.quotes.form.vat')}</label>
                              <div className="input bg-slate-50 text-slate-600">{normalizedVatRate.toFixed(0)}%</div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 md:hidden">{t('admin.quotes.form.total')}</label>
                              <div className="input bg-slate-50 font-semibold text-slate-900">{lineTotal.toFixed(2)}</div>
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeLineItem(lineItem.id)}
                                className="btn btn-danger btn-sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm text-slate-600 md:hidden">
                            <div>
                              <div className="text-xs text-slate-400">{t('admin.quotes.form.discount')}</div>
                              <div>0%</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-400">{t('admin.quotes.form.vat')}</div>
                              <div>{normalizedVatRate.toFixed(0)}%</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-400">{t('admin.quotes.form.total')}</div>
                              <div className="font-semibold text-slate-900">{lineTotal.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('admin.quotes.form.financialSummary')}</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">{t('admin.quotes.form.subtotal')}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{totals.subtotal.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs text-slate-500">{t('admin.quotes.form.vat')}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{totals.vatAmount.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl bg-primary-50 p-4">
                      <div className="text-xs text-primary-700">{t('admin.quotes.form.grandTotal')}</div>
                      <div className="mt-1 text-lg font-semibold text-primary-900">{totals.totalAmount.toFixed(2)}</div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-primary-700">{t('admin.quotes.form.notes')}</h3>
                      <textarea
                        className="input"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                        placeholder={t('admin.quotes.form.notesPlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-primary-700">{t('admin.quotes.form.termsAndConditions')}</h3>
                      <textarea
                        className="input"
                        rows={3}
                        value={form.termsAndConditions}
                        onChange={(e) => updateField('termsAndConditions', e.target.value)}
                        placeholder={t('admin.quotes.form.termsPlaceholder')}
                      />
                    </div>
                  </div>
                </section>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-1 md:hidden">
                  <div>{t('admin.quotes.form.subtotal')}: {totals.subtotal.toFixed(2)}</div>
                  <div>{t('admin.quotes.form.vat')} ({totals.vatRate.toFixed(2)}%): {totals.vatAmount.toFixed(2)}</div>
                  <div className="font-semibold">{t('admin.quotes.form.grandTotal')}: {totals.totalAmount.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                <button type="button" onClick={closeModal} className="btn btn-secondary btn-md w-full sm:w-auto">{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-md w-full gap-2 sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving
                    ? editingId
                      ? t('admin.quotes.form.updating')
                      : t('admin.quotes.form.creating')
                    : editingId
                      ? t('admin.quotes.form.saveChanges')
                      : t('admin.quotes.form.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
