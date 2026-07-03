import { del, get, getBlob, post, put } from './apiClient'

export const DEFAULT_VAT_RATE = 18

export type InvoiceStatus = 'pending' | 'paid' | 'partially_paid' | 'cancelled'
export type InvoicePaymentMethod = 'cash' | 'credit' | 'bank_transfer' | 'check' | 'bit' | 'paybox' | 'other'

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
  withholdingTaxAmount?: number
  finalAmountToPay?: number
  invoiceDate: string
  date: string
  dueDate: string
  status: InvoiceStatus
  paymentMethod?: InvoicePaymentMethod
  installments?: number
  withholdingTaxRate?: number
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
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  notes?: string
  vatRate?: number
  status?: InvoiceStatus
  paymentMethod?: InvoicePaymentMethod
  installments?: number
  withholdingTaxRate?: number
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
  vatRate?: number,
  withholdingTaxRate?: number
) => {
  const normalizedVatRate = normalizeVatRate(vatRate)
  const normalizedWithholdingTaxRate = Math.max(0, Math.min(100, roundCurrency(toNumber(withholdingTaxRate, 0))))
  const subtotal = roundCurrency(
    lineItems.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.price), 0)
  )
  const vatAmount = roundCurrency(subtotal * normalizedVatRate / 100)
  const totalAmount = roundCurrency(subtotal + vatAmount)
  const withholdingTaxAmount = roundCurrency(totalAmount * normalizedWithholdingTaxRate / 100)
  const finalAmountToPay = roundCurrency(totalAmount - withholdingTaxAmount)

  return {
    subtotal,
    vatRate: normalizedVatRate,
    vatAmount,
    totalAmount,
    withholdingTaxRate: normalizedWithholdingTaxRate,
    withholdingTaxAmount,
    finalAmountToPay,
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
  const withholdingTaxRate = Math.max(0, Math.min(100, roundCurrency(toNumber(invoice?.withholdingTaxRate, 0))))
  const withholdingTaxAmount = roundCurrency(
    toNumber(invoice?.withholdingTaxAmount, roundCurrency(totalAmount * withholdingTaxRate / 100))
  )
  const finalAmountToPay = roundCurrency(
    toNumber(invoice?.finalAmountToPay, roundCurrency(totalAmount - withholdingTaxAmount))
  )
  const rawStatus = String(invoice?.status ?? 'pending').toLowerCase().replace(/\s+/g, '_')
  const status: InvoiceStatus =
    rawStatus === 'paid'
      ? 'paid'
      : rawStatus === 'partially_paid' || rawStatus === 'partial' || rawStatus === 'partiallypaid'
      ? 'partially_paid'
      : rawStatus === 'cancelled' || rawStatus === 'canceled'
      ? 'cancelled'
      : 'pending'
  const rawPaymentMethod = String(invoice?.paymentMethod ?? '').toLowerCase().replace(/\s+/g, '_')
  const paymentMethod: InvoicePaymentMethod | undefined =
    rawPaymentMethod === 'cash' ||
    rawPaymentMethod === 'credit' ||
    rawPaymentMethod === 'bank_transfer' ||
    rawPaymentMethod === 'check' ||
    rawPaymentMethod === 'bit' ||
    rawPaymentMethod === 'paybox' ||
    rawPaymentMethod === 'other'
      ? rawPaymentMethod
      : undefined
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
    withholdingTaxAmount,
    finalAmountToPay,
    invoiceDate,
    date: invoiceDate,
    dueDate: invoice?.dueDate ? String(invoice.dueDate) : '',
    status,
    paymentMethod,
    installments: toNumber(invoice?.installments, 0) || undefined,
    withholdingTaxRate,
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
