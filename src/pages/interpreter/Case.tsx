import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Hash,
  Loader2,
  RefreshCw,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import {
  completeInterpretation,
  getInterpretationCase,
  getInterpretationPdf,
  getInstanceFile,
  getInstanceAnnotations,
  getReferral,
  saveInterpretationReport,
  type InterpreterCase as InterpreterCaseData,
} from '@/api/interpreterPortal'
import type { ImagingInstanceDetail, ImagingSeriesDetail, ImagingStudyHierarchy } from '@/api/imaging'
import PdfViewerModal from '@/components/PdfViewerModal'

const DicomViewer = lazy(() => import('@/components/imaging/DicomViewer'))
function formatDate(value: string, language: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function statusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case 'Pending':
      return t('interpreter.status.pending')
    case 'InProgress':
      return t('interpreter.status.inProgress')
    case 'Completed':
      return t('interpreter.status.completed')
    default:
      return status
  }
}

function InterpretationStatus({
  status,
  completedAt,
  t,
  language,
}: {
  status: string
  completedAt: string | null
  t: (key: string) => string
  language: string
}) {
  const isCompleted = status === 'Completed'
  const isInProgress = status === 'InProgress'
  const label = isCompleted
    ? t('interpreter.completed')
    : isInProgress
      ? t('interpreter.status.inProgress')
      : t('interpreter.status.pending')
  const colors = isCompleted
    ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
    : isInProgress
      ? 'border-blue-200 bg-blue-50/80 text-blue-800'
      : 'border-amber-200 bg-amber-50/80 text-amber-800'

  return (
    <section className={`rounded-xl border p-4 shadow-sm ${colors}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
          isCompleted ? 'bg-emerald-600 text-white' : isInProgress ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {isCompleted ? <CheckCircle2 className="h-7 w-7" /> : <Loader2 className="h-6 w-6" />}
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="text-xs font-medium opacity-70">{t('interpreter.statusLabel')}</div>
          <div className="text-xl font-bold">{label}</div>
          {isCompleted && completedAt && (
            <div className="mt-1 text-sm opacity-80">{t('interpreter.completedAt')} {formatDate(completedAt, language)}</div>
          )}
        </div>
      </div>
    </section>
  )
}

export default function InterpreterCase() {
  const navigate = useNavigate()
  const { requestId } = useParams<{ requestId: string }>()
  const { t, i18n } = useTranslation()

  const [caseData, setCaseData] =
    useState<InterpreterCaseData | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reportContent, setReportContent] = useState('')
  const [savingReport, setSavingReport] = useState(false)
  const [completingReport, setCompletingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  const [openingReferral, setOpeningReferral] = useState(false)
  const [referralError, setReferralError] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false)

  const loadCase = useCallback(async () => {
    if (!requestId) {
      setError(t('interpreter.caseLoadError'))
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data = await getInterpretationCase(requestId)
      setCaseData(data)
      setReportContent(data.report?.content ?? '')
      setReportMessage(null)
      setReportError(null)
    } catch (err) {
      console.error('Failed to load interpreter case', err)
      setCaseData(null)
      setError(t('interpreter.caseLoadError'))
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    void loadCase()
  }, [loadCase])

  const handleOpenReferral = async () => {
    if (!requestId || !caseData?.referral || openingReferral) {
      return
    }

    const newWindow = window.open('', '_blank')

    try {
      setOpeningReferral(true)
      setReferralError(null)

      const blob = await getReferral(requestId)
      const objectUrl = URL.createObjectURL(blob)

      if (newWindow) {
        newWindow.location.href = objectUrl
      } else {
        window.open(objectUrl, '_blank')
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 60_000)
    } catch (err) {
      console.error('Failed to open referral', err)

      if (newWindow) {
        newWindow.close()
      }

      setReferralError(t('interpreter.referralError'))
    } finally {
      setOpeningReferral(false)
    }
  }

  const handleSaveReport = async () => {
    if (!requestId || savingReport) {
      return
    }

    try {
      setSavingReport(true)
      setReportMessage(null)
      setReportError(null)

      const report = await saveInterpretationReport(
        requestId,
        reportContent
      )

      setCaseData((current) =>
        current
          ? {
              ...current,
              status:
                current.status === 'Pending'
                  ? 'InProgress'
                  : current.status,
              report,
            }
          : current
      )

      setReportMessage(t('interpreter.draftSaved'))
    } catch (err) {
      console.error('Failed to save interpretation report', err)
      setReportError(t('interpreter.saveError'))
    } finally {
      setSavingReport(false)
    }
  }

  const handleCompleteReport = async () => {
    if (!requestId || savingReport || completingReport) {
      return
    }

    if (!reportContent.trim()) {
      setReportMessage(null)
      setReportError(t('interpreter.reportRequired'))
      return
    }

    try {
      setCompletingReport(true)
      setReportMessage(null)
      setReportError(null)

      const report = await saveInterpretationReport(
        requestId,
        reportContent
      )

      const completed = await completeInterpretation(requestId)

      setCaseData((current) =>
        current
          ? {
              ...current,
              status: completed.status,
              startedAt: completed.startedAt,
              completedAt: completed.completedAt,
              report,
              hasFinalPdf: true,
            }
          : current
      )

      setReportMessage(t('interpreter.completedSuccessfully'))
    } catch (err) {
      console.error('Failed to complete interpretation', err)
      setReportError(t('interpreter.completeError'))
    } finally {
      setCompletingReport(false)
    }
  }

  const handleViewPdf = async () => {
    if (!requestId || !caseData?.hasFinalPdf || pdfLoading) return

    try {
      setPdfLoading(true)
      setPdfError(null)
      setIsPdfViewerOpen(true)
      setPdfBlob(await getInterpretationPdf(requestId))
    } catch (err) {
      console.error('Failed to load interpretation PDF', err)
      setPdfError('לא ניתן היה להציג את קובץ ה-PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!requestId || !caseData?.hasFinalPdf || pdfLoading) return

    try {
      setPdfLoading(true)
      setPdfError(null)
      const blob = await getInterpretationPdf(requestId, true)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `interpretation-${caseData.accessionNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download interpretation PDF', err)
      setPdfError('לא ניתן היה להוריד את קובץ ה-PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  const viewerSeries = useMemo<ImagingSeriesDetail[]>(() => {
    if (!caseData) {
      return []
    }

    return caseData.series.map((series) => ({
      id: series.id,
      seriesInstanceUID: series.seriesInstanceUID,
      modality: series.modality,
      seriesNumber: series.seriesNumber,
      seriesDescription: series.seriesDescription,
      createdAt: caseData.receivedAt,
      instances: series.instances.map(
        (instance): ImagingInstanceDetail => ({
          id: instance.id,
          sopInstanceUID: instance.sopInstanceUID,
          sopClassUID: instance.sopClassUID,
          instanceNumber: instance.instanceNumber,
          fileSizeBytes: instance.fileSizeBytes,
          storageStatus: 'LocalAndS3',
          modality: series.modality,
          receivedAt: caseData.receivedAt,
        })
      ),
    }))
  }, [caseData])

  const viewerInstances = useMemo(
    () => viewerSeries.flatMap((series) => series.instances),
    [viewerSeries]
  )

  const viewerStudy = useMemo<ImagingStudyHierarchy | null>(() => {
    if (!caseData) {
      return null
    }

    return {
      id: caseData.imagingStudyId,
      imagingOrderId: caseData.imagingOrderId,
      accessionNumber: caseData.accessionNumber,
      studyInstanceUID: caseData.studyInstanceUID,
      modality: caseData.modality,
      status: caseData.studyStatus,
      receivedAt: caseData.receivedAt,
      storageStatus: 'LocalAndS3',
      createdAt: caseData.receivedAt,
      series: viewerSeries,
    }
  }, [caseData, viewerSeries])
  const totalInstances = useMemo(
    () =>
      caseData?.series.reduce(
        (total, series) => total + series.instances.length,
        0
      ) ?? 0,
    [caseData]
  )

  if (loading) {
    return (
      <div
        dir={i18n.dir()}
        className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm"
      >
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />

        <p className="mt-3 text-sm text-slate-500">
          {t('interpreter.loadingCase')}
        </p>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div dir={i18n.dir()}>
        <button
          type="button"
          onClick={() => navigate('/interpreter/requests')}
          className="mb-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowRight className="h-4 w-4" />
          {t('interpreter.backToRequests')}
        </button>

        <div className="rounded-xl border border-red-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h2 className="font-semibold text-slate-900">
            {t('interpreter.caseLoadError')}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void loadCase()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            {t('interpreter.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div dir={i18n.dir()} className="min-h-full text-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/interpreter/requests')}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <ArrowRight className="h-4 w-4" />
          {t('interpreter.backToRequests')}
        </button>
        <div className="text-xs text-slate-400">{t('interpreter.currentCase')} · {formatDate(caseData.requestedAt, i18n.language)}</div>
      </div>

      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-600">{t('interpreter.currentCase')}</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">{t('interpreter.examTitle')} ({caseData.modality})</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span>{caseData.clientDisplayName}</span>
            <span className="text-slate-300">|</span>
            <span dir="ltr" className="font-medium text-slate-700">{caseData.accessionNumber}</span>
          </div>
        </div>
        <div className="text-sm text-slate-500">{t('interpreter.seriesImages', { series: caseData.series.length, images: totalInstances })}</div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,20%)]">
        <aside className="order-1 space-y-3 lg:order-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserRound className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold">{t('interpreter.patientDetails')}</h2>
            </div>
            <div className="text-sm">
              <div className="text-[11px] text-slate-400">{t('interpreter.patientName')}</div>
              <div className="mt-1 font-semibold text-slate-900">{caseData.clientDisplayName}</div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold">{t('interpreter.referral')}</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[11px] text-slate-400">{t('interpreter.referringDoctor')}</div>
                <div className="mt-1 font-semibold">{caseData.referringDoctorName || t('interpreter.notSpecified')}</div>
              </div>
              {caseData.referral ? (
                <div className="border-t border-slate-100 pt-3">
                  <div className="truncate font-medium text-slate-800">{caseData.referral.fileName}</div>
                  <div className="mt-1 text-xs text-slate-500">{(caseData.referral.fileSize / 1024).toFixed(1)} KB</div>
                  <button
                    type="button"
                    onClick={() => void handleOpenReferral()}
                    disabled={openingReferral}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-60"
                  >
                    {openingReferral && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {openingReferral ? t('interpreter.openingReferral') : t('interpreter.viewReferral')}
                  </button>
                  {referralError && <div className="mt-2 text-xs text-red-600">{referralError}</div>}
                </div>
              ) : <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">{t('interpreter.noReferral')}</div>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Hash className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold">{t('interpreter.examDetails')}</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-[11px] text-slate-400">{t('interpreter.accessionNumber')}</dt><dd dir="ltr" className="mt-1 font-semibold">{caseData.accessionNumber}</dd></div>
              <div><dt className="text-[11px] text-slate-400">{t('interpreter.examDate')}</dt><dd className="mt-1 font-semibold">{formatDate(caseData.scheduledStartTime, i18n.language)}</dd></div>
              <div><dt className="text-[11px] text-slate-400">{t('interpreter.receivedInSystem')}</dt><dd className="mt-1 font-semibold">{formatDate(caseData.receivedAt, i18n.language)}</dd></div>
              <div><dt className="text-[11px] text-slate-400">{t('interpreter.studyId')}</dt><dd dir="ltr" className="mt-1 truncate text-xs text-slate-600">{caseData.studyInstanceUID}</dd></div>
            </dl>
          </section>
        </aside>

        <main className="order-2 min-w-0 space-y-4 lg:order-1">
          <InterpretationStatus
            status={caseData.status}
            completedAt={caseData.completedAt}
            t={t}
            language={i18n.language}
          />

          <div className="min-w-0 space-y-4">
            <section className="min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 px-1 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold">{t('interpreter.dicomViewer')}</h2>
                </div>
                <span className="text-xs text-slate-500">{t('interpreter.seriesImages', { series: caseData.series.length, images: totalInstances })}</span>
              </div>
              <div className="min-w-0 w-full max-w-full overflow-hidden">
              {viewerInstances.length > 0 && viewerStudy ? (
                <Suspense fallback={<div className="flex min-h-72 items-center justify-center rounded-lg bg-slate-950"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div>}>
                  <DicomViewer
                    instances={viewerInstances}
                    series={viewerSeries}
                    study={viewerStudy}
                    readOnly
                    canViewAnnotations
                    allowLocalAnnotations
                    loadInstanceFile={(instanceId) => getInstanceFile(caseData.requestId, instanceId)}
                    loadInstanceAnnotations={(instanceId, frameNumber) =>
                      getInstanceAnnotations(caseData.requestId, instanceId, frameNumber)
                    }
                  />
                </Suspense>
              ) : (
                <div className="flex min-h-72 items-center justify-center rounded-lg bg-slate-950 p-6 text-center">
                  <div><Stethoscope className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm text-slate-400">{t('interpreter.dicomViewer')}</p><p className="mt-1 text-xs text-slate-600">{t('interpreter.noImages')}</p></div>
                </div>
              )}
              </div>
            </section>

            <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="font-bold text-slate-950">{t('interpreter.reportTitle')}</h2>
                <p className="mt-1 text-xs text-slate-500">{t('interpreter.reportSubtitle')}</p>
              </div>
              <div className="p-4">
                <textarea
                  rows={viewerInstances.length > 0 ? 16 : 10}
                  value={reportContent}
                  onChange={(event) => { setReportContent(event.target.value); setReportMessage(null); setReportError(null) }}
                  placeholder={t('interpreter.reportPlaceholder')}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void handleSaveReport()} disabled={savingReport} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {savingReport && <Loader2 className="h-4 w-4 animate-spin" />}{savingReport ? t('interpreter.saving') : t('interpreter.saveDraft')}
                  </button>
                  {caseData.status !== 'Completed' && <button type="button" onClick={() => void handleCompleteReport()} disabled={savingReport || completingReport} className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {completingReport && <Loader2 className="h-4 w-4 animate-spin" />}{completingReport ? t('interpreter.completing') : t('interpreter.complete')}
                  </button>}
                </div>
                {caseData.status === 'Completed' && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{t('interpreter.completed')}</div>}
                {caseData.status === 'Completed' && caseData.hasFinalPdf && <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleViewPdf()} disabled={pdfLoading} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"><Eye className="h-4 w-4" />צפייה ב-PDF</button>
                  <button type="button" onClick={() => void handleDownloadPdf()} disabled={pdfLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><Download className="h-4 w-4" />הורדת PDF</button>
                </div>}
                {reportMessage && <div className="mt-3 text-sm text-emerald-600">{reportMessage}</div>}
                {reportError && <div className="mt-3 text-sm text-red-600">{reportError}</div>}
                {pdfError && <div className="mt-3 text-sm text-red-600">{pdfError}</div>}
              </div>
            </section>
          </div>
        </main>
      </div>
      <PdfViewerModal
        isOpen={isPdfViewerOpen}
        blob={pdfBlob}
        loading={pdfLoading}
        error={pdfError}
        title="פענוח בדיקת אולטרסאונד"
        onClose={() => { setIsPdfViewerOpen(false); setPdfBlob(null); setPdfError(null) }}
      />
    </div>
  )
}




