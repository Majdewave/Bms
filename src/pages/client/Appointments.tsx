import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/Layout'
import { 
  Calendar, 
  Clock, 
  User, 
  FileText,
  Search,
  Filter,
} from 'lucide-react'
import { 
  appointmentsService, 
  Appointment,
} from '@/api'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

export default function ClientAppointments() {
    const { user } = useAuth()
  const { t } = useTranslation()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all')
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

    useEffect(() => {
      loadAppointments()
    }, [])

    const loadAppointments = async () => {
      setLoading(true)
      try {
        // In a real app, this would filter by user.id (clientId)
        // For demo, we'll use 'c1' as the logged-in client ID
        const clientId = user?.id || 'c1'
        const data = await appointmentsService.getAppointments(clientId)
        setAppointments(data)
      } catch (error) {
        console.error('Failed to load appointments:', error)
      } finally {
        setLoading(false)
      }
    }

    const filteredAppointments = appointments
      .filter(apt => {
        const title = (apt as any).title ?? ''
        const service = (apt as any).service ?? ''
        const staff = (apt as any).staff ?? ''
        const matchesSearch = 
          title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.toLowerCase().includes(searchQuery.toLowerCase()) ||
          staff.toLowerCase().includes(searchQuery.toLowerCase())
      
        const today = new Date('2024-02-14')
        const rawDate = (apt as any).date || apt.startTime
        const aptDate = rawDate ? new Date(rawDate) : new Date('')
        const isUpcoming = aptDate >= today && apt.status?.toLowerCase() === 'scheduled'
        const isPast = aptDate < today || apt.status?.toLowerCase() !== 'scheduled'
      
        const matchesStatus = 
          statusFilter === 'all' ||
          (statusFilter === 'upcoming' && isUpcoming) ||
          (statusFilter === 'past' && isPast)
      
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const aDate = (a as any).date || a.startTime
        const bDate = (b as any).date || b.startTime
        return new Date(bDate || '').getTime() - new Date(aDate || '').getTime()
      })

    const formatDate = (dateString?: string) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      if (Number.isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }

    const formatTime = (dateString?: string) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      if (Number.isNaN(date.getTime())) return '-'
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    }

    const getStatusBadge = (status: string) => {
      const styles = {
        scheduled: 'bg-blue-100 text-blue-700',
        waiting: 'bg-yellow-100 text-yellow-700',
        inprogress: 'bg-purple-100 text-purple-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700',
        noshow: 'bg-gray-100 text-gray-700',
      }
      return styles[status?.toLowerCase() as keyof typeof styles] || styles.scheduled
    }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('client.appointments.title')}
        description={t('client.appointments.subtitle')}
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
              <option value="all">{t('client.appointments.filters.all')}</option>
              <option value="upcoming">{t('client.appointments.filters.upcoming')}</option>
              <option value="past">{t('client.appointments.filters.past')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-500 mt-4">{t('client.appointments.loading')}</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">{t('client.appointments.emptyTitle')}</h3>
          <p className="text-slate-500">{t('client.appointments.emptySubtitle')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedAppointment(appointment)}
            >
              <div className="flex items-start gap-4">
                {/* Date Badge */}
                <div className="flex-shrink-0 w-16 text-center">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <div className="text-2xl font-bold text-primary">
                      {(() => {
                        const rawDate = (appointment as any).date || appointment.startTime
                        const date = rawDate ? new Date(rawDate) : new Date('')
                        return Number.isNaN(date.getTime()) ? '-' : date.getDate()
                      })()}
                    </div>
                    <div className="text-xs text-slate-600 uppercase">
                      {(() => {
                        const rawDate = (appointment as any).date || appointment.startTime
                        const date = rawDate ? new Date(rawDate) : new Date('')
                        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', { month: 'short' })
                      })()}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {(appointment as any).title || appointment.clientName}
                      </h3>
                      <p className="text-sm text-slate-600">{(appointment as any).service || appointment.notes || '-'}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                        {t(`appointments.status.${appointment.status}`)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{(appointment as any).time || (appointment.startTime ? new Date(appointment.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-')}</span>
                      {appointment.duration && <span className="text-slate-400">• {appointment.duration}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{t('client.appointments.withStaff', { staff: appointment.staff })}</span>
                    </div>
                  </div>

                  {appointment.description && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                      {appointment.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAppointment(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {t('client.appointments.detailsTitle')}
              </h2>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title and Status */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {(selectedAppointment as any).title || selectedAppointment.clientName}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedAppointment.status)}`}>
                    {t(`appointments.status.${selectedAppointment.status}`)}
                  </span>
                </div>
                <p className="text-lg text-slate-600">{(selectedAppointment as any).service || selectedAppointment.notes || '-'}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-slate-500">{t('client.appointments.details.date')}</span>
                  </div>
                  <p className="text-slate-900 font-medium">
                    {formatDate((selectedAppointment as any).date || selectedAppointment.startTime)}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-slate-500">{t('client.appointments.details.time')}</span>
                  </div>
                  <p className="text-slate-900 font-medium">
                    {(selectedAppointment as any).time || formatTime(selectedAppointment.startTime)}
                    {(selectedAppointment as any).duration && (
                      <span className="text-slate-500 text-sm ml-2">
                        ({(selectedAppointment as any).duration})
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-slate-500">{t('client.appointments.details.staff')}</span>
                  </div>
                  <p className="text-slate-900 font-medium">{(selectedAppointment as any).staff || '-'}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-slate-500">{t('client.appointments.details.service')}</span>
                  </div>
                  <p className="text-slate-900 font-medium">{(selectedAppointment as any).service || '-'}</p>
                </div>
              </div>

              {/* Description */}
              {(selectedAppointment as any).description && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">{t('client.appointments.details.notes')}</h4>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-4">
                    {(selectedAppointment as any).description}
                  </p>
                </div>
              )}

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>{t('client.appointments.helpTitle')}</strong> {t('client.appointments.helpText')}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end bg-slate-50">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="btn-primary"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
