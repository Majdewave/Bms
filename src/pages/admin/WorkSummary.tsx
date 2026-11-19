import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  ScanLine,
} from 'lucide-react'
import {
  correctStaffSession,
  deactivateTechnicianRate,
  deactivateInterpreterRate,
  getTechnicianRates,
  getTechnicianWork,
  getInterpreterRates,
  getInterpreterWork,
  getStaffHours,
  getWorkSummaryOverview,
  setInterpreterRate,
  setTechnicianRate,
  type InterpreterRate,
  type InterpreterWorkSummary,
  type StaffHoursSummary,
  type WorkSummaryOverview,
  type TechnicianRate,
  type TechnicianWorkSummary,
} from '@/api/workSummary'
import { useTenant } from '@/contexts/TenantContext'
import {
  getWorkSummaryRange,
  type WorkSummaryPeriod,
} from '@/utils/workSummaryPeriod'

const localDateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toLocalDateTimeValue = (iso: string) => {
  const date = new Date(iso)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

const formatDateTimeInput = (value: string) => new Date(value).toISOString()

export default function WorkSummaryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { productType } = useTenant()
  const today = localDateValue(new Date())
  const [period, setPeriod] = useState<WorkSummaryPeriod>('today')
  const [customFrom, setCustomFrom] = useState(today)
  const [customTo, setCustomTo] = useState(today)
  const [overview, setOverview] = useState<WorkSummaryOverview | null>(null)
  const [rates, setRates] = useState<InterpreterRate[]>([])
  const [technicianRates, setTechnicianRates] = useState<TechnicianRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [staffDetails, setStaffDetails] = useState<StaffHoursSummary | null>(null)
  const [interpreterDetails, setInterpreterDetails] = useState<InterpreterWorkSummary | null>(null)
  const [technicianDetails, setTechnicianDetails] = useState<TechnicianWorkSummary | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [detailsHighlighted, setDetailsHighlighted] = useState(false)
  const detailsRef = useRef<HTMLElement | null>(null)

  const range = useMemo(
    () => getWorkSummaryRange(period, new Date(), customFrom, customTo),
    [period, customFrom, customTo],
  )
  const selectedMember = overview?.members.find(member => member.userId === selectedUserId) ?? null
  const dir = i18n.dir()
  const locale = i18n.language === 'he' ? 'he-IL' : i18n.language === 'ar' ? 'ar-EG' : 'en-US'

  const loadOverview = useCallback(async () => {
    if (!range) {
      setOverview(null)
      setError(t('workSummary.invalidDateRange'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [summary, loadedRates, loadedTechnicianRates] = await Promise.all([
        getWorkSummaryOverview(range.fromUtc, range.toUtc),
        getInterpreterRates(),
        getTechnicianRates(),
      ])
      setOverview(summary)
      setRates(loadedRates)
      setTechnicianRates(loadedTechnicianRates)
      setSelectedUserId(current =>
        summary.members.some(member => member.userId === current) ? current : '',
      )
    } catch {
      setError(t('workSummary.overviewLoadError'))
    } finally {
      setLoading(false)
    }
  }, [range, t])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    if (!range || !selectedMember) {
      setStaffDetails(null)
      setInterpreterDetails(null)
      setTechnicianDetails(null)
      setDetailsError('')
      setDetailsLoading(false)
      return
    }

    let active = true
    setDetailsLoading(true)
    setDetailsError('')
    const loadDetails = async () => {
      try {
        if (selectedMember.role === 'Staff') {
          const result = await getStaffHours(selectedMember.userId, range.fromUtc, range.toUtc)
          if (active) {
            setStaffDetails(result)
            setInterpreterDetails(null)
          }
        } else {
          if (selectedMember.role === 'Interpreter') {
            const result = await getInterpreterWork(selectedMember.userId, range.fromUtc, range.toUtc)
            if (active) {
              setInterpreterDetails(result)
              setTechnicianDetails(null)
              setStaffDetails(null)
            }
          } else {
            const result = await getTechnicianWork(selectedMember.userId, range.fromUtc, range.toUtc)
            if (active) {
              setTechnicianDetails(result)
              setInterpreterDetails(null)
              setStaffDetails(null)
            }
          }
        }
      } catch {
        if (active) setDetailsError(t('workSummary.detailsLoadError'))
      } finally {
        if (active) setDetailsLoading(false)
      }
    }

    void loadDetails()
    return () => { active = false }
  }, [range, selectedMember?.role, selectedMember?.userId, t])

  useEffect(() => {
    const details = detailsRef.current
    if (!selectedUserId || !details) return

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    details.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    setDetailsHighlighted(true)

    const timeout = window.setTimeout(() => setDetailsHighlighted(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [selectedUserId, selectedMember?.userId])

  const formatMinutes = (minutes: number) =>
    `${Math.floor(minutes / 60)} ${t('workSummary.hoursShort')} ${minutes % 60} ${t('workSummary.minutesShort')}`

  const formatMoney = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
    } catch {
      return `${amount.toFixed(2)} ${currency}`
    }
  }

  const formatMemberPayable = (member: NonNullable<WorkSummaryOverview>['members'][number]) =>
    member.payableByCurrency.length === 0
      ? t('workSummary.notConfigured')
      : member.payableByCurrency.map(total => formatMoney(total.amount, total.currency)).join(' · ')

  const saveCorrection = async (sessionId: string, clockInAt: string, clockOutAt: string, reason: string) => {
    if (!selectedMember || !range || !reason.trim() || !clockInAt || !clockOutAt) return
    if (new Date(clockOutAt) <= new Date(clockInAt)) {
      setActionMessage(t('workSummary.invalidCorrectionRange'))
      return
    }

    setSaving(true)
    setActionMessage('')
    try {
      await correctStaffSession(
        selectedMember.userId,
        sessionId,
        formatDateTimeInput(clockInAt),
        formatDateTimeInput(clockOutAt),
        reason.trim(),
      )
      setActionMessage(t('workSummary.correctionSaved'))
      await loadOverview()
      setStaffDetails(await getStaffHours(selectedMember.userId, range.fromUtc, range.toUtc))
    } catch {
      setActionMessage(t('workSummary.correctionError'))
    } finally {
      setSaving(false)
    }
  }

  const updateRate = async (modality: 'XRay' | 'US', amountValue: string) => {
    if (!selectedMember ||
      (selectedMember.role !== 'Interpreter' && selectedMember.role !== 'Technician') ||
      amountValue.trim() === '') return
    const amount = Number(amountValue)
    if (!Number.isFinite(amount) || amount < 0) {
      setActionMessage(t('workSummary.invalidRate'))
      return
    }

    setSaving(true)
    setActionMessage('')
    try {
      if (selectedMember.role === 'Technician') {
        const updated = await setTechnicianRate(selectedMember.userId, modality, amount)
        setTechnicianRates(previous => [
          ...previous.filter(rate => !(rate.technicianUserId === updated.technicianUserId &&
            rate.modality === updated.modality && rate.isActive)),
          updated,
        ])
      } else {
        const updated = await setInterpreterRate(selectedMember.userId, modality, amount)
        setRates(previous => [
          ...previous.filter(rate => !(rate.interpreterUserId === updated.interpreterUserId &&
            rate.modality === updated.modality && rate.isActive)),
          updated,
        ])
      }
      setActionMessage(t('workSummary.rateSaved'))
    } catch {
      setActionMessage(t('workSummary.rateError'))
    } finally {
      setSaving(false)
    }
  }

  const deactivateRate = async (rateId: string) => {
    setSaving(true)
    setActionMessage('')
    try {
      if (selectedMember?.role === 'Technician') {
        await deactivateTechnicianRate(rateId)
        setTechnicianRates(previous => previous.map(rate => rate.id === rateId ? { ...rate, isActive: false } : rate))
      } else {
        await deactivateInterpreterRate(rateId)
        setRates(previous => previous.map(rate => rate.id === rateId ? { ...rate, isActive: false } : rate))
      }
      setActionMessage(t('workSummary.rateDeactivated'))
    } catch {
      setActionMessage(t('workSummary.rateError'))
    } finally {
      setSaving(false)
    }
  }

  const backPath = productType === 'business' ? '/business/team' : '/admin/staff'

  return (
    <main dir={dir} className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
          >
            {dir === 'rtl'
              ? <ArrowRight aria-hidden="true" className="h-4 w-4" />
              : <ArrowLeft aria-hidden="true" className="h-4 w-4" />}
            {t('workSummary.back')}
          </button>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{t('workSummary.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('workSummary.subtitle')}</p>
        </div>
      </header>

      <section aria-label={t('workSummary.period')} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(['today', 'thisMonth', 'custom'] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                period === value ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t(`workSummary.periodOptions.${value}`)}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-xl">
            <label className="text-sm font-medium text-slate-700">
              {t('workSummary.from')}
              <input
                type="date"
                value={customFrom}
                onChange={event => setCustomFrom(event.target.value)}
                className="input mt-1 w-full"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('workSummary.to')}
              <input
                type="date"
                value={customTo}
                onChange={event => setCustomTo(event.target.value)}
                className="input mt-1 w-full"
              />
            </label>
          </div>
        )}
      </section>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">{t('workSummary.loading')}</p>
      ) : overview && (
        <>
          <section aria-label={t('workSummary.overview')} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label={t('workSummary.members')} value={overview.memberCount} />
            <SummaryCard label={t('workSummary.completedSessions')} value={overview.completedSessions} />
            <SummaryCard label={t('workSummary.totalWorked')} value={formatMinutes(overview.totalWorkedMinutes)} detail={`${overview.workingDays} ${t('workSummary.workingDays').toLowerCase()}`} />
            <SummaryCard
              label={t('workSummary.interpretations')}
              value={overview.totalInterpretations}
              detail={`${overview.interpretationsWithRate} ${t('workSummary.withRate').toLowerCase()} · ${overview.interpretationsWithoutRate} ${t('workSummary.withoutRate').toLowerCase()}`}
            />
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-slate-600">{t('workSummary.payableTotal')}</h2>
              {overview.payableByCurrency.length === 0
                ? <p className="mt-2 text-lg font-semibold text-slate-900">{t('workSummary.notConfigured')}</p>
                : overview.payableByCurrency.map(total => (
                    <p key={total.currency} className="mt-2 text-lg font-semibold text-slate-900">
                      {formatMoney(total.amount, total.currency)}
                    </p>
                  ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold text-slate-900">{t('workSummary.teamSummary')}</h2>
            </div>
            {overview.members.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">{t('workSummary.noMembers')}</p>
            ) : (
              <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-start text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('workSummary.name')}</th>
                      <th className="px-4 py-3 text-start">{t('workSummary.role')}</th>
                      <th className="px-4 py-3 text-start">{t('workSummary.worked')}</th>
                      <th className="px-4 py-3 text-start">{t('workSummary.completedWorkCount')}</th>
                      <th className="px-4 py-3 text-start">{t('workSummary.attendance')}</th>
                      <th className="px-4 py-3 text-start">{t('workSummary.payableTotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.members.map(member => (
                      <tr
                        key={member.userId}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedUserId === member.userId}
                        onClick={() => setSelectedUserId(member.userId)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedUserId(member.userId)
                          }
                        }}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary-700 ${
                          selectedUserId === member.userId ? 'bg-primary-50' : ''
                        }`}
                        data-testid="work-summary-member-row"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {member.fullName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t(`workSummary.roles.${member.role.toLowerCase()}`)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {member.role === 'Staff'
                            ? formatMinutes(member.totalWorkedMinutes ?? 0)
                            : t('workSummary.notApplicable')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {member.role === 'Interpreter'
                            ? member.totalInterpretations
                            : member.role === 'Technician'
                              ? member.totalExaminations
                            : t('workSummary.notApplicable')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {member.role === 'Staff'
                            ? member.isClockedIn
                              ? `${t('workSummary.clockedIn')}${member.clockInAt ? ` · ${new Date(member.clockInAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}` : ''}`
                              : t('workSummary.notClockedIn')
                            : t('workSummary.notApplicable')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {member.role === 'Staff'
                            ? t('workSummary.notApplicable')
                            : formatMemberPayable(member)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-3 md:hidden">
                {overview.members.map(member => (
                  <button
                    key={member.userId}
                    type="button"
                    aria-pressed={selectedUserId === member.userId}
                    onClick={() => setSelectedUserId(member.userId)}
                    className={`w-full rounded-xl border p-4 text-start shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 ${
                      selectedUserId === member.userId
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    data-testid="work-summary-member-card"
                  >
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <span className="font-semibold text-slate-900">{member.fullName}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {t(`workSummary.roles.${member.role.toLowerCase()}`)}
                      </span>
                    </span>
                    <span className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <MemberMetric
                        label={t('workSummary.worked')}
                        value={member.role === 'Staff'
                          ? formatMinutes(member.totalWorkedMinutes ?? 0)
                          : t('workSummary.notApplicable')}
                      />
                      <MemberMetric
                        label={t('workSummary.completedWorkCount')}
                        value={member.role === 'Interpreter'
                          ? `${t('workSummary.interpretations')}: ${member.totalInterpretations ?? 0}`
                          : member.role === 'Technician'
                            ? `${t('workSummary.examinations')}: ${member.totalExaminations ?? 0}`
                            : t('workSummary.notApplicable')}
                      />
                      <MemberMetric
                        label={t('workSummary.attendance')}
                        value={member.role === 'Staff'
                          ? member.isClockedIn ? t('workSummary.clockedIn') : t('workSummary.notClockedIn')
                          : t('workSummary.notApplicable')}
                      />
                      {member.role !== 'Staff' && (
                        <MemberMetric
                          label={t('workSummary.payableTotal')}
                          value={formatMemberPayable(member)}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
              </>
            )}
          </section>

          {selectedMember && (
            <section
              ref={detailsRef}
              aria-label={t('workSummary.memberDetails')}
              aria-live="polite"
              tabIndex={-1}
              className={`scroll-mt-6 space-y-4 rounded-xl border p-4 shadow-sm transition-all duration-500 motion-reduce:transition-none sm:p-5 ${
                detailsHighlighted
                  ? 'border-primary-300 bg-primary-50/60 shadow-lg ring-2 ring-primary-100'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{selectedMember.fullName}</h2>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-800">
                  {t(`workSummary.roles.${selectedMember.role.toLowerCase()}`)}
                </span>
              </div>
              {detailsLoading ? (
                <p className="text-sm text-slate-500">{t('workSummary.loading')}</p>
              ) : detailsError ? (
                <p role="alert" className="text-sm text-red-700">{detailsError}</p>
              ) : selectedMember.role === 'Staff' && staffDetails ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
                      label={t('workSummary.workingDays')}
                      value={staffDetails.workingDays}
                    />
                    <MetricCard
                      icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
                      label={t('workSummary.completedSessions')}
                      value={staffDetails.completedSessions}
                    />
                    <MetricCard
                      icon={<Clock3 aria-hidden="true" className="h-5 w-5" />}
                      label={t('workSummary.totalWorked')}
                      value={formatMinutes(staffDetails.totalWorkedMinutes)}
                    />
                    <MetricCard
                      icon={<FileText aria-hidden="true" className="h-5 w-5" />}
                      label={t('workSummary.attendance')}
                      value={selectedMember.isClockedIn
                        ? t('workSummary.clockedIn')
                        : t('workSummary.notClockedIn')}
                    />
                  </div>
                  <div className="space-y-3">
                    {staffDetails.sessions.map(session => (
                      <CorrectionForm
                        key={session.sessionId}
                        session={session}
                        saving={saving}
                        message={actionMessage}
                        onSave={saveCorrection}
                        t={t}
                        locale={locale}
                      />
                    ))}
                    {staffDetails.sessions.length === 0 && (
                      <p className="text-sm text-slate-500">{t('workSummary.noSessions')}</p>
                    )}
                  </div>
                </div>
              ) : selectedMember.role === 'Interpreter' && interpreterDetails ? (
                <InterpreterDetails
                  summary={interpreterDetails}
                  rates={rates.filter(rate => rate.interpreterUserId === selectedMember.userId)}
                  saving={saving}
                  actionMessage={actionMessage}
                  formatMoney={formatMoney}
                  formatDateTime={(value) => new Date(value).toLocaleString(locale)}
                  onSaveRate={updateRate}
                  onDeactivateRate={deactivateRate}
                  t={t}
                />
              ) : selectedMember.role === 'Technician' && technicianDetails ? (
                <TechnicianDetails
                  summary={technicianDetails}
                  rates={technicianRates.filter(rate => rate.technicianUserId === selectedMember.userId)}
                  saving={saving}
                  actionMessage={actionMessage}
                  formatMoney={formatMoney}
                  formatDateTime={(value) => new Date(value).toLocaleString(locale)}
                  onSaveRate={updateRate}
                  onDeactivateRate={deactivateRate}
                  t={t}
                />
              ) : null}
            </section>
          )}
        </>
      )}
    </main>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-1 break-words text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function MemberMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="min-w-0 rounded-lg bg-slate-50 p-2.5">
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="mt-1 block break-words font-semibold text-slate-800">{value}</span>
    </span>
  )
}

function CorrectionForm({
  session,
  saving,
  message,
  onSave,
  t,
  locale,
}: {
  session: StaffHoursSummary['sessions'][number]
  saving: boolean
  message: string
  onSave: (sessionId: string, clockInAt: string, clockOutAt: string, reason: string) => Promise<void>
  t: (key: string) => string
  locale: string
}) {
  const [editing, setEditing] = useState(false)
  const [clockInAt, setClockInAt] = useState(toLocalDateTimeValue(session.clockInAt))
  const [clockOutAt, setClockOutAt] = useState(toLocalDateTimeValue(session.clockOutAt))
  const [reason, setReason] = useState('')

  useEffect(() => {
    setClockInAt(toLocalDateTimeValue(session.clockInAt))
    setClockOutAt(toLocalDateTimeValue(session.clockOutAt))
  }, [session.clockInAt, session.clockOutAt])

  return (
    <article className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          {new Date(session.clockInAt).toLocaleString(locale)}
          <span className="mx-2">–</span>
          {new Date(session.clockOutAt).toLocaleString(locale)}
          <span className="ms-2 font-medium">{t('workSummary.duration')}: {session.workedMinutesInRange} {t('workSummary.minutesShort')}</span>
        </p>
        <button type="button" onClick={() => setEditing(value => !value)} className="text-sm font-medium text-primary-700 hover:underline">
          {editing ? t('workSummary.cancel') : t('workSummary.correct')}
        </button>
      </div>
      {editing && (
        <form
          className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2"
          onSubmit={event => {
            event.preventDefault()
            void onSave(session.sessionId, clockInAt, clockOutAt, reason)
          }}
        >
          <label className="text-sm text-slate-700">
            {t('workSummary.clockIn')}
            <input required type="datetime-local" value={clockInAt} onChange={event => setClockInAt(event.target.value)} className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700">
            {t('workSummary.clockOut')}
            <input required type="datetime-local" value={clockOutAt} onChange={event => setClockOutAt(event.target.value)} className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-700 sm:col-span-2">
            {t('workSummary.correctionReason')}
            <textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className="input mt-1 min-h-20 w-full" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary btn-md disabled:opacity-60">
              {saving ? t('workSummary.saving') : t('workSummary.saveCorrection')}
            </button>
            {message && <p role="status" className="mt-2 text-sm text-slate-600">{message}</p>}
          </div>
        </form>
      )}
    </article>
  )
}

function InterpreterDetails({
  summary,
  rates,
  saving,
  actionMessage,
  formatMoney,
  formatDateTime,
  onSaveRate,
  onDeactivateRate,
  t,
}: {
  summary: InterpreterWorkSummary
  rates: InterpreterRate[]
  saving: boolean
  actionMessage: string
  formatMoney: (amount: number, currency: string) => string
  formatDateTime: (value: string) => string
  onSaveRate: (modality: 'XRay' | 'US', amount: string) => Promise<void>
  onDeactivateRate: (rateId: string) => Promise<void>
  t: (key: string) => string
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={<FileText aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.completedInterpretations')}
          value={summary.totalInterpretations}
        />
        <MetricCard
          icon={<ScanLine aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.xRay')}
          value={summary.countsByPayrollModality.find(item => item.payrollModality === 'XRay')?.count ?? 0}
        />
        <MetricCard
          icon={<ScanLine aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.us')}
          value={summary.countsByPayrollModality.find(item => item.payrollModality === 'US')?.count ?? 0}
        />
        <MetricCard
          icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.withRate')}
          value={summary.interpretationsWithRate}
        />
        <MetricCard
          icon={<AlertCircle aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.withoutRate')}
          value={summary.interpretationsWithoutRate}
        />
      </div>

      <section
        aria-label={t('workSummary.payableTotal')}
        className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
            <DollarSign aria-hidden="true" className="h-6 w-6" />
          </span>
          <h3 className="text-base font-semibold text-slate-700">{t('workSummary.payableTotal')}</h3>
        </div>
        {summary.payableByCurrency.length === 0
          ? <p className="mt-3 text-lg font-semibold text-slate-700">{t('workSummary.notConfigured')}</p>
          : summary.payableByCurrency.map(total => (
              <p key={total.currency} className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {formatMoney(total.amount, total.currency)}
              </p>
            ))}
        {summary.interpretationsWithoutRate > 0 && (
          <p role="status" className="mt-3 flex items-start gap-2 text-sm font-medium text-amber-800">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{summary.interpretationsWithoutRate}</strong>{' '}
              {t('workSummary.missingRateWarning')}
            </span>
          </p>
        )}
      </section>

      <div>
        <h3 className="mb-2 font-semibold text-slate-900">{t('workSummary.rateManagement')}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(['XRay', 'US'] as const).map(modality => {
            const rate = rates.find(item => item.modality === modality && item.isActive)
            return (
              <RateForm
                key={modality}
                modality={modality}
                rate={rate}
                saving={saving}
                onSave={onSaveRate}
                onDeactivate={onDeactivateRate}
                formatMoney={formatMoney}
                amountLabel={t('workSummary.rateAmount')}
                t={t}
              />
            )
          })}
        </div>
        {actionMessage && <p role="status" className="mt-2 text-sm text-slate-600">{actionMessage}</p>}
      </div>
      <div>
        <h3 className="mb-2 font-semibold text-slate-900">{t('workSummary.completedWork')}</h3>
        <div className="space-y-2">
          {summary.items.map(item => (
            <article key={item.id} className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <time dateTime={item.completedAt} className="font-medium text-slate-800">{formatDateTime(item.completedAt)}</time>
                <span className="ms-2 text-slate-600">{item.originalModality}</span>
              </div>
              <p className="text-slate-700">
                {item.rateAmount === null
                  ? t('workSummary.notConfigured')
                  : formatMoney(item.rateAmount, item.currency ?? '')}
              </p>
            </article>
          ))}
          {summary.items.length === 0 && <p className="text-sm text-slate-500">{t('workSummary.noInterpretations')}</p>}
        </div>
      </div>
    </div>
  )
}

function TechnicianDetails({
  summary,
  rates,
  saving,
  actionMessage,
  formatMoney,
  formatDateTime,
  onSaveRate,
  onDeactivateRate,
  t,
}: {
  summary: TechnicianWorkSummary
  rates: TechnicianRate[]
  saving: boolean
  actionMessage: string
  formatMoney: (amount: number, currency: string) => string
  formatDateTime: (value: string) => string
  onSaveRate: (modality: 'XRay' | 'US', amount: string) => Promise<void>
  onDeactivateRate: (rateId: string) => Promise<void>
  t: (key: string) => string
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={<FileText aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.completedExaminations')}
          value={summary.totalExaminations}
        />
        <MetricCard
          icon={<ScanLine aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.xRay')}
          value={summary.countsByPayrollModality.find(item => item.payrollModality === 'XRay')?.count ?? 0}
        />
        <MetricCard
          icon={<ScanLine aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.us')}
          value={summary.countsByPayrollModality.find(item => item.payrollModality === 'US')?.count ?? 0}
        />
        <MetricCard
          icon={<CheckCircle2 aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.withRate')}
          value={summary.examinationsWithRate}
        />
        <MetricCard
          icon={<AlertCircle aria-hidden="true" className="h-5 w-5" />}
          label={t('workSummary.withoutRate')}
          value={summary.examinationsWithoutRate}
        />
      </div>

      <section
        aria-label={t('workSummary.payableTotal')}
        className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
            <DollarSign aria-hidden="true" className="h-6 w-6" />
          </span>
          <h3 className="text-base font-semibold text-slate-700">{t('workSummary.payableTotal')}</h3>
        </div>
        {summary.payableByCurrency.length === 0
          ? <p className="mt-3 text-lg font-semibold text-slate-700">{t('workSummary.notConfigured')}</p>
          : summary.payableByCurrency.map(total => (
              <p key={total.currency} className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                {formatMoney(total.amount, total.currency)}
              </p>
            ))}
        {summary.examinationsWithoutRate > 0 && (
          <p role="status" className="mt-3 flex items-start gap-2 text-sm font-medium text-amber-800">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{summary.examinationsWithoutRate}</strong>{' '}
              {t('workSummary.missingTechnicianRateWarning')}
            </span>
          </p>
        )}
      </section>

      <div>
        <h3 className="mb-2 font-semibold text-slate-900">{t('workSummary.technicianRateManagement')}</h3>
        <p className="mb-3 text-sm text-slate-500">{t('workSummary.tenantCurrency')}</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(['XRay', 'US'] as const).map(modality => {
            const rate = rates.find(item => item.modality === modality && item.isActive)
            return (
              <RateForm
                key={modality}
                modality={modality}
                rate={rate}
                saving={saving}
                onSave={onSaveRate}
                onDeactivate={onDeactivateRate}
                formatMoney={formatMoney}
                amountLabel={t('workSummary.ratePerExamination')}
                t={t}
              />
            )
          })}
        </div>
        {actionMessage && <p role="status" className="mt-2 text-sm text-slate-600">{actionMessage}</p>}
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-slate-900">{t('workSummary.completedExaminations')}</h3>
        <div className="space-y-2">
          {summary.items.map(item => (
            <article key={item.id} className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <time dateTime={item.performedAt} className="font-medium text-slate-800">{formatDateTime(item.performedAt)}</time>
                <span className="ms-2 text-slate-600">{item.originalModality}</span>
              </div>
              <p className="text-slate-700">
                {item.rateAmount === null || !item.currency
                  ? t('workSummary.notConfigured')
                  : formatMoney(item.rateAmount, item.currency)}
              </p>
            </article>
          ))}
          {summary.items.length === 0 && <p className="text-sm text-slate-500">{t('workSummary.noExaminations')}</p>}
        </div>
      </div>
    </div>
  )
}

type RateConfiguration = Pick<TechnicianRate, 'id' | 'modality' | 'amount' | 'currency' | 'isActive'>

function RateForm({
  modality,
  rate,
  saving,
  onSave,
  onDeactivate,
  formatMoney,
  amountLabel,
  t,
}: {
  modality: 'XRay' | 'US'
  rate?: RateConfiguration
  saving: boolean
  onSave: (modality: 'XRay' | 'US', amount: string) => Promise<void>
  onDeactivate: (rateId: string) => Promise<void>
  formatMoney: (amount: number, currency: string) => string
  amountLabel: string
  t: (key: string) => string
}) {
  const [amount, setAmount] = useState(rate ? String(rate.amount) : '')
  useEffect(() => setAmount(rate ? String(rate.amount) : ''), [rate?.amount, rate?.isActive])

  return (
    <form
      className="rounded-lg border border-slate-200 p-3"
      onSubmit={event => {
        event.preventDefault()
        void onSave(modality, amount)
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-slate-800">{modality === 'XRay' ? t('workSummary.xRay') : t('workSummary.us')}</h4>
        {rate && <span className="text-sm text-slate-600">{formatMoney(rate.amount, rate.currency)}</span>}
      </div>
      <label className="mt-2 block text-sm text-slate-700">
        {amountLabel}
        <input
          required
          min="0"
          step="0.01"
          type="number"
          value={amount}
          onChange={event => setAmount(event.target.value)}
          className="input mt-1 w-full"
        />
      </label>
      <p className="mt-1 text-xs text-slate-500">{t('workSummary.tenantCurrency')}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="btn-primary btn-md disabled:opacity-60">
          {t('workSummary.saveRate')}
        </button>
        {rate && (
          <button type="button" disabled={saving} onClick={() => void onDeactivate(rate.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">
            {t('workSummary.removeRate')}
          </button>
        )}
      </div>
    </form>
  )
}
