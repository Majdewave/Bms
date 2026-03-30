import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Plus, Search, Filter, Trash2, Edit, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, CreateAppointmentModal } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { connection } from '@/lib/signalr'
import { appointmentsService, Appointment } from '@/api'
import ActionButton from '@/components/ActionButton'
import { useTranslation } from 'react-i18next'

type AppointmentRow = Appointment

export default function AdminAppointments() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission, user } = useAuth()

  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Scheduled' | 'Waiting' | 'InProgress' | 'Completed' | 'Cancelled' | 'NoShow'>('all')
  // --- Queue Logic ---
  const current = appointments.find(a => a.status === 'InProgress') || null;
  const waitingList = appointments
    .filter(a => a.status === 'Waiting')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const next = waitingList[0] || null;
  const waitingCount = waitingList.length;

  // --- Status Actions ---
  const updateStatus = async (id: string, status: string) => {
    try {
      // If setting to inprogress, auto-complete any other inprogress
      if (status === 'InProgress') {
        const currentInProgress = appointments.find(a => a.status === 'InProgress' && a.id !== id);
        if (currentInProgress) {
          await appointmentsService.updateAppointment(currentInProgress.id, { status: 'Completed' });
        }
      }
      const appointment = appointments.find(a => a.id === id)
        if (!appointment) return

        await appointmentsService.updateAppointment(id, {
          ...appointment,
          status
        })
      loadData();
    } catch (e) {
      // Optionally show error
    }
  };

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

  // --- SignalR Real-time Updates ---
  useEffect(() => {
    if (!user?.businessId) return;

    let isMounted = true;

    const startConnection = async () => {
      if (connection.state === 'Disconnected') {
        try {
          await connection.start();
        } catch (err) {
          // Optionally handle connection error
        }
      }
      try {
        await connection.invoke('JoinTenant', user.businessId);
      } catch (err) {
        // Optionally handle join group error
      }
    };

    startConnection();

    const handleAppointmentUpdated = () => {
      if (isMounted) loadData();
    };
    connection.on('AppointmentUpdated', handleAppointmentUpdated);

    return () => {
      isMounted = false;
      connection.off('AppointmentUpdated', handleAppointmentUpdated);
    };
    // Only re-run if businessId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.businessId]);

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

      {/* Queue Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-500 mb-1">Current Patient</div>
          {current ? (
            <div className="flex items-center gap-2 font-semibold text-purple-700">
              <CheckCircle className="w-5 h-5 text-purple-500" />
              {current.clientName}
            </div>
          ) : (
            <div className="text-gray-400">None</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-500 mb-1">Next Patient</div>
          {next ? (
            <div className="flex items-center gap-2 font-semibold text-yellow-700">
              <ArrowRight className="w-5 h-5 text-yellow-500" />
              {next.clientName}
            </div>
          ) : (
            <div className="text-gray-400">None</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-500 mb-1">Waiting Count</div>
          <div className="font-bold text-lg text-yellow-700">{waitingCount}</div>
        </div>
      </div>

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
            <option value="Scheduled">{t('appointments.status.scheduled')}</option>
            <option value="Completed">{t('appointments.status.completed')}</option>
            <option value="Cancelled">{t('appointments.status.cancelled')}</option>
            <option value="NoShow">{t('appointments.status.noshow')}</option>
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
                {filteredAppointments.map(appointment => {
                  const isCurrent = appointment.status === 'InProgress';
                  const isNext = next && appointment.id === next.id;
                  return (
                  <tr
                    key={appointment.id}
                    className={`hover:bg-slate-50 transition-all ${isCurrent ? 'border-2 border-purple-400 bg-purple-50' : isNext ? 'border border-yellow-300 bg-yellow-50' : ''}`}
                  >

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
                          ${appointment.status?.toLowerCase() === 'Scheduled' && 'bg-blue-100 text-blue-700'}
                          ${appointment.status?.toLowerCase() === 'Waiting' && 'bg-yellow-100 text-yellow-700'}
                          ${appointment.status?.toLowerCase() === 'InProgress' && 'bg-purple-100 text-purple-700'}
                          ${appointment.status?.toLowerCase() === 'Completed' && 'bg-green-100 text-green-700'}
                          ${appointment.status?.toLowerCase() === 'Cancelled' && 'bg-red-100 text-red-700'}
                          ${appointment.status?.toLowerCase() === 'NoShow' && 'bg-gray-100 text-gray-700'}
                        `}
                      >
                        {t(`appointments.status.${appointment.status?.toLowerCase()}`)}
                      </span>
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
                        {appointment.status !== 'Cancelled' && (
                          <ActionButton
                            type="cancel"
                            onClick={() => updateStatus(appointment.id, 'Cancelled')}
                          />
                        )}
                        {appointment.status !== 'NoShow' && (
                          <ActionButton
                            type="noshow"
                            onClick={() => updateStatus(appointment.id, 'NoShow')}
                          />
                        )}
                        {/* Edit/Delete */}
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
                )
              })}
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