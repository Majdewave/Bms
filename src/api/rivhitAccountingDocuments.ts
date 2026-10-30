import { get, post } from './apiClient'

export type ExternalAccountingDocumentStatus = 'Issuing' | 'Issued' | 'Rejected' | 'ReconciliationRequired'

export interface ExternalAccountingDocument {
  id: string
  invoiceId: string
  provider: string
  purpose: string
  status: ExternalAccountingDocumentStatus
  requestReference: string
  externalDocumentType: number | null
  externalDocumentId: string | null
  externalDocumentNumber: number | null
  externalCustomerId: number | null
  paymentId?: string | null
  issuedAt: string | null
  currency: string
  amount: number
  externalAmount: number | null
  providerResponseCode: string | null
  createdAt: string
  updatedAt: string
}

export interface AccountingDocumentIssueError {
  code: string
  document?: ExternalAccountingDocument | null
}

const listUrl = '/api/business/invoices/accounting-documents'
const invoiceUrl = (invoiceId: string) => `/api/business/invoices/${encodeURIComponent(invoiceId)}/accounting-document`

export const getAccountingDocuments = () => get<ExternalAccountingDocument[]>(listUrl)
export const getAccountingDocument = (invoiceId: string) => get<ExternalAccountingDocument>(invoiceUrl(invoiceId))

// Backend AccountingDeliveryChannel enum: None = 1, Email = 2. The API binds enums numerically
// (no JsonStringEnumConverter), so the wire format must be the numeric value.
export type AccountingDeliveryChannel = 1 | 2
export const DELIVERY_NONE: AccountingDeliveryChannel = 1
export const DELIVERY_EMAIL: AccountingDeliveryChannel = 2
export type RivhitReceiptPaymentMethod = 'cash' | 'bit' | 'paybox' | 'bank_transfer'

export const issueInvoiceWithRivhit = (invoiceId: string, deliveryChannel: AccountingDeliveryChannel = DELIVERY_NONE) =>
  post<ExternalAccountingDocument>(`${invoiceUrl(invoiceId)}/rivhit`, { deliveryChannel })

export interface ArchiveDocumentResult {
  code: 'Archived' | 'AlreadyArchived'
  clientFileId?: string | null
}

// Safe archive/retry for an Issued Rivhit document with no ClientFile yet.
// Backend only does read-only Rivhit Copy + PDF download -> S3 -> ClientFile.
export const archiveRivhitDocument = (documentId: string) =>
  post<ArchiveDocumentResult>(`/api/business/accounting-documents/${encodeURIComponent(documentId)}/archive`)

export interface ReconcileReceiptResult {
  operationId?: string | null
  document?: ExternalAccountingDocument | null
}

// Read-only Rivhit status reconcile for a ReconciliationRequired receipt operation.
// Never calls Receipt.New; finalizes confirmed docs or releases on definitive rejection/NotFound.
export const reconcileReceiptOperation = (operationId: string) =>
  post<ReconcileReceiptResult>(`/api/business/accounting-operations/${encodeURIComponent(operationId)}/reconcile`)

export interface PendingReceiptOperation {
  operationId?: string | null
}

// Read-only: the invoice's pending (Issuing/Finalizing/ReconciliationRequired) receipt operation, if any.
export const getPendingReceiptOperation = (invoiceId: string) =>
  get<PendingReceiptOperation>(`${invoiceUrl(invoiceId)}/receipt-pending-operation`)

// Safe invoice "check status with Rivhit" for an Issuing/ReconciliationRequired invoice.
// Uses read-only Rivhit recovery only; never calls Document.New.
export const reconcileInvoiceDocument = (invoiceId: string) =>
  post<{ code?: string; document?: ExternalAccountingDocument | null }>(`${invoiceUrl(invoiceId)}/reconcile`)

export interface IssueAccountingReceiptRequest {
  amount: number
  /** Omitted when paymentId identifies an existing CLIENTA payment; the backend uses its stored method. */
  paymentMethod?: RivhitReceiptPaymentMethod
  paymentDate: string
  idempotencyKey: string
  deliveryChannel?: AccountingDeliveryChannel
  /** When set, receipts an existing verified CLIENTA payment instead of reserving balance. */
  paymentId?: string
}

export interface AccountingReceiptIssueResult {
  operationId?: string | null
  document?: ExternalAccountingDocument | null
}

export const issueReceiptWithRivhit = (invoiceId: string, body: IssueAccountingReceiptRequest) =>
  post<AccountingReceiptIssueResult>(`${invoiceUrl(invoiceId)}/receipt`, body)
