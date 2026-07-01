import { del, get, getBlob, post, put } from './apiClient'

export const DEFAULT_VAT_RATE = 18

export type InvoiceStatus = 'paid' | 'pending' | 'overdue'

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  price: number
  total: number
}

export interface Invoice {
  id: string
  number: string
  clientId: string
  clientName: string
  clientEmail: string
  amount: number
  subtotal: number
  vatRate: number
  vatAmount: number
  totalAmount: number
  invoiceDate: string
  date: string
  dueDate: string
  status: InvoiceStatus
  lineItems: InvoiceLineItem[]
  notes?: string
}

export interface CreateInvoiceLineItemRequest {
  description: string
  quantity: number
  price: number
}

export interface CreateInvoiceRequest {
  clientId: string
  invoiceDate?: string
  dueDate?: string
  notes?: string
  vatRate?: number
  lineItems: CreateInvoiceLineItemRequest[]
}

const roundCurrency = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round((value + Number.EPSILON) * 100) / 100
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeVatRate = (value: unknown): number => {
  const parsed = toNumber(value, DEFAULT_VAT_RATE)

  if (parsed <= 0 || parsed > 100) {
    return DEFAULT_VAT_RATE
  }

  return roundCurrency(parsed)
}

const normalizeInvoiceLineItem = (lineItem: any, index: number): InvoiceLineItem => {
  const quantity = toNumber(lineItem?.quantity, 0)
  const price = roundCurrency(toNumber(lineItem?.price, 0))
  const total = roundCurrency(toNumber(lineItem?.total, quantity * price))

  return {
    id: String(lineItem?.id ?? `line-item-${index}`),
    description: String(lineItem?.description ?? ''),
    quantity,
    price,
    total,
  }
}

export const calculateInvoiceTotals = (
  lineItems: Array<Pick<CreateInvoiceLineItemRequest, 'quantity' | 'price'>>,
  vatRate?: number
) => {
  const normalizedVatRate = normalizeVatRate(vatRate)
  const subtotal = roundCurrency(
    lineItems.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.price), 0)
  )
  const vatAmount = roundCurrency(subtotal * normalizedVatRate / 100)
  const totalAmount = roundCurrency(subtotal + vatAmount)

  return {
    subtotal,
    vatRate: normalizedVatRate,
    vatAmount,
    totalAmount,
  }
}

const normalizeInvoice = (invoice: any): Invoice => {
  const lineItems = Array.isArray(invoice?.lineItems)
    ? invoice.lineItems.map(normalizeInvoiceLineItem)
    : []
  const fallbackVatRate = normalizeVatRate(invoice?.vatRate)
  const fallbackTotals = calculateInvoiceTotals(lineItems, fallbackVatRate)
  const totalAmount = roundCurrency(toNumber(invoice?.totalAmount, toNumber(invoice?.amount, fallbackTotals.totalAmount)))
  const subtotal = roundCurrency(toNumber(invoice?.subtotal, fallbackTotals.subtotal))
  const vatRate = normalizeVatRate(invoice?.vatRate ?? fallbackTotals.vatRate)
  const vatAmount = roundCurrency(toNumber(invoice?.vatAmount, fallbackTotals.vatAmount))
  const rawStatus = String(invoice?.status ?? 'pending').toLowerCase()
  const status: InvoiceStatus = rawStatus === 'paid' || rawStatus === 'overdue' ? rawStatus : 'pending'
  const invoiceDate = String(invoice?.invoiceDate ?? invoice?.date ?? invoice?.createdAt ?? new Date().toISOString())

  return {
    id: String(invoice?.id ?? ''),
    number: String(invoice?.number ?? invoice?.invoiceNumber ?? ''),
    clientId: String(invoice?.clientId ?? ''),
    clientName: String(invoice?.clientName ?? ''),
    clientEmail: String(invoice?.clientEmail ?? ''),
    amount: totalAmount,
    subtotal,
    vatRate,
    vatAmount,
    totalAmount,
    invoiceDate,
    date: invoiceDate,
    dueDate: invoice?.dueDate ? String(invoice.dueDate) : '',
    status,
    lineItems,
    notes: invoice?.notes ?? undefined,
  }
}

export const getInvoices = async (): Promise<Invoice[]> => {
  const invoices = await get<any[]>('/api/invoices')
  return invoices.map(normalizeInvoice)
}

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  const invoice = await get<any>(`/api/invoices/${id}`)
  return invoice ? normalizeInvoice(invoice) : null
}

export const createInvoice = async (data: CreateInvoiceRequest): Promise<Invoice> => {
  const invoice = await post<any>('/api/invoices', data)
  return normalizeInvoice(invoice)
}

export const updateInvoice = async (id: string, data: CreateInvoiceRequest): Promise<Invoice> => {
  const invoice = await put<any>(`/api/invoices/${id}`, data)
  return normalizeInvoice(invoice)
}

export const deleteInvoice = async (id: string): Promise<void> => {
  await del<void>(`/api/invoices/${id}`)
}

export const downloadInvoice = async (id: string): Promise<Blob> => {
  return getBlob(`/api/invoices/${id}/pdf`)
}
