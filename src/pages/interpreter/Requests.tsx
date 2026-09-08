import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  FileSearch,
  Loader2,
  RefreshCw,
  UserRound,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import {
  getInterpretationRequests,
  type InterpreterRequestListItem,
  type InterpretationRequestStatus,
} from '@/api/interpreterPortal'

function statusLabel(status: InterpretationRequestStatus, t: (key: string) => string) {
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

function statusClasses(status: InterpretationRequestStatus) {
  switch (status) {
    case 'Pending':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20'
    case 'InProgress':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20'
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-600/20'
  }
}

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

export default function InterpreterRequests() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [requests, setRequests] = useState<InterpreterRequestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getInterpretationRequests()
      setRequests(data)
    } catch (err) {
      console.error('Failed to load interpreter requests', err)
      setError(t('interpreter.loadError'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  return (
    <div dir={i18n.dir()}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('interpreter.requestsTitle')}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {t('interpreter.requestsGreeting', { name: user?.name || '' })}
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            {t('interpreter.loadingRequests')}
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h2 className="font-semibold text-slate-900">
            {t('interpreter.loadErrorTitle')}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || t('interpreter.loadError')}
          </p>

          <button
            type="button"
            onClick={() => void loadRequests()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            {t('interpreter.tryAgain')}
          </button>
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileSearch className="h-6 w-6 text-slate-500" />
          </div>

          <h2 className="text-base font-semibold text-slate-900">
            {t('interpreter.emptyTitle')}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {t('interpreter.emptyDescription')}
          </p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => (
            <button
              key={request.id}
              type="button"
              onClick={() => navigate(`/interpreter/requests/${request.id}`)}
              className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-start shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    {request.clientDisplayName}
                  </h2>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses(request.status)}`}
                  >
                    {statusLabel(request.status, t)}
                  </span>

                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {request.modality}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4" />
                    {t('interpreter.accessionNumber')}: {request.accessionNumber}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {t('interpreter.received')}: {formatDate(request.requestedAt, i18n.language)}
                  </span>
                </div>
              </div>

              <ChevronLeft className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

