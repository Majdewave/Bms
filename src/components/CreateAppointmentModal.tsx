import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { appointmentsService, type AppointmentClient, type Appointment } from '@/api'
import { servicesService, type BusinessService } from '@/api/servicesService'
import { staffService, type StaffMember } from '@/api/staff'

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
    duration: '60',
    description: '',
    status: 'Scheduled'
  })

  // Load dropdown data
  useEffect(() => {
    loadClients()
    loadServices()
    loadStaffMembers()
  }, [])

  // Fill form if editing
  useEffect(() => {
    if (mode === 'edit' && appointment) {

      const start = new Date(appointment.startTime)

      setFormData({
        clientId: appointment.clientId ?? '',
        serviceId: (appointment as any).serviceId ?? '',
        staffId: (appointment as any).staffId ?? '',
        date: start.toISOString().split('T')[0],
        time: start.toTimeString().slice(0, 5),
        duration: '60',
        description: appointment.notes ?? '',
        status: appointment.status ?? 'Scheduled'
      })
    }
  }, [mode, appointment])

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
      console.warn('Staff not allowed for this user')
      setStaffMembers([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.clientId || !formData.date || !formData.time) {
      alert('נא למלא שדות חובה')
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
      onClose?.()

    } catch (error) {
      console.error(error)
      alert('שגיאה בשמירת תור')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">

      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {mode === 'edit' ? 'ערוך פגישה' : 'קבע תור'}
          </h2>

          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* CLIENT */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              לקוח *
            </label>

            <select
              value={formData.clientId}
              onChange={(e) =>
                setFormData({ ...formData, clientId: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">בחר לקוח</option>

              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email || c.id}
                </option>
              ))}
            </select>
          </div>

          {/* SERVICE */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              שירות
            </label>

            <select
              value={formData.serviceId}
              onChange={(e) =>
                setFormData({ ...formData, serviceId: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">בחר שירות</option>

              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* DATE + TIME */}
          <div className="grid grid-cols-2 gap-4">

            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="border rounded-lg px-3 py-2"
              required
            />

            <input
              type="time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              className="border rounded-lg px-3 py-2"
              required
            />

          </div>

          {/* STAFF */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              איש צוות
            </label>

            <select
              value={formData.staffId}
              onChange={(e) =>
                setFormData({ ...formData, staffId: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">בחר איש צוות</option>

              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* DURATION */}
          <select
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: e.target.value })
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="30">30 דקות</option>
            <option value="60">60 דקות</option>
            <option value="90">90 דקות</option>
            <option value="120">120 דקות</option>
          </select>

          {/* NOTES */}
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="הערות"
          />

          {/* FOOTER */}
          <div className="flex justify-end gap-2 pt-4 border-t">

            <button type="button" onClick={onClose}>
              ביטול
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving
                ? 'שומר...'
                : mode === 'edit'
                ? 'עדכן פגישה'
                : 'שמור'}
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}