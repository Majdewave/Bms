import { ApiError, del, get, getBlob, post, put } from './apiClient'
import { calculateInvoiceTotals, DEFAULT_VAT_RATE } from './invoices'

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted'
export type QuoteDateRange = 'last30days' | 'last3months' | 'lastyear' | 'all'
export type QuoteSortBy = 'newest' | 'date' | 'quoteNumber' | 'client' | 'status' | 'amount'
export type QuoteSortDirection = 'asc' | 'desc'

export interface QuoteLineItem {
  id: string
  quoteId: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  tenantId: string
  quoteNumber: string
  departmentId?: string
  clientId?: string
  clientName: string
  customerPhone?: string
  customerEmail?: string
  quoteDate: string
  validUntil?: string
  subtotal: number
  vatRate: number
  vatAmount: number
  totalAmount: number
  notes?: string
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  logoUrl?: string
  logoBase64?: string
  language?: string
  status: QuoteStatus
  createdAt: string
  updatedAt: string
  lineItems: QuoteLineItem[]
}

export interface QuoteListItem {
  id: string
  quoteNumber: string
  departmentId?: string
  clientId?: string
  clientName: string
  quoteDate: string
  validUntil?: string
  totalAmount: number
  status: QuoteStatus
  createdAt: string
}

export interface QuoteListResponse {
  items: QuoteListItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
  hasNextPage: boolean
}

export interface GetQuotesListParams {
  pageNumber: number
  pageSize: number
  dateRange: QuoteDateRange
  search?: string
  status?: QuoteStatus | 'all'
  clientId?: string | 'all'
  sortBy?: QuoteSortBy
  sortDirection?: QuoteSortDirection
}

export interface CreateQuoteLineItemRequest {
  description: string
  quantity: number
  unitPrice: number
}

export interface CreateQuoteRequest {
  isExistingClient?: boolean
  clientId?: string
  departmentId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  quoteDate?: string
  validUntil?: string
  notes?: string
  vatRate?: number
  status?: QuoteStatus
  lineItems: CreateQuoteLineItemRequest[]
}

const roundCurrency = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeStatus = (value: unknown): QuoteStatus => {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'sent') return 'sent'
  if (normalized === 'approved') return 'approved'
  if (normalized === 'rejected') return 'rejected'
  if (normalized === 'expired') return 'expired'
  if (normalized === 'converted') return 'converted'
  return 'draft'
}

const normalizeLineItem = (lineItem: any, index: number): QuoteLineItem => {
  const quantity = toNumber(lineItem?.quantity, 0)
  const unitPrice = roundCurrency(toNumber(lineItem?.unitPrice, 0))
  const total = roundCurrency(toNumber(lineItem?.total, quantity * unitPrice))

  return {
    id: String(lineItem?.id ?? `quote-line-item-${index}`),
    quoteId: String(lineItem?.quoteId ?? ''),
    description: String(lineItem?.description ?? ''),
    quantity,
    unitPrice,
    total,
  }
}

const normalizeQuote = (quote: any): Quote => {
  const lineItems = Array.isArray(quote?.lineItems) ? quote.lineItems.map(normalizeLineItem) : []
  const totals = calculateInvoiceTotals(
    lineItems.map((item: QuoteLineItem) => ({ quantity: item.quantity, price: item.unitPrice })),
    toNumber(quote?.vatRate, DEFAULT_VAT_RATE)
  )

  return {
    id: String(quote?.id ?? ''),
    tenantId: String(quote?.tenantId ?? ''),
    quoteNumber: String(quote?.quoteNumber ?? quote?.number ?? ''),
    departmentId: quote?.departmentId ? String(quote.departmentId) : undefined,
    clientId: quote?.clientId ? String(quote.clientId) : undefined,
    clientName: String(quote?.clientName ?? ''),
    customerPhone: typeof quote?.customerPhone === 'string' ? quote.customerPhone : undefined,
    customerEmail: typeof quote?.customerEmail === 'string' ? quote.customerEmail : undefined,
    quoteDate: String(quote?.quoteDate ?? quote?.createdAt ?? new Date().toISOString()),
    validUntil: quote?.validUntil ? String(quote.validUntil) : undefined,
    subtotal: roundCurrency(toNumber(quote?.subtotal, totals.subtotal)),
    vatRate: roundCurrency(toNumber(quote?.vatRate, totals.vatRate)),
    vatAmount: roundCurrency(toNumber(quote?.vatAmount, totals.vatAmount)),
    totalAmount: roundCurrency(toNumber(quote?.totalAmount, totals.totalAmount)),
    notes: typeof quote?.notes === 'string' ? quote.notes : undefined,
    businessName: typeof quote?.businessName === 'string' ? quote.businessName : undefined,
    businessAddress: typeof quote?.businessAddress === 'string' ? quote.businessAddress : undefined,
    businessPhone: typeof quote?.businessPhone === 'string' ? quote.businessPhone : undefined,
    businessEmail: typeof quote?.businessEmail === 'string' ? quote.businessEmail : undefined,
    logoUrl: typeof quote?.logoUrl === 'string' ? quote.logoUrl : undefined,
    logoBase64: typeof quote?.logoBase64 === 'string' ? quote.logoBase64 : undefined,
    language: typeof quote?.language === 'string' ? quote.language : undefined,
    status: normalizeStatus(quote?.status),
    createdAt: String(quote?.createdAt ?? new Date().toISOString()),
    updatedAt: String(quote?.updatedAt ?? quote?.createdAt ?? new Date().toISOString()),
    lineItems,
  }
}

