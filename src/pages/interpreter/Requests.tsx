import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import {
  getInterpretationRequests,
  type InterpreterRequestListItem,
  type InterpretationRequestStatus,
} from '@/api/interpreterPortal'
import {
  filterInterpreterRequests,
  hasOtherInterpreterModalities,
  type InterpreterDateFilter,
  type InterpreterModalityFilter,
} from '@/utils/interpreterRequestFilters'

function localDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  const [search, setSearch] = useState('')
  const [modalityFilter, setModalityFilter] = useState<InterpreterModalityFilter>('all')
  const [dateFilter, setDateFilter] = useState<InterpreterDateFilter>('all')
  const [fromDate, setFromDate] = useState(() => localDateValue(new Date()))
  const [toDate, setToDate] = useState(() => localDateValue(new Date()))

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
  }, [t])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const filteredRequests = useMemo(
    () => filterInterpreterRequests(
      requests,
      { modality: modalityFilter, date: dateFilter, search, from: fromDate, to: toDate },
      new Date(),
      i18n.language,
    ),
    [requests, modalityFilter, dateFilter, search, fromDate, toDate, i18n.language],
  )
  const hasOtherModalities = hasOtherInterpreterModalities(requests)
  const hasActiveFilters = modalityFilter !== 'all' || dateFilter !== 'all' || search.trim().length > 0
  const invalidDateRange = dateFilter === 'custom' && fromDate > toDate

  const clearFilters = () => {
    setSearch('')
    setModalityFilter('all')
    setDateFilter('all')
    const today = localDateValue(new Date())
    setFromDate(today)
    setToDate(today)
  }

  return (
    <main dir={i18n.dir()} className="min-w-0">
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

      {!loading && !error && (
        <section
          aria-label={t('interpreter.queueFilters')}
          className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <div className="relative w-full">
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label={t('interpreter.searchLabel')}
              placeholder={t('interpreter.searchPlaceholder')}
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 ps-10 pe-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            {search.length > 0 && (
              <button
                type="button"
                aria-label={t('interpreter.clearSearch')}
                onClick={() => setSearch('')}
                className="absolute end-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <label className="min-w-0 text-xs font-medium text-slate-600 lg:min-w-40">
              {t('interpreter.examinationType')}
              <select
                value={modalityFilter}
                onChange={event => setModalityFilter(event.target.value as InterpreterModalityFilter)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">{t('imaging.filters.all')}</option>
                <option value="xray">{t('imaging.filters.xray')}</option>
                <option value="ultrasound">{t('imaging.filters.ultrasound')}</option>
                {hasOtherModalities && <option value="other">{t('interpreter.otherExaminationTypes')}</option>}
              </select>
            </label>

            <label className="min-w-0 text-xs font-medium text-slate-600 lg:min-w-40">
              {t('interpreter.datePeriod')}
              <select
                value={dateFilter}
                onChange={event => setDateFilter(event.target.value as InterpreterDateFilter)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">{t('interpreter.allDates')}</option>
                <option value="today">{t('workSummary.periodOptions.today')}</option>
                <option value="thisMonth">{t('workSummary.periodOptions.thisMonth')}</option>
                <option value="custom">{t('workSummary.periodOptions.custom')}</option>
              </select>
            </label>

            {dateFilter === 'custom' && (
              <>
                <label className="min-w-0 text-xs font-medium text-slate-600">
                  {t('workSummary.from')}
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate}
                    onChange={event => setFromDate(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="min-w-0 text-xs font-medium text-slate-600">
                  {t('workSummary.to')}
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    onChange={event => setToDate(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </>
            )}

            <div className="flex min-h-10 items-center justify-between gap-3 sm:col-span-2 lg:ms-auto lg:justify-end">
              <p aria-live="polite" className="text-sm font-semibold text-slate-700">
                {t('interpreter.examinationsFound', { count: filteredRequests.length })}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {t('interpreter.clearFilters')}
                </button>
              )}
            </div>
          </div>

          {invalidDateRange && (
            <p role="alert" className="text-sm text-red-700">{t('interpreter.invalidDateRange')}</p>
          )}
        </section>
      )}

      {!loading && !error && requests.length === 0 && !hasActiveFilters && (
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

      {!loading && !error && filteredRequests.length === 0 && (requests.length > 0 || hasActiveFilters) && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileSearch className="h-6 w-6 text-slate-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">{t('interpreter.noMatchingExaminations')}</h2>
        </div>
      )}

      {!loading && !error && filteredRequests.length > 0 && (
        <div className="space-y-3">
          {filteredRequests.map((request, index) => (
            <button
              key={request.id}
              type="button"
              onClick={() => navigate(`/interpreter/requests/${request.id}`)}
              data-testid="interpreter-request-card"
              className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-start shadow-sm transition hover:border-blue-200 hover:shadow-md sm:gap-4 sm:p-5"
            >
              <span
                aria-label={t('interpreter.resultNumber', { number: index + 1 })}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-inset ring-blue-100"
              >
                {index + 1}
              </span>
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
    </main>
  )
}

