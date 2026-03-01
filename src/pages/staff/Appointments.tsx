import { useState, useEffect } from 'react'
import { PageHeader, CreateAppointmentModal } from '@/components'
import { 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  Search, 
  Filter,
  X,
} from 'lucide-react'
import { 
  appointmentsService, 
  Appointment
} from '@/api'
import { useTranslation } from 'react-i18next'

export default function StaffAppointments() {
  const { t } = useTranslation()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all')
    const [showCreateModal, setShowCreateModal] = useState(false)

    useEffect(() => {
      loadData()
    }, [])

    const loadData = async () => {
      setLoading(true)
      try {
        const appointmentsData = await appointmentsService.getAppointments()
        setAppointments(appointmentsData)
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    const handleAppointmentCreated = () => {
      loadData()
      setShowCreateModal(false)
    }

    const handleCancelAppointment = async (id: string) => {
      if (!confirm(t('appointments.confirmCancel'))) return

      try {
        const cancelled = await appointmentsService.cancelAppointment(id)
        setAppointments(appointments.map(apt => 
          apt.id === id ? cancelled : apt
        ))
      } catch (error) {
        console.error('Failed to cancel appointment:', error)
        alert(t('appointments.errors.cancelFailed'))
      }
    }

    const handleDeleteAppointment = async (id: string) => {
      if (!confirm(t('appointments.confirmDelete'))) return

      try {
        await appointmentsService.deleteAppointment(id)
        setAppointments(appointments.filter(apt => apt.id !== id))
      } catch (error) {
        console.error('Failed to delete appointment:', error)
        alert(t('appointments.errors.deleteFailed'))
      }
    }



    const filteredAppointments = appointments
      .filter(apt => {
        const matchesSearch = 
          apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          apt.service.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || apt.status === statusFilter
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const getStatusBadge = (status: string) => {
      const styles = {
        scheduled: 'bg-blue-100 text-blue-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-gray-100 text-gray-700',
      }
      return styles[status as keyof typeof styles] || styles.scheduled
    }

    const getStatusLabel = (status: string) => {
      return t(`appointments.status.${status}`)
    }

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
             קבע תור
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

      {/* Appointments Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-4">{t('appointments.loading')}</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('appointments.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('appointments.table.client')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('appointments.table.appointment')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('appointments.table.datetime')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('appointments.table.staff')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{appointment.clientName}</div>
                          <div className="text-sm text-slate-500">{appointment.clientEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{appointment.title}</div>
                      <div className="text-sm text-slate-500">{appointment.service}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(appointment.startTime || (appointment as any).date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <Clock className="w-4 h-4" />
                        <span>{appointment.time}</span>
                        {appointment.duration && <span>• {appointment.duration}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{appointment.staff}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {appointment.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleCancelAppointment(appointment.id)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title={t('appointments.actions.cancel')}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('appointments.actions.delete')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleAppointmentCreated}
      />
    </div>
  )
}
