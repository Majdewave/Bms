import { useState, useEffect } from 'react'
import { MoreVertical, Calendar, Clock, User, Plus, Search, Filter, Trash2, Edit } from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRow | null>(null)

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

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
        statusFilter === 'all' || a.status === statusFilter

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
            {t('appointments.createTitle')}
          </button>
        }
      />

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('appointments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
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
            </select>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs">{t('appointments.table.client')}</th>
                  <th className="px-6 py-3 text-left text-xs">{t('appointments.table.datetime')}</th>
                  <th className="px-6 py-3 text-left text-xs">{t('appointments.table.staff')}</th>
                  <th className="px-6 py-3 text-right text-xs">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(appointment => (
                  <tr key={appointment.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
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

                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenDropdownId(
                              openDropdownId === appointment.id ? null : appointment.id
                            )
                          }
                          className="p-2 hover:bg-slate-100 rounded-lg"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openDropdownId === appointment.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-20">
                            <button
                              onClick={() => {
                                setEditingAppointment(appointment)
                                setOpenDropdownId(null)
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              {t('appointments.actions.edit')}
                            </button>

                            <button
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('appointments.actions.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAppointmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Edit Modal */}
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