const normalizeQuoteListItem = (item: any): QuoteListItem => {
  return {
    id: String(item?.id ?? ''),
    quoteNumber: String(item?.quoteNumber ?? item?.number ?? ''),
    departmentId: item?.departmentId ? String(item.departmentId) : undefined,
    clientId: item?.clientId ? String(item.clientId) : undefined,
    clientName: String(item?.clientName ?? ''),
    quoteDate: String(item?.quoteDate ?? item?.createdAt ?? new Date().toISOString()),
    validUntil: item?.validUntil ? String(item.validUntil) : undefined,
    totalAmount: roundCurrency(toNumber(item?.totalAmount, 0)),
    status: normalizeStatus(item?.status),
    createdAt: String(item?.createdAt ?? new Date().toISOString()),
  }
}

const isForbiddenResponse = (value: unknown): value is { forbidden: true } => {
  return Boolean(value && typeof value === 'object' && (value as { forbidden?: boolean }).forbidden)
}

export const getQuotes = async (): Promise<Quote[]> => {
  const quotes = await get<any[] | { forbidden?: boolean }>('/api/quotes')

  if (isForbiddenResponse(quotes)) {
    throw new ApiError('Forbidden', 403, quotes)
  }

  return Array.isArray(quotes) ? quotes.map(normalizeQuote) : []
}

export const getQuotesList = async (params: GetQuotesListParams): Promise<QuoteListResponse> => {
  const searchParams = new URLSearchParams()
  searchParams.set('pageNumber', String(params.pageNumber))
  searchParams.set('pageSize', String(params.pageSize))
  searchParams.set('dateRange', params.dateRange)

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim())
  }

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status)
  }

  if (params.clientId && params.clientId !== 'all') {
    searchParams.set('clientId', params.clientId)
  }

  if (params.sortBy) {
    const normalizedSortBy = params.sortBy === 'quoteNumber' ? 'quoteNumber' : params.sortBy
    searchParams.set('sortBy', normalizedSortBy)
  }

  if (params.sortDirection) {
    searchParams.set('sortDirection', params.sortDirection)
  }

  const response = await get<any | { forbidden?: boolean }>(`/api/quotes?${searchParams.toString()}`)

  if (isForbiddenResponse(response)) {
    throw new ApiError('Forbidden', 403, response)
  }

  return {
    items: Array.isArray(response?.items) ? response.items.map(normalizeQuoteListItem) : [],
    totalCount: toNumber(response?.totalCount, 0),
    pageNumber: Math.max(1, toNumber(response?.pageNumber, params.pageNumber)),
    pageSize: Math.max(1, toNumber(response?.pageSize, params.pageSize)),
    hasNextPage: Boolean(response?.hasNextPage),
  }
}

export const getQuoteDepartments = async (): Promise<Array<{ id: string; name: string }>> => {
  const departments = await get<Array<{ id: string; name: string }> | { forbidden?: boolean }>('/api/quotes/departments')
  if (isForbiddenResponse(departments)) {
    return []
  }
  return Array.isArray(departments) ? departments : []
}

export const getQuote = async (id: string): Promise<Quote | null> => {
  const quote = await get<any | { forbidden?: boolean }>(`/api/quotes/${id}`)

  if (isForbiddenResponse(quote)) {
    throw new ApiError('Forbidden', 403, quote)
  }

  return quote ? normalizeQuote(quote) : null
}

export const createQuote = async (data: CreateQuoteRequest): Promise<Quote> => {
  const quote = await post<any | { forbidden?: boolean }>('/api/quotes', data)
  if (isForbiddenResponse(quote)) {
    throw new ApiError('Forbidden', 403, quote)
  }
  return normalizeQuote(quote)
}

export const updateQuote = async (id: string, data: CreateQuoteRequest): Promise<Quote> => {
  const quote = await put<any | { forbidden?: boolean }>(`/api/quotes/${id}`, data)
  if (isForbiddenResponse(quote)) {
    throw new ApiError('Forbidden', 403, quote)
  }
  return normalizeQuote(quote)
}

export const deleteQuote = async (id: string): Promise<void> => {
  await del<void>(`/api/quotes/${id}`)
}

export const duplicateQuote = async (id: string): Promise<Quote> => {
  const quote = await post<any | { forbidden?: boolean }>(`/api/quotes/${id}/duplicate`, {})
  if (isForbiddenResponse(quote)) {
    throw new ApiError('Forbidden', 403, quote)
  }
  return normalizeQuote(quote)
}

export const convertQuoteToInvoice = async (id: string): Promise<{ invoiceId: string; invoiceNumber: string }> => {
  const response = await post<any | { forbidden?: boolean }>(`/api/quotes/${id}/convert-to-invoice`, {})
  if (isForbiddenResponse(response)) {
    throw new ApiError('Forbidden', 403, response)
  }
  return {
    invoiceId: String(response?.invoiceId ?? ''),
    invoiceNumber: String(response?.invoiceNumber ?? ''),
  }
}

export const downloadQuotePdf = async (id: string): Promise<Blob> => {
  return getBlob(`/api/quotes/${id}/pdf`)
}
