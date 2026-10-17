import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Ban, Pencil, Plus, X } from 'lucide-react'
import { cancelPayment, createInvoicePayment, getInvoicePayments, updatePayment } from '@/api/payments'
import type { CreatePaymentRequest, InvoicePaymentSummary, Payment, PaymentMethod } from '@/api/payments'
import { buildPaymentConfirmationUrl, createPaymentConfirmation, getInvoicePaymentConfirmations, getPaymentConfirmationProof, PaymentConfirmationAuthorizationError, rejectPaymentConfirmation, verifyPaymentConfirmation } from '@/api/paymentConfirmations'
import type { PaymentConfirmationCreated, PaymentConfirmationDetails } from '@/api/paymentConfirmations'
import type { Invoice } from '@/api/invoices'
import { useTenant } from '@/contexts/TenantContext'

type Props = { invoice: Invoice; canManage?: boolean }

const methods: PaymentMethod[] = ['cash', 'credit', 'bank_transfer', 'check', 'bit', 'paybox', 'other']
const paymentStatusClasses: Record<Payment['status'], string> = {
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PendingVerification: 'border-amber-200 bg-amber-50 text-amber-800',
  Rejected: 'border-red-200 bg-red-50 text-red-800',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-700',
}
const paymentStateClasses: Record<InvoicePaymentSummary['paymentState'], string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  partially_paid: 'border-blue-200 bg-blue-50 text-blue-800',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

const normalizeMethod = (method: string) => method === 'PayBox'
  ? 'paybox'
  : method.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '')

