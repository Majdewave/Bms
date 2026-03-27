import { useState, useEffect } from 'react'
import {
  MoreVertical,
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { PageHeader, CreateAppointmentModal } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { appointmentsService, Appointment } from '@/api'
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
    useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentRow | null>(null)

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
      const data = await appointmentsService.getAppointments()

      if (!data) {
        setAppointments([])
        return
      }

      setAppointments(data)
    } catch (error) {
      console.error('Failed loading appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
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

      setOpenDropdownId(null)
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
        (apt?.status ?? '').toLowerCase() === statusFilter

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

              <option value="scheduled">
                {t('appointments.status.scheduled')}
              </option>

              <option value="completed">
                {t('appointments.status.completed')}
              </option>

              <option value="cancelled">
                {t('appointments.status.cancelled')}
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
                {filteredAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="hover:bg-slate-50 relative"
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
                          <div className="font-medium hover:underline">
                            {appointment.clientName ?? '-'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {appointment.serviceName ?? '-'}
                          </div>
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

                    <td className="px-6 py-4 text-end flex gap-2 justify-end">
                      <Edit
                        className="w-4 h-4 cursor-pointer text-gray-600 hover:text-blue-600"
                        title={t('appointments.actions.edit')}
                        onClick={() => setEditingAppointment(appointment)}
                      />
                      <Trash2
                        className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800"
                        title={t('appointments.actions.delete')}
                        onClick={() => handleDelete(appointment.id)}
                      />
                    </td>
                  </tr>
                ))}
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
    </div>
  )
}