import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { AlertTriangle, Archive, CheckCircle2, ChevronDown, Download, ExternalLink, Landmark, Receipt, RefreshCw, Trash2, X } from 'lucide-react'
import { post } from '@/api/apiClient'
import { getInvoicePayments, type Payment } from '@/api/payments'
import { getClientFiles, downloadClientFile, deleteClientFile, type ClientFileRecord } from '@/api/clients'
import { DELIVERY_EMAIL, DELIVERY_NONE, archiveRivhitDocument, getPendingReceiptOperation, reconcileReceiptOperation, reconcileInvoiceDocument, type AccountingDeliveryChannel, type ExternalAccountingDocument } from '@/api/rivhitAccountingDocuments'
import type { Invoice } from '@/api/invoices'
import { getAccountingApiErrorDetails } from '@/utils/accountingApiError'

export type RivhitPaymentMethod = 'cash' | 'bit' | 'paybox' | 'bank_transfer'

// Only methods the Rivhit receipt flow supports are ever offered for selection.
const supportedRivhitMethods: RivhitPaymentMethod[] = ['cash', 'bit', 'paybox', 'bank_transfer']

const paymentMethodTranslationKey = (method: string) => {
  const normalized = method.trim().replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
  return normalized === 'pay_box' ? 'paybox' : normalized
}

const statusClass = (status?: string) => status === 'Issued'
  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
  : status === 'ReconciliationRequired'
    ? 'border-amber-300 bg-amber-50 text-amber-800'
    : status === 'Rejected'
      ? 'border-red-300 bg-red-50 text-red-800'
      : status === 'Issuing'
        ? 'border-blue-300 bg-blue-50 text-blue-800'
        : 'border-slate-300 bg-slate-50 text-slate-700'

export function normalizeAccountingDocumentPurpose(value: string | null | undefined): 'invoice' | 'receipt' | 'combined' | 'other' {
  const normalized = (value ?? '').toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'invoice') return 'invoice'
  if (normalized === 'receipt') return 'receipt'
  if (normalized === 'combinedinvoicereceipt') return 'combined'
  return 'other'
}

export function getAccountingDocumentState(documents: ExternalAccountingDocument[]) {
  const invoice = documents.find((document) => normalizeAccountingDocumentPurpose(document.purpose) === 'invoice')
  const receipts = documents.filter((document) => normalizeAccountingDocumentPurpose(document.purpose) === 'receipt')
  const reconciliation = receipts.find((document) => document.status === 'ReconciliationRequired')
    ?? (invoice?.status === 'ReconciliationRequired' ? invoice : undefined)
  return { invoice, receipts, reconciliation }
}

export type RivhitAccountingActionsProps = {
  invoice: Invoice
  accountingDocuments: ExternalAccountingDocument[]
  defaultExpanded?: boolean
  canManageRivhit: boolean
  isBusinessTenant: boolean
  outstandingAmount: number
  currency: string
  onRefresh: () => Promise<void> | void
  onIssueTaxInvoice: (invoice: Invoice) => void
}

