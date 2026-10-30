import { AlertTriangle, CalendarDays, Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Project, ProjectPaymentType, ProjectStatus } from '@/types/pm'
import { getProjectEndWarning } from '@/utils/projectEndWarning'

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Draft: 'border-slate-200 bg-slate-100 text-slate-700',
  Active: 'border-blue-200 bg-blue-100 text-blue-800',
  OnHold: 'border-amber-200 bg-amber-100 text-amber-800',
  Completed: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  Cancelled: 'border-red-200 bg-red-100 text-red-800',
}

const PAYMENT_TYPE_BADGE: Record<ProjectPaymentType, string> = {
  Retainer: 'border-violet-200 bg-violet-50 text-violet-800',
  Monthly: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  Hourly: 'border-orange-200 bg-orange-50 text-orange-800',
  Milestone: 'border-indigo-200 bg-indigo-50 text-indigo-800',
}

const PAYMENT_TYPES = Object.keys(PAYMENT_TYPE_BADGE) as ProjectPaymentType[]

function getLocale(language: string) {
  if (language.startsWith('he')) return 'he-IL'
  if (language.startsWith('ar')) return 'ar'
  return 'en-US'
}

function parseDate(value: string) {
  const datePart = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}>
      {t(`pm.status.${status}`)}
    </span>
  )
}

export function ProjectPaymentTypeBadge({ paymentType }: { paymentType?: ProjectPaymentType | null }) {
  const { t } = useTranslation()
  if (!paymentType || !PAYMENT_TYPES.includes(paymentType)) return null

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${PAYMENT_TYPE_BADGE[paymentType]}`}>
      {t(`pm.paymentTypes.${paymentType}`)}
    </span>
  )
}

export function ProjectSchedule({ project }: { project: Project }) {
  const { t, i18n } = useTranslation()
  const locale = getLocale(i18n.resolvedLanguage || i18n.language)
  const startDate = project.startDate ? parseDate(project.startDate) : null
  const endDate = project.endDate ? parseDate(project.endDate) : null
  const endWarning = getProjectEndWarning(project.endDate, project.status)
  const endDateLabel = endDate ? formatDate(endDate, locale) : t('pm.projects.notSet')

  return (
    <>
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-blue-950">
      <div className="flex items-start gap-2.5">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          <p><span className="font-semibold text-blue-800">{t('pm.projects.startDate')}:</span> {startDate ? formatDate(startDate, locale) : t('pm.projects.notSet')}</p>
          <p><span className="font-semibold text-blue-800">{t('pm.projects.endDate')}:</span> {endDateLabel}</p>
        </div>
      </div>
    </div>
    {endWarning && (
      <div className={`mt-2 flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold ${endWarning.tone === 'yellow' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-red-300 bg-red-50 text-red-800'}`} role="status">
        {endWarning.tone === 'yellow' ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>
          {endWarning.tone === 'yellow'
            ? t('pm.projects.endDateWarningTwoMonths', { endDate: endDateLabel })
            : endWarning.tone === 'red'
              ? t('pm.projects.endDateWarningOneMonth', { endDate: endDateLabel })
              : t('pm.projects.endDateWarningOverdue', { endDate: endDateLabel, count: endWarning.daysOverdue })}
        </span>
      </div>
    )}
    </>
  )
}
