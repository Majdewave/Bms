import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Plus, Search, Filter, Trash2, Edit } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, CreateAppointmentModal } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { appointmentsService, Appointment } from '@/api'
import { useTranslation } from 'react-i18next'

type AppointmentRow = Appointment

export default function AdminAppointments() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission, user } = useAuth()

  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled' | 'noshow'>('all')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRow | null>(null)

  const isStaffView = user?.role === 'staff'

  useEffect(() => {
    if (!hasPermission('manage_appointments')) {
      navigate('/unauthorized')
      return
    }
    loadData()
  }, [hasPermission, navigate])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await appointmentsService.getAppointments()
      setAppointments(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm(t('appointments.confirmDelete'))) return
    try {
      await appointmentsService.deleteAppointment(id)
      setAppointments(prev => prev.filter(a => a.id !== id))
    } catch (error) {
      console.error(error)
    }
  }

  const filteredAppointments = appointments
    .filter(a => {
      const matchesSearch =
        a.clientName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || a.status.toLowerCase() === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString()

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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
            {t('appointments.new')}
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('appointments.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input ps-10 w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input"
          >
            <option value="all">{t('appointments.filters.all')}</option>
            <option value="scheduled">{t('appointments.status.scheduled')}</option>
            <option value="completed">{t('appointments.status.completed')}</option>
            <option value="cancelled">{t('appointments.status.cancelled')}</option>
            <option value="noshow">{t('appointments.status.noshow')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
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
                  <th className="px-6 py-3 text-center text-xs">{t('appointments.table.client')}</th>
                  <th className="px-6 py-3 text-center text-xs">{t('appointments.table.datetime')}</th>
                  <th className="px-6 py-3 text-center text-xs">{t('appointments.table.staff')}</th>
                  <th className="px-6 py-3 text-center text-xs">{t('appointments.table.status')}</th>
                  <th className="px-6 py-3 text-center text-xs">{t('common.actions')}</th>
                </tr>
              </thead>

              <tbody>
                {filteredAppointments.map(appointment => (
                  <tr key={appointment.id} className="hover:bg-slate-50">

                    <td className="px-6 py-4 cursor-pointer" onClick={() => navigate(`/admin/clients/${appointment.clientId}`)}>
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">{appointment.clientName}</div>
                          <div className="text-xs text-slate-500">
                            {appointment.serviceName}
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
                      {appointment.staffName || '-'}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold
                          ${appointment.status === 'Scheduled'
                            ? 'bg-blue-100 text-blue-700'
                            : appointment.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : appointment.status === 'Cancelled'
                            ? 'bg-red-100 text-red-700'
                            : appointment.status === 'NoShow'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {t(`appointments.status.${appointment.status.toLowerCase()}`)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center gap-3 justify-end">
                        <Edit
                          className="w-4 h-4 cursor-pointer text-gray-600 hover:text-blue-600"
                          onClick={() => setEditingAppointment(appointment)}
                          title={t('appointments.actions.edit')}
                        />

                        <Trash2
                          className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          title={t('appointments.actions.delete')}
                        />
                      </div>
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
          onSuccess={loadData}
        />
      )}

      {editingAppointment && (
        <CreateAppointmentModal
          mode="edit"
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSuccess={() => {
            loadData()
            setEditingAppointment(null)
          }}
        />
      )}

    </div>
  )
}