import { useTranslation } from 'react-i18next'

interface UpcomingAppointment {
  id?: string
  startTime: string
  clientName?: string | null
  serviceName?: string | null
  staffName?: string | null
  status?: string | null
}

interface DashboardUpcomingAppointmentsProps {
  appointments?: UpcomingAppointment[] | null
  direction: string
  locale: string
}

const statusStyles: Record<string, string> = {
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  waiting: 'border-amber-200 bg-amber-50 text-amber-700',
  inprogress: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  completed: 'border-slate-200 bg-slate-100 text-slate-600',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
  noshow: 'border-rose-200 bg-rose-50 text-rose-700',
}

export default function DashboardUpcomingAppointments({
  appointments,
  direction,
  locale,
}: DashboardUpcomingAppointmentsProps) {
  const { t, i18n } = useTranslation()

  if (!appointments?.length) {
    return (
      <div dir={direction} className="py-6 text-center text-sm text-slate-400">
        {t('dashboard.noUpcomingAppointments')}
      </div>
    )
  }

  return (
    <ol dir={direction} className="w-full divide-y divide-slate-200">
      {appointments.slice(0, 5).map((appointment, index) => {
        const status = appointment.status?.trim() ?? ''
        const normalizedStatus = status.toLowerCase()
        const arabicStatusKeys: Record<string, string> = {
          scheduled: 'Scheduled',
          completed: 'Completed',
          cancelled: 'Cancelled',
          noshow: 'NoShow',
          inprogress: 'InProgress',
          waiting: 'waiting',
        }
        const statusKey = i18n.language === 'ar'
          ? arabicStatusKeys[normalizedStatus] ?? status
          : normalizedStatus
        const translatedStatus = t(`appointments.status.${statusKey}`, { defaultValue: status })
        const time = new Date(appointment.startTime).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        })

        return (
          <li
            key={appointment.id ?? `${appointment.startTime}-${index}`}
            data-testid="upcoming-appointment-row"
            className="grid min-w-0 grid-cols-2 items-start gap-x-4 gap-y-3 px-1 py-4 first:pt-1 last:pb-1 md:grid-cols-[minmax(6rem,0.7fr)_minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1.25fr)_auto] md:items-center md:gap-5"
          >
            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-500">{t('dashboard.time')}</span>
              <time dir="ltr" className="mt-1 block w-fit rounded-md bg-primary-50 px-2 py-1 font-mono text-base font-semibold tabular-nums text-primary-700" dateTime={appointment.startTime}>
                {time}
              </time>
            </div>

            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-500">{t('dashboard.client')}</span>
              <p className="mt-1 break-words text-sm font-semibold text-slate-900 sm:text-base">
                {appointment.clientName || '—'}
              </p>
            </div>

            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-500">{t('dashboard.service')}</span>
              <p className="mt-1 break-words text-sm text-slate-700">{appointment.serviceName || '—'}</p>
            </div>

            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-500">{t('dashboard.staff')}</span>
              <p className="mt-1 break-words text-sm text-slate-700">{appointment.staffName || '—'}</p>
            </div>

            <div className="col-span-2 min-w-0 md:col-span-1">
              <span className="block text-xs font-medium text-slate-500">{t('dashboard.status')}</span>
              {status && (
                <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[normalizedStatus] ?? 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                  {translatedStatus}
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}