import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  FileCheck2,
} from 'lucide-react'
import ActionButton from '@/components/ActionButton'
import { useNavigate } from 'react-router-dom'
import { PageHeader, CreateAppointmentModal, SignConsentModal } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { appointmentsService, type Appointment } from '@/api/appointmentsService'
import { AppointmentStatus } from '@/constants/appointmentStatus'
import { useTranslation } from 'react-i18next'

type AppointmentRow = Appointment

export default function StaffAppointments() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()

  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<'all' | keyof typeof AppointmentStatus>('all')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentRow | null>(null)
  const [consentAppointment, setConsentAppointment] = useState<AppointmentRow | null>(null)

  // Removed dropdown state
  useEffect(() => {
    // Prevent redirect before user is loaded
    if (hasPermission === undefined) return;
    if (!hasPermission('manage_appointments')) {
      navigate('/unauthorized');
      return;
    }
    loadAppointments();
  }, [hasPermission, navigate])

  const loadAppointments = async () => {
    setLoading(true)

    try {
      const result = await appointmentsService.getAppointments()

      if (!result || !result.data) {
        setAppointments([])
        return
      }

      setAppointments(result.data)
    } catch (error) {
      console.error('Failed loading appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

const updateStatus = async (id: string, status: string) => {
  try {
    const appointment = appointments.find(a => a.id === id)
    if (!appointment) return

    await appointmentsService.updateAppointment(id, {
      ...appointment,
      status
    })
   console.log("appointment: ", appointment)
    await loadAppointments()
  } catch (error) {
    console.error(error)
  }
}

const markNotDocumented = async (appointment: Appointment) => {
  try {
    await appointmentsService.markNotDocumented(appointment)
    await loadAppointments()
  } catch (error) {
    console.error(error)
  }
}

  const handleDelete = async (id?: string) => {
    if (!id) return

    if (!confirm(t('appointments.confirmDelete'))) return

    try {
      await appointmentsService.deleteAppointment(id)

      setAppointments((prev) =>
        prev.filter((a) => a?.id !== id)
      )
    } catch (error) {
      console.error(error)
    }
  }

  const safeSearch = searchQuery.toLowerCase()

  const filteredAppointments = (appointments ?? [])
    .filter((apt) => {
      const name = (apt?.clientName ?? '').toLowerCase()

      const matchesSearch = name.includes(safeSearch)

      const matchesStatus =
        statusFilter === 'all' ||
        apt?.status === AppointmentStatus[statusFilter as keyof typeof AppointmentStatus]

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const aDate = new Date(a?.startTime ?? '').getTime()
      const bDate = new Date(b?.startTime ?? '').getTime()
      return bDate - aDate
    })

  const formatDate = (date?: string) => {
    if (!date) return '-'

    const d = new Date(date)

    if (isNaN(d.getTime())) return '-'

    return d.toLocaleDateString()
  }

  const formatTime = (date?: string) => {
    if (!date) return '-'

    const d = new Date(date)

    if (isNaN(d.getTime())) return '-'

    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('appointments.title')}
        description={t('appointments.subtitle')}
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary btn-md gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('appointments.createTitle')}
          </button>
        }
      />

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

            <input
              type="text"
              placeholder={t('appointments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input ps-10 w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as any)
              }
              className="input"
            >
              <option value="all">
                {t('appointments.filters.all')}
              </option>

              <option value="Scheduled">
                {t('appointments.status.scheduled')}
              </option>
              <option value="Waiting">
                {t('appointments.status.waiting')}
              </option>
              <option value="InProgress">
                {t('appointments.status.inprogress')}
              </option>
              <option value="Completed">
                {t('appointments.status.completed')}
              </option>
              <option value="Cancelled">
                {t('appointments.status.cancelled')}
              </option>
              <option value="NoShow">
                {t('appointments.status.noshow')}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-xs text-center">
                    {t('appointments.table.client')}
                  </th>

                  <th className="px-6 py-3 text-xs text-center">
                    {t('appointments.table.datetime')}
                  </th>

                  <th className="px-6 py-3 text-xs text-center">
                    {t('appointments.table.staff')}
                  </th>

                  <th className="px-6 py-3 text-xs text-center">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>

              <tbody>
               {filteredAppointments.map((appointment) => {
                  const isNotDocumented = appointment.isDocumented === false
                  return (
                      <tr
                        key={appointment.id}
                        className={`hover:bg-slate-50 relative 
                          ${isNotDocumented ? 'bg-red-50' : ''}
                        `}
                      >
                      <td className="px-6 py-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer hover:bg-blue-50 rounded p-1"
                        onClick={() => {
                          console.log('Navigate to clientId:', appointment.clientId)
                          navigate(`/admin/clients/${appointment.clientId}`)
                        }}
                        title={appointment.clientName}
                      >
                        <User className="w-5 h-5 text-primary" />
                        <div>
                          <div className={`font-medium hover:underline ${isNotDocumented ? 'text-red-600' : ''}`}>
                            {appointment.clientName ?? '-'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {appointment.serviceName ?? '-'}
                          </div>
                          {appointment.hasSignedConsent ? (
                            <span className="inline-flex items-center mt-1 gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-medium">
                              <FileCheck2 className="w-3 h-3" />
                              Signed Consent
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setConsentAppointment(appointment)
                              }}
                              className="mt-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Sign Consent
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(appointment.startTime)}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        {formatTime(appointment.startTime)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {appointment.staffName ?? '-'}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${appointment.status === AppointmentStatus.Scheduled && 'bg-blue-100 text-blue-700'}
                            ${appointment.status === AppointmentStatus.Waiting && 'bg-yellow-100 text-yellow-700'}
                            ${appointment.status === AppointmentStatus.InProgress && 'bg-purple-100 text-purple-700'}
                            ${appointment.status === AppointmentStatus.Completed && 'bg-green-100 text-green-700'}
                            ${appointment.status === AppointmentStatus.Cancelled && 'bg-red-100 text-red-700'}
                            ${appointment.status === AppointmentStatus.NoShow && 'bg-gray-100 text-gray-700'}
                          `}
                        >
                          {t(`appointments.status.${appointment.status?.toLowerCase()}`)}
                        </span>

                        {isNotDocumented && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            לא מתועד
                          </span>
                        )}

                      </div>
                    </td>
                        <td className="px-6 py-4 text-end">
                        <div className="flex items-center gap-2 justify-end flex-wrap">
                          {/* Quick Actions */}
                          {appointment.status === 'Scheduled' && (
                            <ActionButton
                              type="arrived"
                              onClick={() => updateStatus(appointment.id, 'Waiting')}
                            />
                          )}
                          {appointment.status === 'Waiting' && (
                            <ActionButton
                              type="start"
                              onClick={() => updateStatus(appointment.id, 'InProgress')}
                            />
                          )}
                          {appointment.status === 'InProgress' && (
                            <ActionButton
                              type="complete"
                              onClick={() => updateStatus(appointment.id, 'Completed')}
                            />
                          )}
                          {/* Always allow Cancel/No Show */}
                          {appointment.status?.toLowerCase() !== 'cancelled' && appointment.status?.toLowerCase() !== 'completed' && (
                            <ActionButton
                              type="cancel"
                              onClick={() => updateStatus(appointment.id, 'Cancelled')}
                            />
                          )}
                         {appointment.status?.toLowerCase() !== 'noshow' && appointment.status?.toLowerCase() !== 'completed' &&(
                            <ActionButton
                              type="noshow"
                              onClick={() => updateStatus(appointment.id, 'NoShow')}
                            />
                          )}

                          
                        {appointment.status?.toLowerCase() === 'completed' && appointment.isDocumented !== false && (
                            <ActionButton
                              type="notDocumented"
                              onClick={() => markNotDocumented(appointment)}
                            />
                          )}


                          {/* Edit/Delete */}
                          <Edit
                            className="w-4 h-4 cursor-pointer text-gray-600 hover:text-blue-600"
                            onClick={() => setEditingAppointment(appointment)}
                          />
                          <Trash2
                            className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800"
                            onClick={() => handleDelete(appointment.id)}
                          />
                        </div>
                      </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateAppointmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadAppointments()
            setShowCreateModal(false)
          }}
        />
      )}

      {editingAppointment && (
        <CreateAppointmentModal
          mode="edit"
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSuccess={() => {
            loadAppointments()
            setEditingAppointment(null)
          }}
        />
      )}

      {consentAppointment && (
        <SignConsentModal
          isOpen={Boolean(consentAppointment)}
          appointmentId={consentAppointment.id}
          clientId={consentAppointment.clientId}
          clientName={consentAppointment.clientName}
          serviceId={consentAppointment.serviceId}
          serviceName={consentAppointment.serviceName}
          onClose={() => setConsentAppointment(null)}
          onSigned={() => {
            setConsentAppointment(null)
            loadAppointments()
          }}
        />
      )}
    </div>
  )
}