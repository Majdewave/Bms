import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { appointmentsService, type Appointment, type AppointmentClient } from '@/api'
import { consentsApi, type SignedConsent } from '@/api/consents'
import { servicesService, type BusinessService } from '@/api/servicesService'
import { staffService, type StaffMember } from '@/api/staff'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import SignConsentModal from './SignConsentModal'
import Autocomplete from './Autocomplete'

type EditableAppointment = {
  id: string
  clientId?: string
  serviceId?: string | null
  staffId?: string | null
  departmentName?: string | null
  departmentColor?: string | null
  startTime: string
  notes?: string | null
  status?: string
}

interface CreateAppointmentModalProps {
  onClose: () => void
  onSuccess?: (appointment?: Appointment) => void
  defaultClientId?: string
  mode?: 'create' | 'edit'
  appointment?: EditableAppointment
}

export default function CreateAppointmentModal({
  onClose,
  onSuccess,
  defaultClientId,
  mode = 'create',
  appointment
}: CreateAppointmentModalProps) {

  const { t } = useTranslation()
  const { user } = useAuth()

  const [clients, setClients] = useState<AppointmentClient[]>([])
  const [services, setServices] = useState<BusinessService[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [signedConsents, setSignedConsents] = useState<SignedConsent[]>([])
  const [saving, setSaving] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [pendingEditServiceId, setPendingEditServiceId] = useState<string | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clientQuery, setClientQuery] = useState('')
  const [serviceQuery, setServiceQuery] = useState('')

  const [formData, setFormData] = useState({
    clientId: defaultClientId || '',
    serviceId: '',
    staffId: '',
    date: '',
    time: '',
    duration: '',
    description: '',
    status: 'Scheduled'
  })

  const selectedStaffMember = staffMembers.find((staff) => staff.id === formData.staffId)
  const selectedStaffDepartmentIds = selectedStaffMember?.departmentIds ?? []
  const filteredServices = selectedStaffDepartmentIds.length > 0
    ? services.filter((service) =>
        !service.departmentId || selectedStaffDepartmentIds.includes(service.departmentId))
    : services

  const isStaffContextReadyForEdit = !formData.staffId || staffMembers.some((staff) => staff.id === formData.staffId)

  useEffect(() => {
    loadClients()
    loadServices()
    loadStaffMembers()
  }, [])

  useEffect(() => {
    if (mode === 'edit' && appointment) {
      const start = new Date(appointment.startTime)
      const initialServiceId = appointment.serviceId ?? ''

      setFormData({
        clientId: appointment.clientId ?? '',
        serviceId: '',
        staffId: (appointment as any).staffId ?? '',
        date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
        time: start.toTimeString().slice(0,5),
        duration: '',
        description: appointment.notes ?? '',
        status: appointment.status ?? 'Scheduled'
      })

      setPendingEditServiceId(initialServiceId || null)
      setServiceQuery('')
      return
    }

    setPendingEditServiceId(null)
  }, [mode, appointment])

  useEffect(() => {
    if (mode !== 'edit' || !pendingEditServiceId) {
      return
    }

    if (!services.length || !isStaffContextReadyForEdit) {
      return
    }

    const matchingService = filteredServices.find((service) => service.id === pendingEditServiceId)
    if (!matchingService) {
      setPendingEditServiceId(null)
      return
    }

    setFormData((previous) => ({
      ...previous,
      serviceId: matchingService.id
    }))
    setServiceQuery(matchingService.name || '')
    setErrors((previous) => ({ ...previous, serviceId: '' }))
    setPendingEditServiceId(null)
  }, [mode, pendingEditServiceId, services.length, isStaffContextReadyForEdit, filteredServices])

  useEffect(() => {
    if (!clients.length) {
      return
    }

    const selectedClient = clients.find((client) => client.id === formData.clientId)
    if (selectedClient) {
      setClientQuery(selectedClient.fullName || selectedClient.email || '')
    }
  }, [clients, formData.clientId])

  useEffect(() => {
    if (!services.length) {
      return
    }

    const selectedService = services.find((service) => service.id === formData.serviceId)
    if (selectedService) {
      setServiceQuery(selectedService.name || '')
    }
  }, [services, formData.serviceId])

  useEffect(() => {
    if (formData.serviceId) {
      const selected = services.find(s => s.id === formData.serviceId)
      if (selected) {
        setFormData(prev => ({
          ...prev,
          duration: String(selected.defaultDurationMinutes)
        }))
      }
    }
  }, [formData.serviceId, services])

  useEffect(() => {
    if (!formData.serviceId) {
      return
    }

    const selectedServiceStillAvailable = filteredServices.some(
      (service) => service.id === formData.serviceId
    )

    if (!selectedServiceStillAvailable) {
      setFormData((previous) => ({
        ...previous,
        serviceId: '',
        duration: ''
      }))
      setServiceQuery('')
    }
  }, [filteredServices, formData.serviceId])

  useEffect(() => {
    if (user?.role !== 'staff' || !user.email || staffMembers.length === 0 || formData.staffId) {
      return
    }

    const normalizedEmail = user.email.trim().toLowerCase()
    const currentStaff = staffMembers.find((staff) =>
      staff.email?.trim().toLowerCase() === normalizedEmail
    )

    if (currentStaff) {
      setFormData((previous) => ({ ...previous, staffId: currentStaff.id }))
      setErrors((previous) => ({ ...previous, staffId: '' }))
    }
  }, [user, staffMembers, formData.staffId])

  useEffect(() => {
    const loadSignedConsents = async () => {
      if (mode !== 'edit' || !formData.clientId) {
        setSignedConsents([])
        return
      }

      try {
        const data = await consentsApi.getSignedByClient(formData.clientId)
        setSignedConsents(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed loading signed consents:', error)
        setSignedConsents([])
      }
    }

    loadSignedConsents()
  }, [mode, formData.clientId])

  const loadClients = async () => {
    const data = await appointmentsService.getClientsForAppointment()
    setClients(Array.isArray(data) ? data : [])
  }

  const loadServices = async () => {
    const data = await servicesService.getServices()
    setServices(Array.isArray(data) ? data : [])
  }

  const loadStaffMembers = async () => {
    try {
      const staff = await staffService.getStaffMembers()
      setStaffMembers(Array.isArray(staff) ? staff : [])
    } catch {
      setStaffMembers([])
    }
  }

  const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.clientId) {
    newErrors.clientId = t('validation.required')
  }

  if (!formData.serviceId) {
    newErrors.serviceId = t('validation.required')
  }

  if (!formData.staffId) {
    newErrors.staffId = t('validation.required')
  }

if (!formData.date || !formData.time) {
  newErrors.dateTime = t('validation.dateTimeRequired')
}

  setErrors(newErrors)

  return Object.keys(newErrors).length === 0
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
       return
}

    try {
      setSaving(true)

      const startLocal = new Date(`${formData.date}T${formData.time}`)
      const durationMinutes = parseInt(formData.duration) || 60
      const endLocal = new Date(startLocal.getTime() + durationMinutes * 60000)

      const payload = {
        clientId: formData.clientId,
        serviceId: formData.serviceId || undefined,
        staffId: formData.staffId || undefined,
        startTime: `${formData.date}T${formData.time}:00`,
        endTime: endLocal.toLocaleString('sv-SE').replace(' ', 'T'),
        status: formData.status,
        notes: formData.description || undefined
      }

      if (mode === 'edit' && appointment) {
        await appointmentsService.updateAppointment(appointment.id, payload)
      } else {
        const createdAppointment = await appointmentsService.createAppointment(payload)
        onSuccess?.(createdAppointment)
      }

      onClose()

    } catch (err) {
      console.error(err)
      alert('Error saving appointment')
    } finally {
      setSaving(false)
    }
  }

  const selectedClient = clients.find(c => c.id === formData.clientId)
  const selectedService = services.find(s => s.id === formData.serviceId)
  const selectedDepartmentName = selectedService?.departmentName || appointment?.departmentName || ''
  const selectedDepartmentColor = selectedService?.departmentColor || appointment?.departmentColor || ''
  const hasConsent = !!appointment?.id && signedConsents.some(c => c.appointmentId === appointment.id)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-scroll flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {mode === 'edit'
              ? t('appointments.editTitle')
              : t('appointments.createTitle')}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="create-appointment-form"
          onSubmit={handleSubmit}
          className="flex flex-col flex-1"
        >

          {/* BODY */}
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <label className="block text-sm font-semibold">
            {t('appointments.form.client')}
            <span className="text-red-500 ml-1">*</span>
          </label>
            <Autocomplete
                items={clients}
                query={clientQuery}
                onQueryChange={(value) => {
                  setClientQuery(value)
                  setFormData((previous) => ({ ...previous, clientId: '' }))
                }}
                onSelect={(client) => {
                  setClientQuery(client.fullName || client.email || '')
                  setFormData((previous) => ({ ...previous, clientId: client.id }))
                  setErrors((previous) => ({ ...previous, clientId: '' }))
                }}
                getItemId={(client) => client.id}
                getItemLabel={(client) => client.fullName || client.email || ''}
                getItemSecondaryText={(client) => client.email || undefined}
                getItemSearchText={(client) => `${client.fullName || ''} ${client.email || ''}`}
                placeholder={t('appointments.form.selectClient')}
                inputClassName={`w-full rounded-lg px-3 py-2 border ${
                  errors.clientId
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                noResultsText="לא נמצאו לקוחות"
                minQueryLength={0}
                emptyQueryShowsAll={true}
                maxResults={30}
            />

            {errors.clientId && (
            <p className="text-sm text-red-500 mt-1">
              {errors.clientId}
            </p>
               )}

            <label className="block text-sm font-semibold">
              {t('appointments.form.service')}
              <span className="text-red-500 ml-1">*</span>  
            </label>
            <Autocomplete
              items={filteredServices}
              query={serviceQuery}
              onQueryChange={(value) => {
                setServiceQuery(value)
                setFormData((previous) => ({ ...previous, serviceId: '' }))
              }}
              onSelect={(service) => {
                setServiceQuery(service.name || '')
                setFormData((previous) => ({ ...previous, serviceId: service.id }))
                setErrors((previous) => ({ ...previous, serviceId: '' }))
              }}
              getItemId={(service) => service.id}
              getItemLabel={(service) => service.name || ''}
              getItemSearchText={(service) => service.name || ''}
              placeholder={t('appointments.form.selectService')}
              inputClassName={`w-full rounded-lg px-3 py-2 border ${
                errors.serviceId
                  ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
              noResultsText={
                selectedStaffDepartmentIds.length > 0
                  ? t('appointments.form.noServicesForStaff')
                  : t('services.empty', 'לא נמצאו שירותים')
              }
              minQueryLength={0}
              emptyQueryShowsAll={true}
              maxResults={30}
            />

            {mode === 'edit' && (
              <>
                <label className="block text-sm font-semibold">
                  {t('appointments.form.department')}
                </label>
                <div className="border rounded-lg px-3 py-2 bg-gray-100 flex items-center gap-2 min-h-[42px]">
                  {selectedDepartmentName ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold bg-white"
                      style={selectedDepartmentColor
                        ? { color: selectedDepartmentColor, borderColor: selectedDepartmentColor }
                        : undefined}
                    >
                      {selectedDepartmentName}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">-</span>
                  )}
                </div>
              </>
            )}

            {mode === 'edit' && appointment?.id && formData.clientId && formData.serviceId && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={hasConsent}
                  title={hasConsent ? 'הסכמה כבר נחתמה' : undefined}
                  onClick={!hasConsent ? () => setShowConsentModal(true) : undefined}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm flex items-center gap-1
                    ${hasConsent
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
                  `}
                >
                  {hasConsent ? 'נחתם ✔' : 'חתום על הסכמה ▶'}
                </button>
              </div>
            )}

            <label className="block text-sm font-semibold">
              {t('appointments.form.date')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.date}
                min={
                  mode === 'create'
                    ? new Date().toISOString().split('T')[0]
                    : undefined
                }
                  onChange={e =>
                    setFormData({
                      ...formData,
                      date: e.target.value
                    })
                  }
                  className="border rounded-lg px-3 py-2"
              />
              <input
                type="time"
                value={formData.time}
                min={
                  mode === 'create' &&
                  formData.date === new Date().toISOString().split('T')[0]
                    ? new Date().toTimeString().slice(0, 5)
                    : undefined
                }
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
            </div>
              {errors.dateTime && (
                <p className="text-sm text-red-500">
                  {errors.dateTime}
                </p>
              )}

            <label className="block text-sm font-semibold">
              {t('appointments.form.staff')}
            </label>
            <select
              value={formData.staffId}
              onChange={e => setFormData({ ...formData, staffId: e.target.value })}
              className={`w-full rounded-lg px-3 py-2 border ${
                  errors.staffId
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                >
              <option value="">{t('appointments.form.staffPlaceholder')}</option>
              {staffMembers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
            {errors.staffId && (
              <p className="text-sm text-red-500 mt-1">
                {errors.staffId}
              </p>
            )}

            {/* STATUS */}
            <label className="block text-sm font-semibold mb-1">
              {t('appointments.form.status')}
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className={`w-full rounded-lg px-3 py-2 border ${
                  errors.status
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                >
              <option value="Scheduled">{t('appointments.status.scheduled')}</option>
              <option value="Completed">{t('appointments.status.completed')}</option>
              <option value="Cancelled">{t('appointments.status.cancelled')}</option>
              <option value="NoShow">{t('appointments.status.noshow')}</option>
            </select>

            <label className="block text-sm font-semibold">
              {t('appointments.form.duration')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="border rounded-lg px-3 py-2 bg-gray-100">
              {formData.duration
                ? t('appointments.duration', { minutes: formData.duration })
                : '-'}
            </div>

            <label className="block text-sm font-semibold">
              {t('appointments.form.description')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`w-full rounded-lg px-3 py-2 border ${
                  errors.description
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
              placeholder={t('appointments.form.descriptionPlaceholder')}
            />

          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 p-4 border-t bg-white shrink-0">

            <button
              type="button"
              className="px-4 py-2 rounded-lg border"
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>

          </div>

        </form>

      </div>

      {showConsentModal && mode === 'edit' && appointment?.id && (
        <SignConsentModal
          isOpen={showConsentModal}
          appointmentId={appointment.id}
          clientId={formData.clientId}
          clientName={(selectedClient as any)?.fullName || (selectedClient as any)?.email || ''}
          serviceId={formData.serviceId}
          serviceName={selectedService?.name || ''}
          onClose={() => setShowConsentModal(false)}
          onSigned={async () => {
            setShowConsentModal(false)
            if (formData.clientId) {
              const data = await consentsApi.getSignedByClient(formData.clientId)
              setSignedConsents(Array.isArray(data) ? data : [])
            }
          }}
        />
      )}
    </div>
  )
}