export default function InvoicePaymentsPanel({ invoice, canManage = true }: Props) {
  const { t, i18n } = useTranslation()
  const { tenant } = useTenant()
  const [summary, setSummary] = useState<InvoicePaymentSummary | null>(null)
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmations, setConfirmations] = useState<PaymentConfirmationDetails[]>([])
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestAmount, setRequestAmount] = useState(String(invoice.finalAmountToPay ?? invoice.totalAmount))
  const [requestExpiryDays, setRequestExpiryDays] = useState('7')
  const [requesting, setRequesting] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [proofOpeningId, setProofOpeningId] = useState<string | null>(null)
  const [confirmationReview, setConfirmationReview] = useState<{ confirmation: PaymentConfirmationDetails; action: 'verify' | 'reject' } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [createdConfirmation, setCreatedConfirmation] = useState<PaymentConfirmationCreated | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [actionError, setActionError] = useState('')
  const [form, setForm] = useState<CreatePaymentRequest>({
    amount: invoice.finalAmountToPay ?? invoice.totalAmount,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    reference: '',
    notes: '',
  })

  const language = i18n.resolvedLanguage || i18n.language
  const isRtl = language.startsWith('he') || language.startsWith('ar')
  const locale = language.startsWith('he') ? 'he-IL' : language.startsWith('ar') ? 'ar' : 'en-US'
  const configuredCurrency = (tenant?.currency ?? 'ILS').toUpperCase()
  const currency = configuredCurrency === 'USD' || configuredCurrency === 'EUR' || configuredCurrency === 'ILS'
    ? configuredCurrency
    : 'ILS'
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
  const formatDate = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(locale)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    const [summaryResult, confirmationResult] = await Promise.allSettled([
      getInvoicePayments(invoice.id),
      getInvoicePaymentConfirmations(invoice.id),
    ])
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value)
    else {
      console.error('Failed to load invoice payments:', summaryResult.reason)
      setActionError(t('payments.loadError'))
    }
    if (confirmationResult.status === 'fulfilled') setConfirmations(confirmationResult.value)
    else console.error('Failed to load payment confirmation requests:', confirmationResult.reason)
    setLoading(false)
  }, [invoice.id, t])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving && !cancellingId) setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, saving, cancellingId])

  const remaining = summary?.remainingBalance ?? (invoice.status === 'paid' ? 0 : invoice.finalAmountToPay ?? invoice.totalAmount)
  const maxAmount = editing ? remaining + editing.amount : remaining

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (form.amount <= 0 || form.amount > maxAmount) return
    setSaving(true)
    setActionError('')
    try {
      const next = editing
        ? await updatePayment(editing.id, form)
        : await createInvoicePayment(invoice.id, form)
      setSummary(next)
      setForm((current) => ({ ...current, amount: next.remainingBalance }))
      setEditing(null)
      setShowForm(false)
    } catch (error) {
      console.error('Failed to save payment:', error)
      setActionError(t('payments.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const beginEdit = (payment: Payment) => {
    setActionError('')
    setConfirmingCancelId(null)
    setEditing(payment)
    setForm({
      amount: payment.amount,
      paymentDate: payment.paymentDate.slice(0, 10),
      paymentMethod: normalizeMethod(payment.paymentMethod) as PaymentMethod,
      reference: payment.reference ?? '',
      notes: payment.notes ?? '',
    })
    setShowForm(true)
  }

  const confirmCancel = async (paymentId: string) => {
    setCancellingId(paymentId)
    setActionError('')
    try {
      setSummary(await cancelPayment(paymentId))
      setConfirmingCancelId(null)
    } catch (error) {
      console.error('Failed to cancel payment:', error)
      setActionError(t('payments.cancelError'))
    } finally {
      setCancellingId(null)
    }
  }

  const startRecording = () => {
    setActionError('')
    setEditing(null)
    setForm({
      amount: remaining,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setActionError('')
  }

  const handleCreateConfirmation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number(requestAmount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) return
    setRequesting(true)
    setActionError('')
    setCopiedLink(false)
    try {
      const created = await createPaymentConfirmation(invoice.id, {
        requestedAmount: amount,
        expiresInDays: Number(requestExpiryDays),
      })
      const localPublicUrl = buildPaymentConfirmationUrl(created?.publicToken)
      setCreatedConfirmation({ ...created, publicUrl: localPublicUrl })
      setShowRequestForm(false)
      await refresh()
    } catch (error) {
      console.error('Failed to create payment confirmation request:', error)
      const status = (error as { status?: number } | null)?.status
      if (error instanceof PaymentConfirmationAuthorizationError || status === 401 || status === 403) {
        setActionError(t('paymentConfirmation.createAuthorizationError'))
      } else if (error instanceof Error && error.message === 'Invalid payment confirmation token') {
        setActionError(t('paymentConfirmation.invalidResponseToken'))
      } else {
        setActionError(t('paymentConfirmation.createError'))
      }
    } finally {
      setRequesting(false)
    }
  }

  const copyConfirmationLink = async () => {
    if (!createdConfirmation) return
    try {
      await navigator.clipboard.writeText(createdConfirmation.publicUrl)
      setCopiedLink(true)
    } catch (error) {
      console.error('Failed to copy local payment confirmation link:', error)
      setActionError(t('paymentConfirmation.copyError'))
    }
  }

  const reviewConfirmation = async () => {
    if (!confirmationReview) return
    const { confirmation, action } = confirmationReview
    setReviewingId(confirmation.id)
    setActionError('')
    try {
      if (action === 'verify') await verifyPaymentConfirmation(confirmation.id)
      else await rejectPaymentConfirmation(confirmation.id, rejectionReason)
      await refresh()
      setConfirmationReview(null)
      setRejectionReason('')
    } catch (error) {
      console.error(`Failed to ${action} payment confirmation:`, error)
      setActionError(action === 'verify' ? t('paymentConfirmation.verifyError') : t('paymentConfirmation.rejectError'))
    } finally {
      setReviewingId(null)
    }
  }

  const viewConfirmationProof = async (requestId: string) => {
    const proofWindow = window.open('about:blank', '_blank')
    if (!proofWindow) {
      setActionError(t('paymentConfirmation.proofOpenError'))
      return
    }
    setProofOpeningId(requestId)
    setActionError('')
    try {
      const proof = await getPaymentConfirmationProof(requestId)
      const objectUrl = URL.createObjectURL(proof)
      proofWindow.location.href = objectUrl
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (error) {
      proofWindow.close()
      console.error('Failed to load payment confirmation proof:', error)
      setActionError(t('paymentConfirmation.proofOpenError'))
    } finally {
      setProofOpeningId(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        {t('payments.title')}
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !cancellingId) setOpen(false) }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t('payments.title')}
            dir={isRtl ? 'rtl' : 'ltr'}
            className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[88vh] sm:max-w-4xl sm:rounded-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-7">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900">{t('payments.title')}</h2>
                <p className="mt-1 break-words text-sm text-slate-600">
                  <span dir="ltr" className="inline-block">{invoice.number}</span> · {invoice.clientName}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard label={t('payments.invoiceTotal')} amount={summary?.invoiceTotalPayable ?? invoice.finalAmountToPay ?? invoice.totalAmount} tone="blue" formatCurrency={formatCurrency} />
                <SummaryCard label={t('payments.paid')} amount={summary?.verifiedPaid ?? 0} tone="green" formatCurrency={formatCurrency} />
                <SummaryCard label={t('payments.remaining')} amount={remaining} tone={remaining > 0 ? 'amber' : 'green'} formatCurrency={formatCurrency} />
              </div>

              {summary && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-600">{t('payments.paymentState')}:</span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStateClasses[summary.paymentState]}`}>
                    {t(`payments.paymentStates.${summary.paymentState}`)}
                  </span>
                </div>
              )}

              {actionError && (
                <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {actionError}
                </p>
              )}

              {createdConfirmation && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-900">{t('paymentConfirmation.linkCreated')}</p>
                  <p className="mt-1 text-sm text-emerald-800">{t('paymentConfirmation.linkExpires', { date: new Date(createdConfirmation.expiresAt).toLocaleDateString(locale) })}</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input readOnly dir="ltr" value={createdConfirmation.publicUrl} className="input min-w-0 flex-1 bg-white text-left text-xs" />
                    <button type="button" onClick={() => void copyConfirmationLink()} className="min-h-10 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-100">
                      {copiedLink ? t('paymentConfirmation.copied') : t('paymentConfirmation.copyLink')}
                    </button>
                  </div>
                </div>
              )}

              {showRequestForm && (
                <section className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
                  <h3 className="font-semibold text-slate-900">{t('paymentConfirmation.createTitle')}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t('paymentConfirmation.createDescription')}</p>
                  <form onSubmit={handleCreateConfirmation} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label={t('paymentConfirmation.requestedAmount')}>
                      <input required type="number" min="0.01" max={remaining} step="0.01" value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} className="input w-full" />
                    </FormField>
                    <FormField label={t('paymentConfirmation.expiryDays')}>
                      <select value={requestExpiryDays} onChange={(event) => setRequestExpiryDays(event.target.value)} className="input w-full">
                        {[1, 3, 7, 14, 30].map((days) => <option key={days} value={days}>{t('paymentConfirmation.days', { count: days })}</option>)}
                      </select>
                    </FormField>
                    <div className="flex justify-end gap-2 sm:col-span-2">
                      <button type="button" onClick={() => setShowRequestForm(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">{t('common.cancel')}</button>
                      <button disabled={requesting || Number(requestAmount) <= 0 || Number(requestAmount) > remaining} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {requesting ? t('common.saving') : t('paymentConfirmation.create')}
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {showForm ? (
                <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{editing ? t('payments.edit') : t('payments.record')}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {t('payments.currentRemaining')}: <bdi dir="ltr" className="font-semibold tabular-nums">{formatCurrency(remaining)}</bdi>
                      </p>
                      {editing && (
                        <p className="mt-1 text-xs text-slate-500">
                          {t('payments.editingAmount')}: <bdi dir="ltr" className="tabular-nums">{formatCurrency(editing.amount)}</bdi>
                        </p>
                      )}
                    </div>
                    <button type="button" aria-label={t('common.close')} onClick={closeForm} className="rounded-lg p-2 text-slate-500 hover:bg-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label={t('payments.amount')}>
                      <input required min="0.01" max={maxAmount} step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className="input w-full" />
                    </FormField>
                    <FormField label={t('payments.date')}>
                      <input required type="date" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} className="input w-full" />
                    </FormField>
                    <FormField label={t('payments.paymentMethod')}>
                      <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })} className="input w-full">
                        {methods.map((method) => <option key={method} value={method}>{t(`payments.methods.${method}`)}</option>)}
                      </select>
                    </FormField>
                    <FormField label={t('payments.reference')}>
                      <input value={form.reference ?? ''} onChange={(event) => setForm({ ...form, reference: event.target.value })} className="input w-full" />
                    </FormField>
                    <FormField label={t('payments.notes')} className="sm:col-span-2">
                      <textarea value={form.notes ?? ''} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="input w-full" rows={3} />
                    </FormField>
                    <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                      <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                        {t('common.cancel')}
                      </button>
                      <button disabled={saving || form.amount <= 0 || form.amount > maxAmount} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {saving ? t('common.saving') : t('payments.savePayment')}
                      </button>
                    </div>
                  </form>
                </section>
              ) : (
                <section className="mt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{t('payments.history')}</h3>
                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={invoice.status === 'cancelled' || remaining <= 0}
                          onClick={startRecording}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />{t('payments.record')}
                        </button>
                        {remaining > 0 && invoice.status !== 'cancelled' ? (
                          <button
                            type="button"
                            onClick={() => { setCreatedConfirmation(null); setRequestAmount(String(remaining)); setShowRequestForm((current) => !current) }}
                            className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-50"
                          >
                            <Plus className="h-4 w-4" />{t('paymentConfirmation.sendRequest')}
                          </button>
                        ) : remaining <= 0 ? (
                          <p className="self-center text-xs font-medium text-emerald-700">{t('paymentConfirmation.fullyPaidNoRequest')}</p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {confirmations.length > 0 && (
                    <section className="mb-4 space-y-2.5" aria-label={t('paymentConfirmation.requests')}>
                      <h4 className="text-sm font-semibold text-slate-700">{t('paymentConfirmation.requests')}</h4>
                      {confirmations.map((confirmation) => {
                        const paymentState = confirmation.submittedPaymentStatus || confirmation.status
                        const badgeClass = paymentState === 'Verified'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : paymentState === 'Rejected'
                            ? 'border-red-200 bg-red-50 text-red-800'
                            : paymentState === 'PendingVerification'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-slate-200 bg-slate-100 text-slate-700'
                        return (
                          <article key={confirmation.id} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">
                                  {confirmation.submittedAmount != null ? formatCurrency(confirmation.submittedAmount) : confirmation.requestedAmount != null ? formatCurrency(confirmation.requestedAmount) : '—'}
                                  <span className={`ms-2 inline-flex rounded-full border px-2 py-0.5 align-middle text-xs font-semibold ${badgeClass}`}>
                                    {t(`paymentConfirmation.status.${paymentState}`, t(`paymentConfirmation.status.${confirmation.status}`))}
                                  </span>
                                </p>
                                <p className="mt-1 text-xs text-slate-500">{t('paymentConfirmation.expires')}: {new Date(confirmation.expiresAt).toLocaleDateString(locale)}</p>
                                <p className="mt-1 text-xs text-slate-500">{t('paymentConfirmation.created')}: {new Date(confirmation.createdAt).toLocaleDateString(locale)}</p>
                                {confirmation.projectName && <p className="mt-1 text-xs text-slate-600">{t('paymentConfirmation.project')}: {confirmation.projectName}</p>}
                                {confirmation.hasProof && <p className="mt-1 text-xs font-medium text-blue-700">{t('paymentConfirmation.proofAttached')}</p>}
                                {confirmation.rejectionReason && <p className="mt-1 text-xs text-red-700">{confirmation.rejectionReason}</p>}
                              </div>
                              {canManage && confirmation.hasProof && (
                                <button
                                  type="button"
                                  disabled={proofOpeningId === confirmation.id}
                                  onClick={() => void viewConfirmationProof(confirmation.id)}
                                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                                >
                                  {proofOpeningId === confirmation.id ? t('common.loading') : t('paymentConfirmation.viewProof')}
                                </button>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </section>
                  )}

                  {loading ? (
                    <p className="py-6 text-center text-sm text-slate-500">{t('common.loading')}</p>
                  ) : summary?.payments.length ? (
                    <div className="space-y-2.5">
                      {summary.payments.map((payment) => {
                        const confirmation = confirmations.find((item) => item.submittedPaymentId === payment.id)
                        const isCustomerReported = Boolean(confirmation)
                        const recordedBy = isCustomerReported
                          ? confirmation?.clientName || '—'
                          : payment.createdByName?.trim() || payment.createdByEmail?.trim() || '—'
                        const isConfirmingCancel = confirmingCancelId === payment.id
                        const canReview = canManage && payment.status === 'PendingVerification' && confirmation?.submittedPaymentStatus === 'PendingVerification'
                        return (
                          <article key={payment.id} className="rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50/50 sm:px-4">
                            <div className="grid grid-cols-2 items-center gap-x-3 gap-y-2.5 text-sm sm:grid-cols-[minmax(8rem,1.35fr)_minmax(7rem,1fr)_minmax(8rem,1fr)_auto] sm:gap-4">
                              <PaymentInfo label={t('payments.amount')} orderClass="order-1 sm:order-none">
                                <bdi dir="ltr" className="inline-block text-base font-bold tabular-nums text-slate-950 sm:text-lg">{formatCurrency(payment.amount)}</bdi>
                              </PaymentInfo>
                              <PaymentInfo label={t('payments.date')} orderClass="order-3 sm:order-none">
                                <span dir="ltr" className="inline-block font-medium text-slate-800">{formatDate(payment.paymentDate)}</span>
                              </PaymentInfo>
                              <PaymentInfo label={t('payments.paymentMethod')} orderClass="order-4 min-w-0 sm:order-none">
                                <span className="break-words font-medium text-slate-800">{t(`payments.methods.${normalizeMethod(payment.paymentMethod)}`, payment.paymentMethod)}</span>
                              </PaymentInfo>
                              <PaymentInfo label={t('payments.statusLabel')} orderClass="order-2 justify-self-end sm:order-none sm:justify-self-end">
                                <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-center text-xs font-semibold ${paymentStatusClasses[payment.status]}`}>
                                  {t(`payments.status.${payment.status}`)}
                                </span>
                              </PaymentInfo>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                              <div className="grid min-w-0 grid-cols-1 gap-2 min-[480px]:grid-cols-2">
                                <PaymentInfo label={t('payments.reference')}>
                                  <span dir="auto" className="block break-all font-medium text-slate-800">{payment.reference?.trim() || '—'}</span>
                                </PaymentInfo>
                                <PaymentInfo label={t(isCustomerReported ? 'paymentConfirmation.reportedBy' : 'payments.recordedBy')}>
                                  <span dir="auto" className="block break-words font-medium text-slate-800">{recordedBy}</span>
                                </PaymentInfo>
                                {isCustomerReported && (
                                  <PaymentInfo label={t('paymentConfirmation.source')}>
                                    <span className="block break-words font-medium text-slate-800">{t('paymentConfirmation.sourceConfirmationLink')}</span>
                                  </PaymentInfo>
                                )}
                              </div>

                              {canReview && confirmation ? (
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <button type="button" disabled={reviewingId === confirmation.id} onClick={() => { setRejectionReason(''); setConfirmationReview({ confirmation, action: 'verify' }) }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                                    {t('paymentConfirmation.verify')}
                                  </button>
                                  <button type="button" disabled={reviewingId === confirmation.id} onClick={() => { setRejectionReason(''); setConfirmationReview({ confirmation, action: 'reject' }) }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                                    {t('paymentConfirmation.rejectReport')}
                                  </button>
                                </div>
                              ) : canManage && payment.status === 'Verified' && (
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <button type="button" onClick={() => beginEdit(payment)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100">
                                    <Pencil className="h-3.5 w-3.5" />{t('payments.edit')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setActionError(''); setConfirmingCancelId(isConfirmingCancel ? null : payment.id) }}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                                  >
                                    <Ban className="h-3.5 w-3.5" />{t('payments.cancel')}
                                  </button>
                                </div>
                              )}
                            </div>

                            {isConfirmingCancel && (
                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50/70 p-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">{t('payments.cancelConfirmTitle')}</p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{t('payments.cancelConfirmDescription')}</p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                  <button type="button" disabled={cancellingId === payment.id} onClick={() => setConfirmingCancelId(null)} className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50">
                                    {t('payments.goBack')}
                                  </button>
                                  <button type="button" disabled={cancellingId === payment.id} onClick={() => void confirmCancel(payment.id)} className="min-h-9 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                                    {cancellingId === payment.id ? t('common.saving') : t('payments.cancel')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      {t('payments.noPayments')}
                    </div>
                  )}
                </section>
              )}

              {confirmationReview && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
                  <section role="dialog" aria-modal="true" aria-labelledby="confirmation-review-title" dir={isRtl ? 'rtl' : 'ltr'} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
                    <h3 id="confirmation-review-title" className="text-lg font-bold text-slate-900">
                      {confirmationReview.action === 'verify' ? t('paymentConfirmation.verifyTitle') : t('paymentConfirmation.rejectTitle')}
                    </h3>
                    {confirmationReview.action === 'verify' ? (
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {t('paymentConfirmation.verifyConfirmation', { amount: formatCurrency(confirmationReview.confirmation.submittedAmount ?? 0) })}
                      </p>
                    ) : (
                      <label className="mt-4 block space-y-1.5 text-sm font-medium text-slate-700">
                        <span>{t('paymentConfirmation.rejectionReasonOptional')}</span>
                        <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={500} rows={3} className="input w-full" placeholder={t('paymentConfirmation.rejectionReasonPlaceholder')} />
                      </label>
                    )}
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <button type="button" disabled={reviewingId === confirmationReview.confirmation.id} onClick={() => setConfirmationReview(null)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
                        {t('common.cancel')}
                      </button>
                      <button type="button" disabled={reviewingId === confirmationReview.confirmation.id} onClick={() => void reviewConfirmation()} className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${confirmationReview.action === 'verify' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        {reviewingId === confirmationReview.confirmation.id ? t('common.saving') : confirmationReview.action === 'verify' ? t('paymentConfirmation.verify') : t('paymentConfirmation.rejectReport')}
                      </button>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}

function SummaryCard({
  label,
  amount,
  tone,
  formatCurrency,
}: {
  label: string
  amount: number
  tone: 'blue' | 'green' | 'amber'
  formatCurrency: (amount: number) => string
}) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-800',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  }
  return (
    <div className={`flex min-h-24 flex-col justify-between rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <bdi dir="ltr" className="mt-2 self-start text-xl font-bold tabular-nums sm:text-2xl">{formatCurrency(amount)}</bdi>
    </div>
  )
}

function FormField({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 text-sm font-medium text-slate-700 ${className}`}>
      <span>{label}</span>{children}
    </label>
  )
}

function PaymentInfo({ children, label, orderClass = '' }: { children: ReactNode; label: string; orderClass?: string }) {
  return (
    <div className={`min-w-0 ${orderClass}`}>
      <p className="mb-0.5 text-[11px] font-medium text-slate-500">{label}</p>
      <div className="min-w-0 leading-snug">{children}</div>
    </div>
  )
}