import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderKanban } from 'lucide-react'
import { getProjects } from '@/api/projects'
import type { Project } from '@/types/pm'
import { pmClientPath } from '@/pm/utils/pmPaths'

export default function BusinessProjectsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getProjects()
      .then((items) => { if (!cancelled) setProjects(items) })
      .catch((error) => console.error('Failed to load Business projects:', error))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const isRtl = i18n.language.startsWith('he') || i18n.language.startsWith('ar')

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t('businessShell.projects.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('businessShell.projects.subtitle')}</p>
      </header>
      {loading ? <p className="py-8 text-center text-slate-500">{t('common.loading')}</p> : projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">{t('businessShell.projects.empty')}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <button key={project.id} type="button" onClick={() => navigate(`${pmClientPath('/business', project.clientId)}?tab=projects`)} className="rounded-2xl border border-slate-200 bg-white p-5 text-start shadow-sm transition hover:border-primary-300 hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><FolderKanban className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{project.name}</span>
                  <span className="mt-1 block truncate text-sm text-slate-600">{project.clientName}</span>
                  <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t(`pm.status.${project.status}`)}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
