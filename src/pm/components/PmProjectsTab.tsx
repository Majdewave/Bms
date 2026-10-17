import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePmAreaPrefix, pmBillingPath } from '@/pm/utils/pmPaths'
import { useTranslation } from 'react-i18next'
import { CalendarRange, Plus, Trash2, Pencil, ArrowRight } from 'lucide-react'
import { getProjectsByClient, createProject, updateProject, deleteProject } from '@/api/projects'
import type { Project, ProjectStatus, CreateProjectRequest } from '@/types/pm'
import PmProjectDocuments from './PmProjectDocuments'

type Props = { clientId: string; canManage: boolean }

const STATUS_OPTIONS: ProjectStatus[] = ['Draft', 'Active', 'OnHold', 'Completed', 'Cancelled']

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Active: 'bg-green-100 text-green-700',
  OnHold: 'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-700',
}

const emptyForm = (): CreateProjectRequest => ({
  clientId: '',
  name: '',
  status: 'Draft',
  value: 0,
  startDate: null,
  endDate: null,
  description: '',
})

export default function PmProjectsTab({ clientId, canManage }: Props) {
  const navigate = useNavigate()
  const routePrefix = usePmAreaPrefix()
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateProjectRequest>(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getProjectsByClient(clientId)
      .then(setProjects)
      .catch((error) => {
        console.error('Failed to load projects:', error)
        setProjects([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm(), clientId })
    setShowModal(true)
  }

  const openEdit = (project: Project) => {
    setEditingId(project.id)
    setForm({
      clientId,
      name: project.name,
      status: project.status,
      value: project.value,
      startDate: project.startDate ?? null,
      endDate: project.endDate ?? null,
      description: project.description ?? '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateProject(editingId, {
          name: form.name,
          status: form.status,
          value: form.value,
          startDate: form.startDate,
          endDate: form.endDate,
          description: form.description,
        })
      } else {
        await createProject({ ...form, clientId })
      }
      closeModal()
      load()
    } catch (error) {
      console.error('Failed to save project:', error)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (project: Project) => {
    if (!window.confirm(t('pm.projects.confirmDelete', { name: project.name }))) return
    try {
      await deleteProject(project.id)
      setProjects((current) => current.filter((item) => item.id !== project.id))
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{t('pm.tabs.projects')}</h3>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            {t('pm.projects.new')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-500">{t('common.loading')}</div>
      ) : projects.length === 0 ? (
        <div className="py-6 text-center text-slate-500">{t('pm.projects.empty')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-slate-900">{project.name}</h4>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[project.status]}`}>
                  {t(`pm.status.${project.status}`)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {t('pm.projects.value')}: <span className="font-medium text-slate-800">{project.value.toFixed(2)}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
                {' — '}
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
              </p>
              {project.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{project.description}</p>
              ) : null}

              <PmProjectDocuments project={project} />
              {canManage && (
                <button
                  type="button"
                  onClick={() => navigate(pmBillingPath(routePrefix, clientId, project.id))}
                  className="mt-3 flex w-full items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3 text-start transition-colors hover:border-primary-300 hover:bg-primary-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm">
                    <CalendarRange className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-primary-900">{t('pm.manageBillingPlan')}</span>
                    <span className="block text-xs text-primary-700">{t('pm.billingPlanHint')}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary-700" />
                </button>
              )}

              {canManage && (
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(project)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(project)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? t('pm.projects.edit') : t('pm.projects.new')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600">{t('pm.projects.name')}</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">{t('pm.projects.status')}</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))}
                    className="w-full rounded-lg border border-slate-300 p-2"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {t(`pm.status.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">{t('pm.projects.value')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(event) => setForm((current) => ({ ...current, value: Number(event.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">{t('pm.projects.startDate')}</label>
                  <input
                    type="date"
                    value={form.startDate ? form.startDate.split('T')[0] : ''}
                    onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value || null }))}
                    className="w-full rounded-lg border border-slate-300 p-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">{t('pm.projects.endDate')}</label>
                  <input
                    type="date"
                    value={form.endDate ? form.endDate.split('T')[0] : ''}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value || null }))}
                    className="w-full rounded-lg border border-slate-300 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-600">{t('pm.projects.description')}</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
