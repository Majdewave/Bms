import { get, post, put } from './apiClient'

export type PaymentStatus = 'PendingVerification' | 'Verified' | 'Rejected' | 'Cancelled'
export type PaymentMethod = 'cash' | 'credit' | 'bank_transfer' | 'check' | 'bit' | 'paybox' | 'other'

export interface Payment {
  id: string
  invoiceId: string
  clientId: string
  projectId?: string | null
  amount: number
  paymentDate: string
  paymentMethod: string
  reference?: string | null
  notes?: string | null
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  createdByUserId?: string | null
  createdByName?: string | null
  createdByEmail?: string | null
  verifiedByUserId?: string | null
  verifiedAt?: string | null
}

export interface InvoicePaymentSummary {
  invoiceTotalPayable: number
  verifiedPaid: number
  remainingBalance: number
  paymentState: 'pending' | 'partially_paid' | 'paid'
  payments: Payment[]
}

export interface PaymentTotals {
  invoiceAmountDue: number
  paid: number
  outstanding: number
}

export interface CreatePaymentRequest {
  amount: number
  paymentDate: string
  paymentMethod: PaymentMethod
  reference?: string
  notes?: string
}

export const getInvoicePayments = (invoiceId: string) =>
  get<InvoicePaymentSummary>(`/api/invoices/${invoiceId}/payments`)

export const createInvoicePayment = (invoiceId: string, data: CreatePaymentRequest) =>
  post<InvoicePaymentSummary>(`/api/invoices/${invoiceId}/payments`, data)

export const updatePayment = (id: string, data: CreatePaymentRequest) =>
  put<InvoicePaymentSummary>(`/api/payments/${id}`, data)

export const cancelPayment = (id: string) =>
  post<InvoicePaymentSummary>(`/api/payments/${id}/cancel`, {})

export const getProjectPaymentSummary = (projectId: string) =>
  get<PaymentTotals>(`/api/projects/${projectId}/payment-summary`)

export const getClientPaymentSummary = (clientId: string) =>
  get<PaymentTotals>(`/api/clients/${clientId}/payment-summary`)
