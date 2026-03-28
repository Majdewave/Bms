import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { appointmentsService, type AppointmentClient, type Appointment } from '@/api'
import { servicesService, type BusinessService } from '@/api/servicesService'
import { staffService, type StaffMember } from '@/api/staff'
import { useTranslation } from 'react-i18next'

interface CreateAppointmentModalProps {
  onClose: () => void
  onSuccess?: () => void
  defaultClientId?: string
  mode?: 'create' | 'edit'
  appointment?: Appointment
}

export default function CreateAppointmentModal({
  onClose,
  onSuccess,
  defaultClientId,
  mode = 'create',
  appointment
}: CreateAppointmentModalProps) {

  const { t } = useTranslation()

  const [clients, setClients] = useState<AppointmentClient[]>([])
  const [services, setServices] = useState<BusinessService[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    loadClients()
    loadServices()
    loadStaffMembers()
  }, [])

  useEffect(() => {
    if (mode === 'edit' && appointment) {
      const start = new Date(appointment.startTime)

      setFormData({
        clientId: appointment.clientId ?? '',
        serviceId: (appointment as any).serviceId ?? '',
        staffId: (appointment as any).staffId ?? '',
        date: start.toISOString().split('T')[0],
        time: start.toTimeString().slice(0,5),
        duration: '',
        description: appointment.notes ?? '',
        status: appointment.status ?? 'Scheduled'
      })
    }
  }, [mode, appointment])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)

      const startLocal = new Date(`${formData.date}T${formData.time}`)
      const durationMinutes = parseInt(formData.duration) || 60
      const endLocal = new Date(startLocal.getTime() + durationMinutes * 60000)

      const payload = {
        clientId: formData.clientId,
        serviceId: formData.serviceId || undefined,
        staffId: formData.staffId || undefined,
        startTime: startLocal.toISOString(),
        endTime: endLocal.toISOString(),
        status: formData.status,
        notes: formData.description || undefined
      }

      if (mode === 'edit' && appointment) {
        await appointmentsService.updateAppointment(appointment.id, payload)
      } else {
        await appointmentsService.createAppointment(payload)
      }

      onSuccess?.()
      onClose()

    } catch (err) {
      console.error(err)
      alert('Error saving appointment')
    } finally {
      setSaving(false)
    }
  }

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
            </label>
            <select
              value={formData.clientId}
              onChange={e => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">{t('appointments.form.selectClient')}</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                 {(c as any).fullName || c.email}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold">
              {t('appointments.form.service')}
            </label>
            <select
              value={formData.serviceId}
              onChange={e => setFormData({ ...formData, serviceId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">{t('appointments.form.selectService')}</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold">
              {t('appointments.form.date')}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="time"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
            </div>

            <label className="block text-sm font-semibold">
              {t('appointments.form.staff')}
            </label>
            <select
              value={formData.staffId}
              onChange={e => setFormData({ ...formData, staffId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">{t('appointments.form.staffPlaceholder')}</option>
              {staffMembers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>

            {/* STATUS */}
            <label className="block text-sm font-semibold mb-1">
              {t('appointments.form.status')}
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="Scheduled">{t('appointments.status.scheduled')}</option>
              <option value="Completed">{t('appointments.status.completed')}</option>
              <option value="Cancelled">{t('appointments.status.cancelled')}</option>
              <option value="NoShow">{t('appointments.status.noshow')}</option>
            </select>

            <label className="block text-sm font-semibold">
              {t('appointments.form.duration')}
            </label>
            <div className="border rounded-lg px-3 py-2 bg-gray-100">
              {formData.duration
                ? t('appointments.duration', { minutes: formData.duration })
                : '-'}
            </div>

            <label className="block text-sm font-semibold">
              {t('appointments.form.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
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
    </div>
  )
}