import { AlertTriangle, Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BusinessProjectEnding } from '@/types/businessDashboard'
import { formatDueDate } from '@/utils/businessFormat'
import { getProjectEndWarning, parseProjectEndDate } from '@/utils/projectEndWarning'

type Props = {
  projects: BusinessProjectEnding[]
}

export default function BusinessProjectEndingsCard({ projects }: Props) {
  const { t, i18n } = useTranslation()
  const visibleProjects = projects
    .filter((project) => getProjectEndWarning(project.endDate, project.status) !== null)
    .sort((a, b) => (parseProjectEndDate(a.endDate)?.getTime() ?? 0) - (parseProjectEndDate(b.endDate)?.getTime() ?? 0))

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6" aria-labelledby="business-project-endings">
      <div className="flex items-center gap-2">
        <Clock3 className="h-5 w-5 text-primary-600" />
        <h2 id="business-project-endings" className="text-base font-semibold text-slate-900">
          {t('businessShell.dashboard.projectEndings.title')}
        </h2>
      </div>

      {visibleProjects.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t('businessShell.dashboard.projectEndings.empty')}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {visibleProjects.map((project) => {
            const warning = getProjectEndWarning(project.endDate, project.status)
            if (!warning) return null
            const endDate = formatDueDate(project.endDate, i18n.language)
            const tone = warning.tone === 'yellow'
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-red-300 bg-red-50 text-red-800'
            const message = warning.tone === 'yellow'
              ? t('pm.projects.endDateWarningTwoMonths', { endDate })
              : warning.tone === 'red'
                ? t('pm.projects.endDateWarningOneMonth', { endDate })
                : t('pm.projects.endDateWarningOverdue', { endDate, count: warning.daysOverdue })

            return (
              <li key={project.projectId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900"><bdi>{project.projectName}</bdi></p>
                </div>
                <span className={`inline-flex max-w-full items-start gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${tone}`} role="status">
                  {warning.tone === 'yellow' ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span>{message}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}