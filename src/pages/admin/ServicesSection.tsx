import { useEffect, useMemo, useState } from 'react'
import { servicesService, type BusinessService } from '../../api/servicesService'
import { Pencil, Trash2, FileText, ChevronDown, ChevronUp, Briefcase, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ConsentTemplateModal } from '@/components'
import type { Department } from '@/api/departmentService'

interface Props {
  isAdmin: boolean
  departments: Department[]
  isOpen?: boolean
  onToggle?: () => void
}

type ServiceFormState = {
  name: string
  defaultDurationMinutes: number
  departmentId: string
}

export default function ServicesSection({ isAdmin, departments, isOpen = true, onToggle }: Props) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'
  const [services, setServices] = useState<BusinessService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const activeDepartments = useMemo(() => departments.filter((department) => department.isActive), [departments])

  const [newService, setNewService] = useState<ServiceFormState>({
    name: '',
    defaultDurationMinutes: 60,
    departmentId: '',
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [templateService, setTemplateService] = useState<BusinessService | null>(null)
  const [editData, setEditData] = useState<ServiceFormState>({
    name: '',
    defaultDurationMinutes: 60,
    departmentId: '',
  })

  const selectedDepartmentById = useMemo(
    () => Object.fromEntries(departments.map((department) => [department.id, department])),
    [departments],
  )

  useEffect(() => {
    loadServices()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (activeDepartments.length === 1 && !newService.departmentId) {
      setNewService((current) => ({ ...current, departmentId: activeDepartments[0].id }))
    }
  }, [activeDepartments, newService.departmentId])

  const loadServices = async () => {
    try {
      setLoading(true)
      const data = await servicesService.getServices()
      setServices(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load services', err)
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const validateServiceForm = (state: ServiceFormState) => {
    if (!state.name.trim()) {
      return t('services.validation.nameRequired')
    }

    if (!state.departmentId) {
      return t('services.validation.departmentRequired')
    }

    return ''
  }

  const handleAdd = async () => {
    const errorMessage = validateServiceForm(newService)
    if (errorMessage) {
      setFormError(errorMessage)
      return
    }

    try {
      setSaving(true)
      setFormError('')
      await servicesService.create({
        name: newService.name.trim(),
        defaultDurationMinutes: newService.defaultDurationMinutes,
        departmentId: newService.departmentId,
      })
      setNewService({
        name: '',
        defaultDurationMinutes: 60,
        departmentId: activeDepartments.length === 1 ? activeDepartments[0].id : '',
      })
      await loadServices()
    } catch (err) {
      console.error('Failed to add service', err)
      alert(t('services.validation.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('services.confirmDelete'))) return

    try {
      setSaving(true)
      await servicesService.delete(id)
      await loadServices()
    } catch (err) {
      console.error('Failed to delete service', err)
      alert(t('services.validation.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (service: BusinessService) => {
    const fallbackDepartmentId = activeDepartments.length === 1 ? activeDepartments[0].id : ''
    setEditingId(service.id)
    setFormError('')
    setEditData({
      name: service.name || '',
      defaultDurationMinutes: service.defaultDurationMinutes || 60,
      departmentId: service.departmentId || fallbackDepartmentId,
    })
  }

  const handleEditSave = async (id: string) => {
    const errorMessage = validateServiceForm(editData)
    if (errorMessage) {
      setFormError(errorMessage)
      return
    }

    try {
      setSaving(true)
      setFormError('')
      await servicesService.update(id, {
        name: editData.name.trim(),
        defaultDurationMinutes: editData.defaultDurationMinutes,
        departmentId: editData.departmentId,
      })
      setEditingId(null)
      await loadServices()
    } catch (err) {
      console.error('Failed to update service', err)
      alert(t('services.validation.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const renderDepartmentPicker = (
    selectedDepartmentId: string,
    onSelect: (departmentId: string) => void,
    compact = false,
  ) => {
    if (activeDepartments.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {t('services.noDepartments')}
        </div>
      )
    }

    return (
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {activeDepartments.map((department) => {
          const selected = selectedDepartmentId === department.id
          return (
            <label
              key={department.id}
              className={`cursor-pointer rounded-xl border px-3 py-2 transition ${selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-300'}`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onSelect(department.id)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: department.color || '#3B82F6' }} />
                <span className="text-sm font-medium text-slate-800 truncate">{department.name}</span>
              </span>
            </label>
          )
        })}
      </div>
    )
  }

  const renderDepartmentBadge = (service: BusinessService) => {
    const department = service.departmentId ? selectedDepartmentById[service.departmentId] : null
    if (!department && !service.departmentName) {
      return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
          {t('services.departmentUnassigned')}
        </span>
      )
    }

    const color = department?.color || service.departmentColor || '#3B82F6'
    const label = department?.name || service.departmentName || ''

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
        <span className="h-3 w-3 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
    )
  }

  if (loading) {
    return <div className="p-6">{t('common.loading') || 'Loading services...'}</div>
  }

  return (
    <div
      className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-orange-600 hover:bg-orange-700 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center text-white">
            <Briefcase className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-semibold text-white">{t('services.title')}</h2>
        </div>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 border-b border-slate-200">
          {isAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder={t('services.serviceName')}
                  value={newService.name}
                  onChange={(event) => {
                    setFormError('')
                    setNewService((current) => ({ ...current, name: event.target.value }))
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />

                <input
                  type="number"
                  min={1}
                  value={newService.defaultDurationMinutes}
                  onChange={(event) =>
                    setNewService((current) => ({
                      ...current,
                      defaultDurationMinutes: Number(event.target.value) || 60,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 transition disabled:opacity-50"
                >
                  {saving ? t('common.saving') : t('services.add')}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Building2 className="w-4 h-4" />
                  {t('services.department')}
                </div>
                {renderDepartmentPicker(newService.departmentId, (departmentId) => {
                  setFormError('')
                  setNewService((current) => ({
                    ...current,
                    departmentId: current.departmentId === departmentId ? '' : departmentId,
                  }))
                })}
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
          )}
        </div>

        <div className="p-6">
          {services.length === 0 ? (
            <div className="text-gray-500 text-center">{t('services.empty')}</div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:hidden">
                {services.map((service, index) => (
                  <div
                    key={service.id}
                    className={`rounded-xl px-4 py-3 flex flex-col gap-3 ${index % 2 === 0 ? 'bg-amber-50/70' : 'bg-white border border-amber-100'}`}
                  >
                    <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {editingId === service.id ? (
                          <div className="space-y-3">
                            <input
                              value={editData.name}
                              onChange={(event) => {
                                setFormError('')
                                setEditData((current) => ({ ...current, name: event.target.value }))
                              }}
                              className="px-2 py-1 border rounded w-full"
                            />
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                              {renderDepartmentPicker(editData.departmentId, (departmentId) => {
                                setFormError('')
                                setEditData((current) => ({
                                  ...current,
                                  departmentId: current.departmentId === departmentId ? '' : departmentId,
                                }))
                              }, true)}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                              <span className="text-slate-500">{t('services.name')}:</span>{' '}
                              <span className="font-medium text-slate-900">{service.name}</span>
                            </div>
                            {renderDepartmentBadge(service)}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0">
                        {editingId === service.id ? (
                          <input
                            type="number"
                            min={1}
                            value={editData.defaultDurationMinutes}
                            onChange={(event) =>
                              setEditData((current) => ({
                                ...current,
                                defaultDurationMinutes: Number(event.target.value) || 60,
                              }))
                            }
                            className="px-2 py-1 border rounded w-24"
                          />
                        ) : (
                          <div className="text-sm text-slate-700 flex items-center gap-2">
                            <span className="text-slate-500">{t('services.duration')}:</span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                              {service.defaultDurationMinutes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                        {editingId === service.id ? (
                          <>
                            <button
                              onClick={() => handleEditSave(service.id)}
                              className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition font-medium shadow-sm"
                            >
                              {t('common.save')}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setFormError('')
                              }}
                              className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                            >
                              {t('common.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setTemplateService(service)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                              title="Consent Template"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(service)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition"
                              title={t('common.edit')}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(service.id)}
                              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                              title={t('common.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table dir={isRTL ? 'rtl' : 'ltr'} className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700 border-b">
                    <tr>
                      {isRTL ? (
                        <>
                          <th className="text-right px-4 py-2">{t('services.name')}</th>
                          <th className="text-right px-4 py-2">{t('services.department')}</th>
                          <th className="text-right px-4 py-2">{t('services.duration')}</th>
                          {isAdmin && <th className="text-right px-4 py-2">{t('services.actions')}</th>}
                        </>
                      ) : (
                        <>
                          {isAdmin && <th className="text-left px-4 py-2">{t('services.actions')}</th>}
                          <th className="text-left px-4 py-2">{t('services.duration')}</th>
                          <th className="text-left px-4 py-2">{t('services.department')}</th>
                          <th className="text-left px-4 py-2">{t('services.name')}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service) => (
                      <tr key={service.id} className="border-b hover:bg-slate-50 transition-colors align-top">
                        {isRTL ? (
                          <>
                            <td className="px-4 py-2 text-right">
                              {editingId === service.id ? (
                                <input
                                  value={editData.name}
                                  onChange={(event) => {
                                    setFormError('')
                                    setEditData((current) => ({ ...current, name: event.target.value }))
                                  }}
                                  className="px-2 py-1 border rounded"
                                />
                              ) : (
                                service.name
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {editingId === service.id
                                ? renderDepartmentPicker(editData.departmentId, (departmentId) => {
                                    setFormError('')
                                    setEditData((current) => ({
                                      ...current,
                                      departmentId: current.departmentId === departmentId ? '' : departmentId,
                                    }))
                                  }, true)
                                : renderDepartmentBadge(service)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {editingId === service.id ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={editData.defaultDurationMinutes}
                                  onChange={(event) =>
                                    setEditData((current) => ({
                                      ...current,
                                      defaultDurationMinutes: Number(event.target.value) || 60,
                                    }))
                                  }
                                  className="px-2 py-1 border rounded w-24"
                                />
                              ) : (
                                service.defaultDurationMinutes
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-2 text-right">
                                {editingId === service.id ? (
                                  <div className="flex items-center gap-3 justify-start">
                                    <button
                                      onClick={() => handleEditSave(service.id)}
                                      className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition font-medium shadow-sm"
                                    >
                                      {t('common.save')}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingId(null)
                                        setFormError('')
                                      }}
                                      className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                                    >
                                      {t('common.cancel')}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-start gap-2">
                                    <button
                                      onClick={() => setTemplateService(service)}
                                      className="p-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                      title="Consent Template"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEdit(service)}
                                      className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                                      title={t('common.edit')}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(service.id)}
                                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                                      title={t('common.delete')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </>
                        ) : (
                          <>
                            {isAdmin && (
                              <td className="px-4 py-2 text-left">
                                {editingId === service.id ? (
                                  <div className="flex items-center gap-3 justify-end">
                                    <button
                                      onClick={() => handleEditSave(service.id)}
                                      className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition font-medium shadow-sm"
                                    >
                                      {t('common.save')}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingId(null)
                                        setFormError('')
                                      }}
                                      className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                                    >
                                      {t('common.cancel')}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setTemplateService(service)}
                                      className="p-2 rounded-lg text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                      title="Consent Template"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEdit(service)}
                                      className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                                      title={t('common.edit')}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(service.id)}
                                      className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                                      title={t('common.delete')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="px-4 py-2 text-left">
                              {editingId === service.id ? (
                                <input
                                  type="number"
                                  min={1}
                                  value={editData.defaultDurationMinutes}
                                  onChange={(event) =>
                                    setEditData((current) => ({
                                      ...current,
                                      defaultDurationMinutes: Number(event.target.value) || 60,
                                    }))
                                  }
                                  className="px-2 py-1 border rounded w-24"
                                />
                              ) : (
                                service.defaultDurationMinutes
                              )}
                            </td>
                            <td className="px-4 py-2 text-left">
                              {editingId === service.id
                                ? renderDepartmentPicker(editData.departmentId, (departmentId) => {
                                    setFormError('')
                                    setEditData((current) => ({
                                      ...current,
                                      departmentId: current.departmentId === departmentId ? '' : departmentId,
                                    }))
                                  }, true)
                                : renderDepartmentBadge(service)}
                            </td>
                            <td className="px-4 py-2 text-left">
                              {editingId === service.id ? (
                                <input
                                  value={editData.name}
                                  onChange={(event) => {
                                    setFormError('')
                                    setEditData((current) => ({ ...current, name: event.target.value }))
                                  }}
                                  className="px-2 py-1 border rounded"
                                />
                              ) : (
                                service.name
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
              </div>
            </>
          )}
        </div>

        {templateService && (
          <ConsentTemplateModal
            isOpen={Boolean(templateService)}
            serviceId={templateService.id}
            serviceName={templateService.name}
            onClose={() => setTemplateService(null)}
            onSaved={loadServices}
          />
        )}
      </div>
    </div>
  )
}