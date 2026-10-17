import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, CircleDollarSign, Loader2, ShieldCheck } from 'lucide-react'
import { getPublicPaymentConfirmation, submitPublicPaymentConfirmation } from '@/api/paymentConfirmations'
import type { PublicPaymentConfirmation, PublicPaymentConfirmationSubmission } from '@/api/paymentConfirmations'

export default function PaymentConfirmationPage() {
  const { token = '' } = useParams<{ token: string }>()
  const { t, i18n } = useTranslation()
  const [details, setDetails] = useState<PublicPaymentConfirmation | null>(null)
  const [submitted, setSubmitted] = useState<PublicPaymentConfirmationSubmission | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logoFailed, setLogoFailed] = useState(false)

  const language = typeof i18n.resolvedLanguage === 'string' && i18n.resolvedLanguage
    ? i18n.resolvedLanguage
    : typeof i18n.language === 'string' && i18n.language
      ? i18n.language
      : 'en'
  const isRtl = language.startsWith('he') || language.startsWith('ar')
  const currencyFormatter = (currencyCode?: string | null) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode && ['ILS', 'USD', 'EUR'].includes(currencyCode.toUpperCase()) ? currencyCode.toUpperCase() : 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  useEffect(() => {
    const previousReferrerPolicy = document.querySelector('meta[name="referrer"]')?.getAttribute('content')
    let referrerMeta = document.querySelector<HTMLMetaElement>('meta[name="referrer"]')
    if (!referrerMeta) {
      referrerMeta = document.createElement('meta')
      referrerMeta.name = 'referrer'
      document.head.appendChild(referrerMeta)
    }
    referrerMeta.content = 'no-referrer'
    return () => {
      if (previousReferrerPolicy) referrerMeta?.setAttribute('content', previousReferrerPolicy)
      else referrerMeta?.remove()
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    if (!token.trim() || ['undefined', 'null'].includes(token.trim().toLowerCase())) {
      setError('paymentConfirmation.unavailable')
      setLoading(false)
      return () => { active = false }
    }
    getPublicPaymentConfirmation(token)
      .then((response) => {
        if (!active) return
        setDetails(response)
        setAmount(String(response.requestedAmount ?? response.currentRemaining))
        const savedPublicLanguage = localStorage.getItem('paymentConfirmationLanguage')
        if (!savedPublicLanguage) {
          const defaultLanguage = typeof response.defaultLanguage === 'string' ? response.defaultLanguage : 'en'
          const preferredLanguage = defaultLanguage.startsWith('he')
            ? 'he'
            : defaultLanguage.startsWith('ar')
              ? 'ar'
              : 'en'
          void i18n.changeLanguage(preferredLanguage)
        } else {
          void i18n.changeLanguage(savedPublicLanguage)
        }
      })
      .catch((loadError) => {
        console.error('Unable to load public payment confirmation:', loadError)
        if (active) setError('paymentConfirmation.unavailable')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, i18n])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!details) return
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('paymentConfirmation.invalidAmount')
      return
    }
    if (Number(amount) > details.currentRemaining) {
      setError('paymentConfirmation.amountExceedsRemaining')
      return
    }
    if (!paymentDate) {
      setError('paymentConfirmation.paymentDateRequired')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await submitPublicPaymentConfirmation(token, {
        amountPaid: Number(amount),
        paymentDate,
        reference,
        proofFile,
      })
      setSubmitted(response)
    } catch (submitError) {
      console.error('Unable to submit public payment confirmation:', submitError)
      setError('paymentConfirmation.submitError')
    } finally {
      setSaving(false)
    }
  }

  const formatMoney = (value?: number | null) => currencyFormatter(details?.currencyCode).format(typeof value === 'number' && Number.isFinite(value) ? value : 0)
  const businessName = typeof details?.businessName === 'string'
    && details.businessName.trim().length > 0
    && !['undefined', 'default tenant'].includes(details.businessName.trim().toLowerCase())
    ? details.businessName.trim()
    : 'Clienta'
  const safeBusinessLogoUrl = (() => {
    const configuredLogo = typeof details?.businessLogoUrl === 'string' ? details.businessLogoUrl.trim() : ''
    if (!configuredLogo) return null
    try {
      const logoUrl = new URL(configuredLogo, window.location.origin)
      return logoUrl.protocol === 'http:' || logoUrl.protocol === 'https:' ? logoUrl.toString() : null
    } catch {
      return null
    }
  })()
  useEffect(() => setLogoFailed(false), [safeBusinessLogoUrl])
  const safeProjectName = typeof details?.projectName === 'string' && details.projectName.trim().length > 0
    ? details.projectName.trim()
    : null
  const safeInvoiceNumber = typeof details?.invoiceNumber === 'string' ? details.invoiceNumber.trim() : ''
  const canSubmit = details?.requestState === 'Active' && details.currentRemaining > 0 && !submitted
  const paymentDescriptions = Array.isArray(details?.paymentDescriptions)
    ? details.paymentDescriptions.filter((description): description is string => typeof description === 'string' && description.trim().length > 0)
    : []
  const paymentPurpose = paymentDescriptions.length > 0
    ? paymentDescriptions.join('\n')
    : safeProjectName || safeInvoiceNumber
  const expiresOn = typeof details?.expiresAt === 'string' && !Number.isNaN(new Date(details.expiresAt).getTime())
    ? new Date(details.expiresAt).toLocaleDateString(language)
    : null
  const changePublicLanguage = (locale: 'he' | 'ar' | 'en') => {
    localStorage.setItem('paymentConfirmationLanguage', locale)
    void i18n.changeLanguage(locale)
  }

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-5 flex justify-end">
          <div role="group" aria-label={t('paymentConfirmation.language')} className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-sm">
            {(['he', 'ar', 'en'] as const).map((locale) => (
              <button key={locale} type="button" onClick={() => changePublicLanguage(locale)} aria-pressed={language.startsWith(locale)} className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${language.startsWith(locale) ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {locale === 'he' ? 'עברית' : locale === 'ar' ? 'العربية' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-6 text-center sm:px-8">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary-50 text-primary-700">
              {safeBusinessLogoUrl && !logoFailed ? <img src={safeBusinessLogoUrl} alt={businessName} referrerPolicy="no-referrer" className="h-full w-full object-contain p-1" onError={() => setLogoFailed(true)} /> : <CircleDollarSign className="h-8 w-8" />}
            </div>
            <p className="break-words text-base font-bold text-slate-900">{businessName}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{t('paymentConfirmation.title')}</h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{t('paymentConfirmation.subtitle')}</p>
          </header>
          <div className="p-5 sm:p-8">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{t('paymentConfirmation.loading')}</div>
          ) : error && !details ? (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t(error)}</p>
          ) : details ? (
            <>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white">
                {safeProjectName && <PublicDetail label={t('paymentConfirmation.project')} value={safeProjectName} />}
                <PublicDetail label={t('paymentConfirmation.invoice')} value={safeInvoiceNumber} ltr />
                <PublicDetail label={t('paymentConfirmation.for')} value={paymentPurpose} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {details.requestedAmount != null && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-800">{t('paymentConfirmation.requestedAmount')}</p>
                    <p dir="ltr" className="mt-1 text-2xl font-bold tabular-nums text-blue-950">{formatMoney(details.requestedAmount)}</p>
                  </div>
                )}
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-medium text-amber-800">{t('paymentConfirmation.remaining')}</p>
                  <p dir="ltr" className="mt-1 text-2xl font-bold tabular-nums text-amber-950">{formatMoney(details.currentRemaining)}</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{t('paymentConfirmation.bankTransfer')}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('paymentConfirmation.bankTransferInstructions')}</p>
              </div>

              {submitted || details.requestState === 'Submitted' ? (
                <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div>
                      <p className="font-semibold text-emerald-900">{t(details.submissionState === 'Processed' ? 'paymentConfirmation.alreadyProcessed' : 'paymentConfirmation.alreadySubmitted')}</p>
                      <p className="mt-1 text-sm text-emerald-800">{t(details.submissionState === 'Processed' ? 'paymentConfirmation.alreadyProcessedDescription' : 'paymentConfirmation.alreadySubmittedDescription')}</p>
                      {submitted && <p className="mt-2 text-sm font-medium text-emerald-900">{t('paymentConfirmation.reportedAmount')}: {formatMoney(submitted.submittedAmount)}</p>}
                    </div>
                  </div>
                </div>
              ) : canSubmit ? (
                <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    <span>{t('paymentConfirmation.amountPaid')}</span>
                    <input required type="number" min="0.01" max={details.currentRemaining} step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setError('') }} className="input w-full" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    <span>{t('paymentConfirmation.paymentDate')}</span>
                    <input required type="date" value={paymentDate} onChange={(event) => { setPaymentDate(event.target.value); setError('') }} className="input w-full" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    <span>{t('paymentConfirmation.reference')}</span>
                    <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={200} className="input w-full" />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                    <span>{t('paymentConfirmation.uploadProof')}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                      onChange={(event) => {
                        const selected = event.target.files?.[0] ?? null
                        if (selected && (!['application/pdf', 'image/jpeg', 'image/png'].includes(selected.type) || selected.size > 5 * 1024 * 1024)) {
                          setProofFile(null)
                          event.target.value = ''
                          setError('paymentConfirmation.invalidProof')
                          return
                        }
                        setProofFile(selected)
                        setError('')
                      }}
                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:me-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                    />
                    <span className="block text-xs font-normal text-slate-500">{proofFile ? proofFile.name : t('paymentConfirmation.proofOptional')}</span>
                  </label>
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t('paymentConfirmation.pendingNotice')}
                  </p>
                  {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{t(error)}</p>}
                  <button disabled={saving || Number(amount) <= 0 || Number(amount) > details.currentRemaining} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? t('common.saving') : t('paymentConfirmation.submit')}
                  </button>
                  {expiresOn && <p className="text-center text-xs text-slate-500">{t('paymentConfirmation.expiry', { date: expiresOn })}</p>}
                </form>
              ) : details.currentRemaining <= 0 ? (
                <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
                  {t('paymentConfirmation.fullyPaidNoRequest')}
                </p>
              ) : (
                <p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                  {t('paymentConfirmation.unavailable')}
                </p>
              )}
            </>
          ) : null}
          </div>
        </section>
        <p className="mt-5 text-center text-xs text-slate-400">{t('paymentConfirmation.secureNotice')}</p>
      </div>
    </main>
  )
}

function PublicDetail({ label, value, ltr = false }: { label: string; value?: string | null; ltr?: boolean }) {
  if (!value?.trim()) return null
  return (
    <div className="grid grid-cols-[minmax(6rem,0.7fr)_minmax(0,1.3fr)] gap-3 px-4 py-3.5 sm:px-5">
      <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
      <p dir={ltr ? 'ltr' : 'auto'} className={`min-w-0 whitespace-pre-line break-words text-sm font-semibold text-slate-900 sm:text-base ${ltr ? 'text-left' : ''}`}>{value}</p>
    </div>
  )
}
