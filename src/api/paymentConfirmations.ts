import { get, getBlob, post } from './apiClient'

export interface CreatePaymentConfirmationRequest {
  requestedAmount: number | null
  expiresInDays: number
}

export interface PaymentConfirmationCreated {
  id: string
  publicToken: string
  publicUrl: string
  requestedAmount: number | null
  currencyCode: string
  expiresAt: string
}

export interface PublicPaymentConfirmation {
  businessName: string
  businessLogoUrl?: string | null
  invoiceNumber: string
  projectName?: string | null
  paymentDescriptions?: string[] | null
  requestedAmount?: number | null
  currentRemaining: number
  currencyCode: string
  expiresAt: string
  requestState: 'Active' | 'Submitted' | 'Revoked' | 'Expired' | string
  submissionState?: 'PendingReview' | 'Processed' | null
  defaultLanguage: 'he' | 'ar' | 'en' | string
}

export interface PaymentConfirmationDetails {
  id: string
  submittedPaymentId?: string | null
  invoiceId: string
  invoiceNumber: string
  clientName: string
  projectName?: string | null
  requestedAmount?: number | null
  submittedAmount?: number | null
  currencyCode: string
  expiresAt: string
  createdAt: string
  status: string
  submittedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  hasProof: boolean
  submittedPaymentStatus?: string | null
}

export interface SubmitPaymentConfirmationRequest {
  amountPaid: number
  paymentDate: string
  reference?: string
  proofFile?: File | null
}

export interface PublicPaymentConfirmationSubmission {
  submittedAmount: number
  submittedAt: string
  state: 'PendingReview' | string
}

export class PaymentConfirmationAuthorizationError extends Error {
  constructor() {
    super('Payment confirmation authorization denied')
    this.name = 'PaymentConfirmationAuthorizationError'
  }
}

export const isValidPaymentConfirmationToken = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const token = value.trim()
  if (!token) return false
  if (['undefined', 'null'].includes(token.toLowerCase())) return false
  return true
}

export const buildPaymentConfirmationUrl = (value: unknown): string => {
  const token = typeof value === 'string' ? value.trim() : ''
  if (!isValidPaymentConfirmationToken(token)) {
    throw new Error('Invalid payment confirmation token')
  }
  return new URL(`/payment-confirmation/${encodeURIComponent(token)}`, window.location.origin).toString()
}

export const createPaymentConfirmation = async (invoiceId: string, request: CreatePaymentConfirmationRequest) => {
  const response = await post<PaymentConfirmationCreated & { forbidden?: boolean }>(`/api/payment-confirmations/invoices/${invoiceId}`, request)
  if (response?.forbidden === true) throw new PaymentConfirmationAuthorizationError()
  return response
}

export const getInvoicePaymentConfirmations = (invoiceId: string) =>
  get<PaymentConfirmationDetails[]>(`/api/payment-confirmations/invoice/${invoiceId}`)

export const verifyPaymentConfirmation = (id: string) =>
  post<void>(`/api/payment-confirmations/${id}/verify`, {})

export const rejectPaymentConfirmation = (id: string, reason?: string) =>
  post<void>(`/api/payment-confirmations/${id}/reject`, { reason: reason ?? '' })

export const getPublicPaymentConfirmation = (token: string) =>
  get<PublicPaymentConfirmation>(`/api/public/payment-confirmations/${encodeURIComponent(token)}`)

export const submitPublicPaymentConfirmation = (token: string, request: SubmitPaymentConfirmationRequest) => {
  const body = new FormData()
  body.append('AmountPaid', String(request.amountPaid))
  body.append('PaymentDate', request.paymentDate)
  if (request.reference?.trim()) body.append('Reference', request.reference.trim())
  if (request.proofFile) body.append('ProofFile', request.proofFile, request.proofFile.name)
  return post<PublicPaymentConfirmationSubmission>(`/api/public/payment-confirmations/${encodeURIComponent(token)}`, body, true)
}

export const getPaymentConfirmationProof = (requestId: string) =>
  getBlob(`/api/payment-confirmations/${requestId}/proof`)