export function RivhitAccountingActions({
  invoice,
  accountingDocuments,
  defaultExpanded = false,
  canManageRivhit,
  isBusinessTenant,
  outstandingAmount,
  currency,
  onRefresh,
  onIssueTaxInvoice,
}: RivhitAccountingActionsProps) {
  const { t, i18n } = useTranslation()
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [form, setForm] = useState({
    amount: outstandingAmount.toFixed(2),
    paymentMethod: 'cash' as RivhitPaymentMethod | null,
    paymentDate: new Date().toISOString().slice(0, 10),
    idempotencyKey: '',
    deliveryChannel: DELIVERY_NONE as AccountingDeliveryChannel,
    paymentId: '' as string,
  })
  const [verifiedPayments, setVerifiedPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [paymentsLoadFailed, setPaymentsLoadFailed] = useState(false)
  const [rivhitFiles, setRivhitFiles] = useState<Record<string, ClientFileRecord>>({})
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingReceiptOpId, setPendingReceiptOpId] = useState<string | null>(null)
  const [pendingReceiptLookupLoading, setPendingReceiptLookupLoading] = useState(true)
  const [pendingReceiptLookupFailed, setPendingReceiptLookupFailed] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const { invoice: taxInvoiceDocument, receipts, reconciliation } = getAccountingDocumentState(accountingDocuments)
  const paymentIdsWithReceipts = new Set(receipts
    .filter((document) => Boolean(document.paymentId))
    .map((document) => document.paymentId as string))
  const receiptablePayments = verifiedPayments.filter((payment) => !paymentIdsWithReceipts.has(payment.id))
  const selectedExistingPayment = form.paymentId ? verifiedPayments.find((payment) => payment.id === form.paymentId) : undefined
  const firstVisibleDocumentId = taxInvoiceDocument?.status === 'Issued'
    ? taxInvoiceDocument.id
    : receipts[0]?.id
  const [expandedAccountingDocumentIds, setExpandedAccountingDocumentIds] = useState<Set<string>>(
    () => new Set(firstVisibleDocumentId ? [firstVisibleDocumentId] : []),
  )
  const language = i18n.resolvedLanguage || i18n.language
  const isRtl = language.startsWith('he') || language.startsWith('ar')
  const locale = language.startsWith('he') ? 'he-IL' : language.startsWith('ar') ? 'ar' : 'en-US'
  const formatCurrency = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0)
  const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString(locale) : '—'
  const reconciliationBlock = Boolean(reconciliation)
  const taxInvoiceStatus = taxInvoiceDocument?.status ?? 'NotIssued'
  const showTaxInvoiceAction = isBusinessTenant && canManageRivhit && invoice.status === 'pending' && !taxInvoiceDocument
  const hasReceiptBalance = outstandingAmount > 0
  // Fail closed until the server confirms there is no Issuing/Finalizing/ReconciliationRequired receipt.
  const showReceiptAction = isBusinessTenant && canManageRivhit && !reconciliationBlock && !pendingReceiptLookupLoading
    && !pendingReceiptLookupFailed && !pendingReceiptOpId && !loadingPayments && !paymentsLoadFailed
    && (hasReceiptBalance || receiptablePayments.length > 0) && invoice.status !== 'cancelled'
  const showReceiptReconciliation = reconciliationBlock || Boolean(pendingReceiptOpId) || pendingReceiptLookupFailed
  const accountingDocumentsKey = accountingDocuments.map((document) => `${document.id}:${document.status}`).join(',')
  const taxInvoiceNumber = taxInvoiceDocument?.externalDocumentNumber
  // Invoice-level ReconciliationRequired (no receipt op) — INV-8 case.
  const invoiceReconciliation = taxInvoiceDocument?.status === 'ReconciliationRequired' ? taxInvoiceDocument : undefined
  useEffect(() => {
    setExpandedAccountingDocumentIds(new Set(firstVisibleDocumentId ? [firstVisibleDocumentId] : []))
  }, [firstVisibleDocumentId, accountingDocumentsKey])

  const toggleAccountingDocument = (documentId: string) => {
    setExpandedAccountingDocumentIds((current) => {
      const next = new Set(current)
      if (next.has(documentId)) next.delete(documentId)
      else next.add(documentId)
      return next
    })
  }

  // Load archived Rivhit PDFs (ClientFiles linked to this invoice's external accounting documents).
  const issuedDocumentIds = [taxInvoiceDocument, ...receipts]
    .filter((d): d is ExternalAccountingDocument => Boolean(d) && d!.status === 'Issued')
    .map((d) => d.id)
    .sort()
    .join(',')
  const loadRivhitFiles = () => {
    if (!issuedDocumentIds || !invoice.clientId) { setRivhitFiles({}); return Promise.resolve() }
    return getClientFiles(invoice.clientId)
      .then((files) => {
        const wanted = new Set(issuedDocumentIds.split(','))
        const map: Record<string, ClientFileRecord> = {}
        for (const file of files ?? []) {
          if (file.externalAccountingDocumentId && wanted.has(file.externalAccountingDocumentId)) map[file.externalAccountingDocumentId] = file
        }
        setRivhitFiles(map)
      })
      .catch(() => setRivhitFiles({}))
  }
  useEffect(() => {
    let cancelled = false
    getClientFiles(invoice.clientId)
      .then((files) => {
        if (cancelled) return
        const wanted = new Set(issuedDocumentIds.split(','))
        const map: Record<string, ClientFileRecord> = {}
        for (const file of files ?? []) {
          if (file.externalAccountingDocumentId && wanted.has(file.externalAccountingDocumentId)) map[file.externalAccountingDocumentId] = file
        }
        setRivhitFiles(map)
      })
      .catch(() => { if (!cancelled) setRivhitFiles({}) })
    return () => { cancelled = true }
  }, [issuedDocumentIds, invoice.clientId])

  // Always resolve pending receipt state: stuck operations may have no ExternalAccountingDocument row.
  useEffect(() => {
    let cancelled = false
    setPendingReceiptOpId(null)
    setPendingReceiptLookupLoading(true)
    setPendingReceiptLookupFailed(false)
    getPendingReceiptOperation(invoice.id)
      .then((result) => {
        if (!cancelled) setPendingReceiptOpId(result?.operationId ?? null)
      })
      .catch(() => {
        if (!cancelled) setPendingReceiptLookupFailed(true)
      })
      .finally(() => {
        if (!cancelled) setPendingReceiptLookupLoading(false)
      })
    return () => { cancelled = true }
  }, [invoice.id, accountingDocumentsKey])

  const archiveDocument = async (documentId: string) => {
    setArchivingId(documentId)
    setMessage(null)
    try {
      await archiveRivhitDocument(documentId)
      await loadRivhitFiles()
      setMessage({ tone: 'success', text: t('business.accounting.archive.success') })
    } catch (error) {
      const text = t('business.accounting.archive.issueSucceededButSaveFailed')
      setMessage({ tone: 'error', text })
      toast.error(text)
    } finally {
      setArchivingId(null)
    }
  }

  const deleteArchivedPdf = async (documentId: string) => {
    const file = rivhitFiles[documentId]
    if (!file) return
    setDeletingId(documentId)
    setMessage(null)
    try {
      // Deletes ONLY the ClientFile/S3 object; the ExternalAccountingDocument/audit record is preserved
      // and the backend resets ArchiveStatus to Pending so it can be archived again.
      await deleteClientFile(invoice.clientId, file.id)
      await loadRivhitFiles()
      await onRefresh()
      setMessage({ tone: 'success', text: t('business.accounting.archive.deleted') })
    } catch {
      const text = t('business.accounting.archive.errors.deleteFailed')
      setMessage({ tone: 'error', text })
      toast.error(text)
    } finally {
      setDeletingId(null)
    }
  }

  const checkReconciliation = async () => {
    if (!pendingReceiptOpId) return
    setReconciling(true)
    setMessage(null)
    try {
      const result = await reconcileReceiptOperation(pendingReceiptOpId)
      await onRefresh()
      await loadRivhitFiles()
      if (result?.document) {
        setMessage({ tone: 'success', text: t('business.accounting.reconciliationResolved') })
      } else {
        setMessage({ tone: 'warning', text: t('business.accounting.reconciliationStillPending') })
      }
    } catch (error) {
      const apiError = error as { status?: number; response?: { code?: string }; code?: string }
      const code = apiError?.response?.code ?? apiError?.code
      if (code === 'ProviderRejected') {
        // Definitive rejection/NotFound: reservation released -> a new issuance is now allowed.
        await onRefresh()
        setMessage({ tone: 'warning', text: t('business.accounting.reconciliationRejected') })
      } else {
        setMessage({ tone: 'warning', text: t('business.accounting.reconciliationStillPending') })
      }
    } finally {
      setReconciling(false)
    }
  }

  // Invoice-level "check status with Rivhit" (INV-8). Uses read-only recovery only; never Document.New.
  const checkInvoiceReconciliation = async () => {
    setReconciling(true)
    setMessage(null)
    try {
      await reconcileInvoiceDocument(invoice.id)
      await onRefresh()
      await loadRivhitFiles()
      setMessage({ tone: 'success', text: t('business.accounting.reconciliationResolved') })
    } catch (error) {
      const apiError = error as { status?: number; response?: { code?: string }; code?: string }
      const code = apiError?.response?.code ?? apiError?.code
      if (code === 'ProviderRejected') {
        // Definitive rejection/NotFound: reservation released -> a fresh issuance is now allowed.
        await onRefresh()
        setMessage({ tone: 'warning', text: t('business.accounting.reconciliationRejected') })
      } else {
        setMessage({ tone: 'warning', text: t('business.accounting.reconciliationStillPending') })
      }
    } finally {
      setReconciling(false)
    }
  }

  const openRivhitPdf = async (documentId: string, download: boolean) => {
    const file = rivhitFiles[documentId]
    if (!file) return
    setDownloadingId(documentId)
    try {
      const blob = await downloadClientFile(invoice.clientId, file.id)
      const url = URL.createObjectURL(blob)
      if (download) {
        const link = document.createElement('a')
        link.href = url
        link.download = file.fileName || 'rivhit-document.pdf'
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      }
    } catch {
      const text = t('business.accounting.archive.openFailed')
      setMessage({ tone: 'error', text })
      toast.error(text)
    } finally {
      setDownloadingId(null)
    }
  }

  const renderDocActions = (documentId: string) => {
    const archived = rivhitFiles[documentId]
    if (!archived) {
      // Issued but not archived yet: offer a safe archive/retry (read-only Rivhit Copy + PDF -> S3/ClientFile).
      if (!canManageRivhit) return null
      return (
        <div className="mt-2">
          <button type="button" onClick={() => void archiveDocument(documentId)} disabled={archivingId === documentId}
            className="inline-flex items-center gap-1 rounded-md border border-indigo-300 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50">
            <Archive className="h-3 w-3" />{archivingId === documentId ? t('business.accounting.archive.archiving') : t('business.accounting.archive.retry')}
          </button>
        </div>
      )
    }
    return (
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => void openRivhitPdf(documentId, false)} disabled={downloadingId === documentId || deletingId === documentId}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
          <ExternalLink className="h-3 w-3" />{t('business.accounting.archive.view')}
        </button>
        <button type="button" onClick={() => void openRivhitPdf(documentId, true)} disabled={downloadingId === documentId || deletingId === documentId}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
          <Download className="h-3 w-3" />{t('business.accounting.archive.download')}
        </button>
        {canManageRivhit && (
          <button type="button" onClick={() => void deleteArchivedPdf(documentId)} disabled={deletingId === documentId || downloadingId === documentId}
            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="h-3 w-3" />{deletingId === documentId ? t('business.accounting.archive.deleting') : t('business.accounting.archive.delete')}
          </button>
        )}
      </div>
    )
  }

  const submitReceipt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(form.amount)
    const isExisting = Boolean(form.paymentId)
    if (!Number.isFinite(amount) || amount <= 0 || (!isExisting && (amount > outstandingAmount || !form.paymentMethod))) return
    setSubmitting(true)
    setMessage(null)
    try {
      await post<{ operationId?: string; document?: ExternalAccountingDocument }>(
        `/api/business/invoices/${encodeURIComponent(invoice.id)}/accounting-document/receipt`,
        {
          amount,
          paymentDate: form.paymentDate,
          idempotencyKey: form.idempotencyKey || crypto.randomUUID(),
          deliveryChannel: form.deliveryChannel,
          ...(!isExisting ? { paymentMethod: form.paymentMethod } : {}),
          ...(isExisting ? { paymentId: form.paymentId } : {}),
        },
      )
      setShowReceiptForm(false)
      setConfirming(false)
      await onRefresh()
      setMessage({ tone: 'success', text: t('business.accounting.receipts.success') })
    } catch (error) {
      const { code, providerCode, status } = getAccountingApiErrorDetails(error)
      const errorKey = code === 'AmountUnavailable'
        ? 'amountUnavailable'
        : code === 'UnsupportedPaymentMethod'
          ? 'unsupportedPaymentMethod'
        : code === 'ReconciliationRequired' || code === 'AccountingReconciliationRequired' || status === 409
          ? 'reconciliationRequired'
          : (code === 'ProviderRejected' && providerCode === 'INVALID_ID_NUMBER') || code === 'CustomerIdentifierInvalid'
            ? 'invalidIdentifier'
            : ['CustomerIdentifierRequired', 'MissingClientIdentifier', 'ClientIdentifierRequired'].includes(code ?? '')
              ? 'missingIdentifier'
              : code === 'PaymentNotFound'
                ? 'paymentNotFound'
                : code === 'ProviderRejected'
                  ? 'providerRejected'
                  : 'error'
      const text = t(`business.accounting.receipts.${errorKey}`)
      setMessage({ tone: errorKey === 'reconciliationRequired' ? 'warning' : 'error', text })
      toast.error(text)
    } finally {
      setSubmitting(false)
    }
  }

  const beginReceipt = () => {
    setMessage(null)
    const existingPayment = receiptablePayments[0]
    setForm((current) => ({
      amount: existingPayment ? existingPayment.amount.toFixed(2) : outstandingAmount.toFixed(2),
      paymentMethod: existingPayment ? null : current.paymentMethod ?? 'cash',
      paymentDate: existingPayment ? existingPayment.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      idempotencyKey: crypto.randomUUID(),
      deliveryChannel: DELIVERY_NONE,
      paymentId: existingPayment?.id ?? '',
    }))
    setConfirming(false)
    setShowReceiptForm(true)
  }

  const selectExistingPayment = (paymentId: string) => {
    const payment = verifiedPayments.find((p) => p.id === paymentId)
    setForm((current) => ({
      ...current,
      paymentId,
      ...(payment ? {
        amount: payment.amount.toFixed(2),
        paymentDate: payment.paymentDate.slice(0, 10),
      } : {}),
    }))
  }

  // Load verified payments so existing-payment receipts remain available on fully paid invoices.
  useEffect(() => {
    if (!isBusinessTenant || !canManageRivhit) {
      setVerifiedPayments([])
      setPaymentsLoadFailed(false)
      setLoadingPayments(false)
      return
    }
    let cancelled = false
    setLoadingPayments(true)
    setPaymentsLoadFailed(false)
    getInvoicePayments(invoice.id)
      .then((summary) => { if (!cancelled) setVerifiedPayments((summary.payments ?? []).filter((p) => p.status === 'Verified')) })
      .catch(() => {
        if (!cancelled) {
          setVerifiedPayments([])
          setPaymentsLoadFailed(true)
        }
      })
      .finally(() => { if (!cancelled) setLoadingPayments(false) })
    return () => { cancelled = true }
  }, [isBusinessTenant, canManageRivhit, invoice.id, accountingDocumentsKey])

  const receiptFormContent = (
    <form id="rivhit-receipt-form" onSubmit={submitReceipt} className="space-y-4">
      {confirming ? (
        <>
          <h3 className="text-lg font-semibold text-slate-900">{t('business.accounting.receipts.confirmTitle')}</h3>
          <p className="text-sm leading-relaxed text-slate-700">{t('business.accounting.receipts.confirmDescription')}</p>
          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">{t('admin.invoices.table.client')}</dt><dd className="mt-1 font-semibold text-slate-900">{invoice.clientName}</dd></div>
            <div><dt className="text-slate-500">{t('admin.invoices.table.number')}</dt><dd className="mt-1 font-semibold text-slate-900">{invoice.number}</dd></div>
            <div><dt className="text-slate-500">{t('business.accounting.receipts.amount')}</dt><dd className="mt-1 font-semibold text-slate-900">{formatCurrency(Number(form.amount) || 0)}</dd></div>
            <div><dt className="text-slate-500">{t('business.accounting.receipts.paymentMethod')}</dt><dd className="mt-1 font-semibold text-slate-900">{selectedExistingPayment ? t(`payments.methods.${paymentMethodTranslationKey(selectedExistingPayment.paymentMethod)}`, { defaultValue: selectedExistingPayment.paymentMethod }) : t(`payments.methods.${form.paymentMethod}`)}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-500">{t('business.accounting.receipts.remainingBefore')}</dt><dd className="mt-1 font-semibold text-amber-800">{formatCurrency(outstandingAmount)}</dd></div>
          </dl>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={submitting} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? t('business.accounting.receipts.issuing') : t('business.accounting.receipts.confirmIssue')}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-slate-900">{t('business.accounting.receipts.title')}</h3>
          <p className="text-sm leading-relaxed text-slate-600">{t('business.accounting.receipts.description')}</p>

          {/* Existing verified payment mode: receipts a payment already recorded in CLIENTA. */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">{t('business.accounting.receipts.sourceLabel')}</span>
            <div className="flex flex-wrap gap-2">
              {hasReceiptBalance && (
                <button type="button" onClick={() => setForm((c) => ({ ...c, paymentId: '', paymentMethod: c.paymentMethod ?? 'cash' }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${!form.paymentId ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-300 bg-white text-slate-600'}`}>
                  {t('business.accounting.receipts.sourceNew')}
                </button>
              )}
              {!loadingPayments && receiptablePayments.map((p) => (
                <button key={p.id} type="button" onClick={() => selectExistingPayment(p.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${form.paymentId === p.id ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-300 bg-white text-slate-600'}`}>
                  {t('business.accounting.receipts.sourceExisting', { amount: formatCurrency(p.amount), date: formatDateTime(p.paymentDate).split(',')[0] })}
                </button>
              ))}
            </div>
            {loadingPayments && <p className="text-xs text-slate-400">{t('common.loading')}</p>}
            {!loadingPayments && receiptablePayments.length === 0 && verifiedPayments.length === 0 && (
              <p className="text-xs text-slate-400">{t('business.accounting.receipts.noExistingPayments')}</p>
            )}
            {!loadingPayments && verifiedPayments.length > 0 && receiptablePayments.length === 0 && (
              <p className="text-xs text-slate-500">{t('business.accounting.receipts.allPaymentsReceipted')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t('business.accounting.receipts.amount')}</span>
              <input required type="number" min="0.01" max={form.paymentId ? Number(form.amount) : outstandingAmount} step="0.01" value={form.amount} disabled={Boolean(form.paymentId)} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="input w-full disabled:bg-slate-50" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t('business.accounting.receipts.paymentMethod')}</span>
              {form.paymentId ? (
                <div className="input w-full bg-slate-50" aria-readonly="true">
                  {selectedExistingPayment ? t(`payments.methods.${paymentMethodTranslationKey(selectedExistingPayment.paymentMethod)}`, { defaultValue: selectedExistingPayment.paymentMethod }) : '—'}
                </div>
              ) : (
                <select required value={form.paymentMethod ?? ''} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value as RivhitPaymentMethod }))} className="input w-full">
                  {supportedRivhitMethods.map((method) => <option key={method} value={method}>{t(`payments.methods.${method}`)}</option>)}
                </select>
              )}
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t('payments.date')}</span>
              <input required type="date" value={form.paymentDate} disabled={Boolean(form.paymentId)} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} className="input w-full disabled:bg-slate-50" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t('business.accounting.delivery.label')}</span>
              <select value={form.deliveryChannel} onChange={(event) => setForm((current) => ({ ...current, deliveryChannel: Number(event.target.value) as AccountingDeliveryChannel }))} className="input w-full">
                <option value={DELIVERY_NONE}>{t('business.accounting.delivery.none')}</option>
                <option value={DELIVERY_EMAIL}>{t('business.accounting.delivery.email')}</option>
              </select>
            </label>
          </div>
          {!form.paymentId && <div className="flex items-end text-xs text-slate-500">{t('business.accounting.receipts.partialSupported')}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowReceiptForm(false)} disabled={submitting} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{t('common.cancel')}</button>
            <button type="button" onClick={() => setConfirming(true)} disabled={submitting} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {t('business.accounting.receipts.review')}
            </button>
          </div>
        </>
      )}
    </form>
  )

  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 sm:p-4" aria-label={t('business.accounting.title')} data-testid={`rivhit-accounting-${invoice.id}`}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={`rivhit-accounting-body-${invoice.id}`}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="flex w-full items-center justify-between gap-3 text-start"
      >
        <span className="min-w-0 text-sm font-semibold text-indigo-950">{t('business.accounting.title')}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(taxInvoiceStatus)}`}>
            {t(`admin.invoices.accounting.status.${taxInvoiceStatus}`)}
          </span>
          <ChevronDown className={`h-4 w-4 text-indigo-700 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      <div
        id={`rivhit-accounting-body-${invoice.id}`}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="min-h-0 overflow-hidden pt-3">
          <p className="text-xs text-slate-600">{t('business.accounting.description')}</p>

      {taxInvoiceDocument && taxInvoiceDocument.status === 'Issued' && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <button
            type="button"
            aria-expanded={expandedAccountingDocumentIds.has(taxInvoiceDocument.id)}
            aria-controls={`rivhit-document-details-${taxInvoiceDocument.id}`}
            onClick={() => toggleAccountingDocument(taxInvoiceDocument.id)}
            className="flex w-full items-center justify-between gap-2 text-start font-semibold"
          >
            <span>{t('business.accounting.taxInvoice.issued')}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expandedAccountingDocumentIds.has(taxInvoiceDocument.id) ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <div id={`rivhit-document-details-${taxInvoiceDocument.id}`} hidden={!expandedAccountingDocumentIds.has(taxInvoiceDocument.id)}>
              <p className="mt-1">{t('business.accounting.documentNumber')}: {taxInvoiceNumber ?? '—'}</p>
            <p className="mt-1">{t('business.accounting.issuedAt')}: {formatDateTime(taxInvoiceDocument.issuedAt)}</p>
            {renderDocActions(taxInvoiceDocument.id)}
          </div>
        </div>
      )}

      {showReceiptReconciliation && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />{t('business.accounting.reconciliationTitle')}</p>
          <p className="mt-1 leading-relaxed">{t('business.accounting.reconciliationWarning')}</p>
          {canManageRivhit && pendingReceiptOpId && (
            <button type="button" onClick={() => void checkReconciliation()} disabled={reconciling}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${reconciling ? 'animate-spin' : ''}`} />{reconciling ? t('business.accounting.reconciliationChecking') : t('business.accounting.reconciliationCheck')}
            </button>
          )}
          {canManageRivhit && !pendingReceiptOpId && invoiceReconciliation && (
            <button type="button" onClick={() => void checkInvoiceReconciliation()} disabled={reconciling}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${reconciling ? 'animate-spin' : ''}`} />{reconciling ? t('business.accounting.reconciliationChecking') : t('business.accounting.reconciliationCheck')}
            </button>
          )}
          {pendingReceiptLookupLoading && <p className="mt-2">{t('business.accounting.reconciliationChecking')}</p>}
        </div>
      )}

      {message && (
        <div role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg border p-3 text-xs ${message.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : message.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {isBusinessTenant && (
        <div className="mt-3 flex flex-wrap gap-2">
          {showTaxInvoiceAction && (
            <button type="button" onClick={() => onIssueTaxInvoice(invoice)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800">
              <Landmark className="h-3.5 w-3.5" />{t('business.accounting.taxInvoice.issue')}
            </button>
          )}
          {showReceiptAction && (
            <button type="button" onClick={beginReceipt} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50">
              <Receipt className="h-3.5 w-3.5" />{t('business.accounting.receipts.issue')}
            </button>
          )}
          {!canManageRivhit && (
            <p className="text-xs text-slate-500">{t('business.accounting.adminOnly')}</p>
          )}
        </div>
      )}

      {receipts.length > 0 && (
        <div className="mt-3 space-y-2">
          {receipts.map((receipt) => (
            <article key={receipt.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
              <button
                type="button"
                aria-expanded={expandedAccountingDocumentIds.has(receipt.id)}
                aria-controls={`rivhit-document-details-${receipt.id}`}
                onClick={() => toggleAccountingDocument(receipt.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 text-start"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900">{t('business.accounting.receipts.receiptLabel')}</span>
                </div>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusClass(receipt.status)}`}>{t(`admin.invoices.accounting.status.${receipt.status}`)}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-600 transition-transform duration-200 ${expandedAccountingDocumentIds.has(receipt.id) ? 'rotate-180' : ''}`} aria-hidden="true" />
                </span>
              </button>
              <div id={`rivhit-document-details-${receipt.id}`} hidden={!expandedAccountingDocumentIds.has(receipt.id)}>
                <div className="mt-2 space-y-1 text-slate-600">
                  <p className="flex items-baseline justify-between gap-3 whitespace-nowrap"><span>{t('business.accounting.receiptNumber')}:</span><bdi dir="auto" className="shrink-0 text-end tabular-nums">{receipt.externalDocumentNumber ?? '—'}</bdi></p>
                  <p className="flex items-baseline justify-between gap-3 whitespace-nowrap"><span>{t('business.accounting.receiptAmount')}:</span><bdi dir="auto" className="shrink-0 text-end tabular-nums">{formatCurrency(receipt.externalAmount ?? receipt.amount)}</bdi></p>
                  <p className="flex items-baseline justify-between gap-3 whitespace-nowrap"><span>{t('business.accounting.issuedAt')}:</span><bdi dir="auto" className="shrink-0 text-end tabular-nums">{formatDateTime(receipt.issuedAt)}</bdi></p>
                </div>
                {receipt.status === 'Issued' && renderDocActions(receipt.id)}
              </div>
            </article>
          ))}
        </div>
      )}
        </div>
      </div>

      {showReceiptForm && createPortal((
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setShowReceiptForm(false) }}>
          <div dir={isRtl ? 'rtl' : 'ltr'} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{t('business.accounting.receipts.provider')}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{t('business.accounting.receipts.issue')}</h2>
              </div>
              <button type="button" aria-label={t('common.close')} onClick={() => setShowReceiptForm(false)} disabled={submitting} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>
            {receiptFormContent}
          </div>
        </div>
      ), document.body)}
    </section>
  )
}
