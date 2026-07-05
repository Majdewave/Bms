import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Palette,
  Plus,
  Trash2,
} from 'lucide-react'
import { departmentService, type Department, type CreateDepartmentRequest, type UpdateDepartmentRequest } from '@/api/departmentService'

type Props = {
  canManageDepartments: boolean
  isOpen?: boolean
  onToggle?: () => void
  onDepartmentsLoaded?: (departments: Department[]) => void
}

type DepartmentFormState = {
  name: string
  description: string
  color: string
  isActive: boolean
}

type FormErrors = {
  name?: string
  submit?: string
}

const COLOR_OPTIONS = [
  { value: '#3B82F6', nameKey: 'blue' },
  { value: '#6366F1', nameKey: 'indigo' },
  { value: '#10B981', nameKey: 'emerald' },
  { value: '#F59E0B', nameKey: 'amber' },
  { value: '#F43F5E', nameKey: 'rose' },
  { value: '#64748B', nameKey: 'slate' },
]

const defaultColor = COLOR_OPTIONS[0].value

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function sortDepartments(items: Department[]) {
  return [...items].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  })
}

export default function DepartmentsSection({ canManageDepartments, isOpen = true, onToggle, onDepartmentsLoaded }: Props) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'

  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [editErrors, setEditErrors] = useState<FormErrors>({})
  const [newDepartment, setNewDepartment] = useState<DepartmentFormState>({
    name: '',
    description: '',
    color: defaultColor,
    isActive: true,
  })
  const [editData, setEditData] = useState<DepartmentFormState>({
    name: '',
    description: '',
    color: defaultColor,
    isActive: true,
  })

  const sortedDepartments = useMemo(() => sortDepartments(departments), [departments])

  useEffect(() => {
    void loadDepartments()
  }, [])

  useEffect(() => {
    if (!editingId) {
      return
    }

    const current = departments.find((department) => department.id === editingId)
    if (!current) {
      return
    }

    setEditData({
      name: current.name ?? '',
      description: current.description ?? '',
      color: current.color ?? defaultColor,
      isActive: current.isActive,
    })
  }, [departments, editingId])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const data = await departmentService.getDepartments()
      const normalizedDepartments = Array.isArray(data) ? data : []
      setDepartments(normalizedDepartments)
      onDepartmentsLoaded?.(normalizedDepartments)
    } catch (error) {
      console.error('Failed to load departments', error)
      setDepartments([])
      onDepartmentsLoaded?.([])
    } finally {
      setLoading(false)
    }
  }

  const validateDepartmentName = (name: string, id?: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return t('admin.departments.validation.requiredName')
    }

    const duplicate = departments.some((department) => {
      if (id && department.id === id) {
        return false
      }

      return normalizeName(department.name) === normalizeName(trimmedName)
    })

    if (duplicate) {
      return t('admin.departments.validation.duplicateName')
    }

    return ''
  }

  const nextDisplayOrder = () => {
    if (departments.length === 0) {
      return 1
    }

    return Math.max(...departments.map((department) => department.displayOrder), 0) + 1
  }

  const handleCreate = async () => {
    if (!canManageDepartments || saving) {
      return
    }

    const nameError = validateDepartmentName(newDepartment.name)
    if (nameError) {
      setFormErrors({ name: nameError })
      return
    }

    const payload: CreateDepartmentRequest = {
      name: newDepartment.name.trim(),
      description: newDepartment.description.trim() || null,
      color: newDepartment.color,
      displayOrder: nextDisplayOrder(),
    }

    try {
      setSaving(true)
      setFormErrors({})
      await departmentService.createDepartment(payload)
      setNewDepartment({
        name: '',
        description: '',
        color: defaultColor,
        isActive: true,
      })
      await loadDepartments()
    } catch (error) {
      console.error('Failed to create department', error)
      setFormErrors({
        submit: t('admin.departments.validation.saveFailed'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditStart = (department: Department) => {
    setEditingId(department.id)
    setEditErrors({})
    setEditData({
      name: department.name ?? '',
      description: department.description ?? '',
      color: department.color ?? defaultColor,
      isActive: department.isActive,
    })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditErrors({})
  }

  const handleEditSave = async (department: Department) => {
    if (!canManageDepartments || saving) {
      return
    }

    const nameError = validateDepartmentName(editData.name, department.id)
    if (nameError) {
      setEditErrors({ name: nameError })
      return
    }

    const payload: UpdateDepartmentRequest = {
      name: editData.name.trim(),
      description: editData.description.trim() || null,
      color: editData.color,
      displayOrder: department.displayOrder,
      isActive: editData.isActive,
    }

    try {
      setSaving(true)
      setEditErrors({})
      await departmentService.updateDepartment(department.id, payload)
      setEditingId(null)
      await loadDepartments()
    } catch (error) {
      console.error('Failed to update department', error)
      setEditErrors({
        submit: t('admin.departments.validation.saveFailed'),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (department: Department) => {
    if (!canManageDepartments || saving) {
      return
    }

    if (!window.confirm(t('admin.departments.confirmDeactivate'))) {
      return
    }

    try {
      setSaving(true)
      await departmentService.deleteDepartment(department.id)
      if (editingId === department.id) {
        setEditingId(null)
      }
      await loadDepartments()
    } catch (error) {
      console.error('Failed to deactivate department', error)
      alert(t('admin.departments.validation.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleReactivate = async (department: Department) => {
    if (!canManageDepartments || saving) {
      return
    }

    try {
      setSaving(true)
      await departmentService.updateDepartment(department.id, {
        name: department.name,
        description: department.description ?? null,
        color: department.color ?? defaultColor,
        displayOrder: department.displayOrder,
        isActive: true,
      })
      await loadDepartments()
    } catch (error) {
      console.error('Failed to reactivate department', error)
      alert(t('admin.departments.validation.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const moveDepartment = async (department: Department, direction: 'up' | 'down') => {
    if (!canManageDepartments || saving) {
      return
    }

    const currentIndex = sortedDepartments.findIndex((item) => item.id === department.id)
    if (currentIndex === -1) {
      return
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedDepartments.length) {
      return
    }

    const target = sortedDepartments[targetIndex]

    try {
      setSaving(true)
      await departmentService.updateDepartment(department.id, {
        name: department.name,
        description: department.description ?? null,
        color: department.color ?? defaultColor,
        displayOrder: target.displayOrder,
        isActive: department.isActive,
      })
      await departmentService.updateDepartment(target.id, {
        name: target.name,
        description: target.description ?? null,
        color: target.color ?? defaultColor,
        displayOrder: department.displayOrder,
        isActive: target.isActive,
      })
      await loadDepartments()
    } catch (error) {
      console.error('Failed to reorder departments', error)
      alert(t('admin.departments.validation.saveFailed'))
      await loadDepartments()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">{t('common.loading')}</div>
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg" dir={isRTL ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-sky-700 hover:bg-sky-800 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 text-start">
          <span className="inline-flex h-9 w-9 items-center justify-center text-white">
            <Building2 className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('admin.departments.title')}</h2>
            <p className="text-sm text-sky-50 mt-1">{t('admin.departments.description')}</p>
          </div>
        </div>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[6000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 space-y-6">
          {canManageDepartments && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <Plus className="w-4 h-4" />
                  <h3 className="font-semibold">{t('admin.departments.createTitle')}</h3>
                </div>
                <span className="text-xs text-slate-500">{t('admin.departments.note')}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">{t('admin.departments.form.name')}</label>
                  <input
                    value={newDepartment.name}
                    onChange={(event) => {
                      setFormErrors({})
                      setNewDepartment((current) => ({ ...current, name: event.target.value }))
                    }}
                    placeholder={t('admin.departments.form.namePlaceholder')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                  {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">{t('admin.departments.form.description')}</label>
                  <input
                    value={newDepartment.description}
                    onChange={(event) => setNewDepartment((current) => ({ ...current, description: event.target.value }))}
                    placeholder={t('admin.departments.form.descriptionPlaceholder')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                  <Palette className="w-4 h-4" />
                  {t('admin.departments.form.color')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {COLOR_OPTIONS.map((option) => {
                    const selected = newDepartment.color === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormErrors({})
                          setNewDepartment((current) => ({ ...current, color: option.value }))
                        }}
                        className={`rounded-xl border px-3 py-3 text-start transition ${selected ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-sky-300'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: option.value }} />
                          <span className="text-sm font-medium text-slate-700">{t(`admin.departments.colors.${option.nameKey}`)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={newDepartment.isActive}
                    onChange={(event) => setNewDepartment((current) => ({ ...current, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  {t('admin.departments.form.active')}
                </label>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {t('admin.departments.create')}
                </button>
              </div>

              {formErrors.submit && <p className="mt-3 text-sm text-red-600">{formErrors.submit}</p>}
            </div>
          )}

          {sortedDepartments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
              {t('admin.departments.empty')}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:hidden">
                {sortedDepartments.map((department, index) => {
                  const isEditing = editingId === department.id
                  return (
                    <div key={department.id} className={`rounded-2xl border p-4 shadow-sm ${department.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="space-y-3">
                              <input
                                value={editData.name}
                                onChange={(event) => {
                                  setEditErrors({})
                                  setEditData((current) => ({ ...current, name: event.target.value }))
                                }}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                              <input
                                value={editData.description}
                                onChange={(event) => setEditData((current) => ({ ...current, description: event.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: department.color || defaultColor }} />
                                <h4 className="truncate text-base font-semibold text-slate-900">{department.name}</h4>
                              </div>
                              <p className="mt-1 text-sm text-slate-600 line-clamp-2">{department.description || t('admin.departments.noDescription')}</p>
                            </>
                          )}
                        </div>

                        <div className="shrink-0 text-end">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${department.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {department.isActive ? t('admin.departments.status.active') : t('admin.departments.status.inactive')}
                          </span>
                          <div className="mt-2 text-xs text-slate-500">#{department.displayOrder}</div>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            {COLOR_OPTIONS.map((option) => {
                              const selected = editData.color === option.value
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setEditErrors({})
                                    setEditData((current) => ({ ...current, color: option.value }))
                                  }}
                                  className={`rounded-lg border px-3 py-2 text-start ${selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white'}`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: option.value }} />
                                    <span className="text-xs font-medium text-slate-700">{t(`admin.departments.colors.${option.nameKey}`)}</span>
                                  </span>
                                </button>
                              )
                            })}
                          </div>

                          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={editData.isActive}
                                onChange={(event) => setEditData((current) => ({ ...current, isActive: event.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            {t('admin.departments.form.active')}
                          </label>

                          {editErrors.name && <p className="text-xs text-red-600">{editErrors.name}</p>}
                          {editErrors.submit && <p className="text-xs text-red-600">{editErrors.submit}</p>}
                        </div>
                      )}

                      {canManageDepartments && (
                        <div className={`mt-4 flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditSave(department)}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {t('common.save')}
                              </button>
                              <button
                                type="button"
                                onClick={handleEditCancel}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                {t('common.cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => moveDepartment(department, 'up')}
                                disabled={saving || index === 0}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ArrowUp className="w-4 h-4" />
                                {t('admin.departments.actions.up')}
                              </button>
                              <button
                                type="button"
                                onClick={() => moveDepartment(department, 'down')}
                                disabled={saving || index === sortedDepartments.length - 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <ArrowDown className="w-4 h-4" />
                                {t('admin.departments.actions.down')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditStart(department)}
                                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 transition hover:bg-sky-100"
                              >
                                <Pencil className="w-4 h-4" />
                                {t('common.edit')}
                              </button>
                              {department.isActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(department)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('admin.departments.actions.deactivate')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleReactivate(department)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-100"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  {t('admin.departments.actions.activate')}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-start">{t('admin.departments.table.order')}</th>
                      <th className="px-4 py-3 text-start">{t('admin.departments.table.name')}</th>
                      <th className="px-4 py-3 text-start">{t('admin.departments.table.description')}</th>
                      <th className="px-4 py-3 text-start">{t('admin.departments.table.color')}</th>
                      <th className="px-4 py-3 text-start">{t('admin.departments.table.status')}</th>
                      {canManageDepartments && <th className="px-4 py-3 text-start">{t('admin.departments.table.actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDepartments.map((department, index) => {
                      const isEditing = editingId === department.id
                      return (
                        <tr key={department.id} className={`border-t ${department.isActive ? 'bg-white' : 'bg-slate-50/70'}`}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex min-w-8 justify-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{department.displayOrder}</span>
                              {canManageDepartments && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveDepartment(department, 'up')}
                                    disabled={saving || index === 0}
                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    title={t('admin.departments.actions.up')}
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveDepartment(department, 'down')}
                                    disabled={saving || index === sortedDepartments.length - 1}
                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    title={t('admin.departments.actions.down')}
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                value={editData.name}
                                onChange={(event) => setEditData((current) => ({ ...current, name: event.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: department.color || defaultColor }} />
                                <span className="font-medium text-slate-900">{department.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[340px]">
                            {isEditing ? (
                              <input
                                value={editData.description}
                                onChange={(event) => setEditData((current) => ({ ...current, description: event.target.value }))}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            ) : (
                              <span className="block truncate">{department.description || t('admin.departments.noDescription')}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="grid grid-cols-3 gap-2 min-w-[240px] max-w-[280px]">
                                {COLOR_OPTIONS.map((option) => {
                                  const selected = editData.color === option.value
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => setEditData((current) => ({ ...current, color: option.value }))}
                                      className={`rounded-lg border px-2 py-2 text-start ${selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white'}`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: option.value }} />
                                        <span className="text-xs font-medium text-slate-700">{t(`admin.departments.colors.${option.nameKey}`)}</span>
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                                <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: department.color || defaultColor }} />
                                {department.color || defaultColor}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={editData.isActive}
                                  onChange={(event) => setEditData((current) => ({ ...current, isActive: event.target.checked }))}
                                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                {t('admin.departments.form.active')}
                              </label>
                            ) : (
                              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${department.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                {department.isActive ? t('admin.departments.status.active') : t('admin.departments.status.inactive')}
                              </span>
                            )}
                          </td>
                          {canManageDepartments && (
                            <td className="px-4 py-3">
                              <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditSave(department)}
                                      disabled={saving}
                                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                      {t('common.save')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleEditCancel}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                      {t('common.cancel')}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditStart(department)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 transition hover:bg-sky-100"
                                    >
                                      <Pencil className="w-4 h-4" />
                                      {t('common.edit')}
                                    </button>
                                    {department.isActive ? (
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(department)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-100"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        {t('admin.departments.actions.deactivate')}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleReactivate(department)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-100"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {t('admin.departments.actions.activate')}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {(editErrors.name || editErrors.submit) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editErrors.name || editErrors.submit}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}