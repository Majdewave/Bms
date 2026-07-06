import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { appointmentsService, type Appointment } from '@/api'
import CreateAppointmentModal from '@/components/CreateAppointmentModal'
import VisitSummaryForm from './VisitSummaryForm'

type AppointmentChoice = Appointment & {
  serviceName?: string | null
  staffName?: string | null
}

export default function VisitSummaryEntry() {
  const { clientId } = useParams<{ clientId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const appointmentId = searchParams.get('appointmentId') || ''
  const [loading, setLoading] = useState(!appointmentId)
  const [appointments, setAppointments] = useState<AppointmentChoice[]>([])
  const [showCreateAppointment, setShowCreateAppointment] = useState(false)

  const chooseAppointment = (items: AppointmentChoice[]) => {
    if (items.length === 0) {
      return null
    }

    const now = new Date()
    const normalizedStatus = (status?: string | null) => (status || '').trim().toLowerCase()

    const nearestScheduled = [...items]
      .filter((item) => normalizedStatus(item.status) === 'scheduled' && new Date(item.startTime) >= now)
      .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())[0]

    if (nearestScheduled) {
      return nearestScheduled
    }

    const inProgress = items.find((item) => normalizedStatus(item.status) === 'inprogress')
    if (inProgress) {
      return inProgress
    }

    return [...items].sort((left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime())[0]
  }

  useEffect(() => {
    if (appointmentId) {
      setLoading(false)
      return
    }

    if (!clientId || clientId === 'new') {
      setLoading(false)
      return
    }

    let cancelled = false

    const loadAppointments = async () => {
      setLoading(true)

      try {
        const data = await appointmentsService.getAppointments(clientId)
        if (cancelled) return

        const loadedAppointments = Array.isArray(data) ? (data as AppointmentChoice[]) : []
        setAppointments(loadedAppointments)

        const selectedAppointment = chooseAppointment(loadedAppointments)
        if (selectedAppointment?.id) {
          navigate(`/staff/visit-summary/${clientId}?appointmentId=${selectedAppointment.id}`, { replace: true })
          return
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed loading visit summary appointments:', error)
          setAppointments([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAppointments()

    return () => {
      cancelled = true
    }
  }, [appointmentId, clientId, navigate])

  const handleCreateSuccess = (createdAppointment?: Appointment) => {
    if (!clientId || !createdAppointment?.id) return

    setShowCreateAppointment(false)
    navigate(`/staff/visit-summary/${clientId}?appointmentId=${createdAppointment.id}`, { replace: true })
  }

  if (appointmentId) {
    return <VisitSummaryForm />
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 text-center text-slate-600">
          טוען פגישות...
        </div>
      </div>
    )
  }

  if (!clientId || clientId === 'new') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold">לא ניתן ליצור סיכום ביקור ללא לקוח</h3>
          <p className="text-slate-700 leading-7">יש לבחור לקוח קיים כדי להמשיך.</p>
          <div className="flex justify-end">
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-slate-200">
              ביטול
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold">לא ניתן ליצור סיכום ביקור ללא פגישה</h3>
          <p className="text-slate-700 leading-7">
            סיכום ביקור חייב להיות משויך לפגישה כדי לשמור על תיעוד נכון של הטיפול.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateAppointment(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              קבע פגישה חדשה
            </button>
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-slate-200">
              ביטול
            </button>
          </div>
        </div>

        {showCreateAppointment && (
          <CreateAppointmentModal
            defaultClientId={clientId}
            onClose={() => setShowCreateAppointment(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 text-center text-slate-600">
        פותח סיכום ביקור...
      </div>
    </div>
  )
}