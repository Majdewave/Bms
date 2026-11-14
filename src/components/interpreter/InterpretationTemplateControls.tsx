import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FileText, Loader2, Plus, Trash2, X } from 'lucide-react'
import {
  createInterpretationReportTemplate,
  deactivateInterpretationReportTemplate,
  getInterpretationReportTemplates,
  updateInterpretationReportTemplate,
  type InterpretationReportTemplate,
} from '@/api/interpreterPortal'

type Props = {
  modality: string
  reportContent: string
  onApply: (content: string) => void
}

const emptyForm = { name: '', modality: '', content: '' }

function normalizeTemplateModality(modality: string | null | undefined) {
  const normalized = modality?.trim().toUpperCase() ?? ''
  return ['DX', 'DR', 'CR'].includes(normalized) ? 'DX' : normalized
}

export default function InterpretationTemplateControls({
  modality,
  reportContent,
  onApply,
}: Props) {
  const { t, i18n } = useTranslation()
  const [allTemplates, setAllTemplates] = useState<InterpretationReportTemplate[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const templateListRequest = useRef(0)

  const applicableTemplates = useMemo(() => {
    const currentModality = normalizeTemplateModality(modality)
    return allTemplates.filter((template) =>
      !template.modality || normalizeTemplateModality(template.modality) === currentModality
    )
  }, [allTemplates, modality])

  useEffect(() => {
    let active = true
    const requestId = ++templateListRequest.current
    setLoading(true)
    getInterpretationReportTemplates()
      .then((result) => {
        if (active && requestId === templateListRequest.current) setAllTemplates(result)
      })
      .catch((loadError) => {
        console.error('Failed to load interpretation templates', loadError)
        if (active && requestId === templateListRequest.current) setError(t('interpreter.templatesLoadError'))
      })
      .finally(() => {
        if (active && requestId === templateListRequest.current) setLoading(false)
      })
    return () => { active = false }
  }, [t])

  const handleSelect = (templateId: string) => {
    setSelectedId('')
    if (!templateId) return

    const template = applicableTemplates.find((item) => item.id === templateId)
    if (!template) return

    if (
      reportContent.length > 0 &&
      reportContent !== template.content &&
      !window.confirm(t('interpreter.confirmReplaceReport'))
    ) {
      return
    }

    onApply(template.content)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const startEdit = (template: InterpretationReportTemplate) => {
    setEditingId(template.id)
    setForm({
      name: template.name,
      modality: template.modality ?? '',
      content: template.content,
    })
  }

  const openManager = async () => {
    setError('')
    setIsManagerOpen(true)
    const requestId = ++templateListRequest.current
    try {
      const result = await getInterpretationReportTemplates()
      if (requestId === templateListRequest.current) setAllTemplates(result)
    } catch (loadError) {
      console.error('Failed to load all interpretation templates', loadError)
      setError(t('interpreter.templatesLoadError'))
    } finally {
      if (requestId === templateListRequest.current) setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim() || saving) return

    setSaving(true)
    setError('')
    const request = {
      name: form.name.trim(),
      modality: form.modality.trim() || null,
      content: form.content,
    }

    try {
      const saved = editingId
        ? await updateInterpretationReportTemplate(editingId, request)
        : await createInterpretationReportTemplate(request)
      setForm(emptyForm)
      setEditingId(null)
      setLoading(false)

      setAllTemplates((current) => [
        ...current.filter((item) => item.id !== saved.id),
        saved,
      ].sort((a, b) => a.name.localeCompare(b.name)))

      const requestId = ++templateListRequest.current
      try {
        const refreshedTemplates = await getInterpretationReportTemplates()
        if (requestId === templateListRequest.current) setAllTemplates(refreshedTemplates)
      } catch (refreshError) {
        console.error('Failed to refresh interpretation templates after save', refreshError)
        setError(t('interpreter.templatesLoadError'))
      }
    } catch (saveError) {
      console.error('Failed to save interpretation template', saveError)
      setError(t('interpreter.templateSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (template: InterpretationReportTemplate) => {
    if (!window.confirm(t('interpreter.confirmDeactivateTemplate'))) return

    try {
      await deactivateInterpretationReportTemplate(template.id)
      setAllTemplates((current) => current.filter((item) => item.id !== template.id))
      if (editingId === template.id) {
        setEditingId(null)
        setForm(emptyForm)
      }
    } catch (deactivateError) {
      console.error('Failed to deactivate interpretation template', deactivateError)
      setError(t('interpreter.templateSaveError'))
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" dir={i18n.dir()}>
      <label className="min-w-0 flex-1 text-xs font-medium text-slate-600">
        {t('interpreter.reportTemplates')}
        <select
          aria-label={t('interpreter.reportTemplates')}
          value={selectedId}
          onChange={(event) => handleSelect(event.target.value)}
          disabled={loading || applicableTemplates.length === 0}
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50"
        >
          <option value="">{loading ? t('interpreter.templatesLoading') : t('interpreter.chooseTemplate')}</option>
          {applicableTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}{template.modality ? ` · ${template.modality}` : ` · ${t('interpreter.generalTemplate')}`}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void openManager()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
      >
        <FileText className="h-4 w-4" />{t('interpreter.manageTemplates')}
      </button>
      {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}

      {isManagerOpen && createPortal((
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setIsManagerOpen(false) }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="interpretation-templates-title"
            dir={i18n.dir()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="interpretation-templates-title" className="text-lg font-bold text-slate-900">{t('interpreter.manageTemplates')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('interpreter.templatesPersonalOnly')}</p>
              </div>
              <button type="button" aria-label={t('common.cancel')} onClick={() => setIsManagerOpen(false)} disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  <Plus className="h-4 w-4" />{t('interpreter.newTemplate')}
                </button>
                {allTemplates.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{t('interpreter.noTemplates')}</p>
                ) : allTemplates.map((template) => (
                  <div key={template.id} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3">
                    <button type="button" onClick={() => startEdit(template)} className="min-w-0 flex-1 text-start">
                      <span className="block truncate text-sm font-semibold text-slate-800">{template.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">{template.modality || t('interpreter.generalTemplate')}</span>
                    </button>
                    <button type="button" aria-label={`${t('interpreter.deactivateTemplate')}: ${template.name}`} onClick={() => void handleDeactivate(template)} className="rounded-md p-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">{t('interpreter.templateName')}
                  <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-slate-700">{t('interpreter.templateModality')}
                  <select value={form.modality} onChange={(event) => setForm((current) => ({ ...current, modality: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                    <option value="">{t('interpreter.generalTemplate')}</option>
                    <option value="DX">{t('services.imagingOptions.dx')}</option>
                    <option value="US">{t('services.imagingOptions.us')}</option>
                    <option value="CR">{t('services.imagingOptions.cr')}</option>
                    {form.modality && !['DX', 'US', 'CR'].includes(form.modality.toUpperCase()) && (
                      <option value={form.modality}>{form.modality}</option>
                    )}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">{t('interpreter.templateContent')}
                  <textarea value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} rows={10} maxLength={100000} className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm leading-6" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleSave()} disabled={saving || !form.name.trim() || !form.content.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? t('interpreter.templatesSaving') : t('interpreter.saveTemplate')}
                  </button>
                  {(editingId || form.name || form.content) && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm) }} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">{t('interpreter.cancelTemplateEdit')}</button>}
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
          </section>
        </div>
      ), document.body)}
    </div>
  )
}
