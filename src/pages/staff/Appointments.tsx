import { useState, useEffect } from 'react'
import { User, Plus, Search, Filter, Trash2, Edit, ArrowRight, CheckCircle, FileSignature } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, CreateAppointmentModal, SignConsentModal } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { connection } from '@/lib/signalr'
import { appointmentsService, type Appointment } from '@/api/appointmentsService'
import { consentsApi, type SignedConsent } from '@/api/consents'
import ActionButton from '@/components/ActionButton'
import { useTranslation } from 'react-i18next'

type AppointmentRow = Appointment

export default function AdminAppointments() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()

  console.log('ADMIN APPOINTMENTS RENDERED');

  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [signedConsents, setSignedConsents] = useState<SignedConsent[]>([])
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

  const loadSignedConsents = async (rows: AppointmentRow[]) => {
    const clientIds = [...new Set(rows.map(r => r.clientId).filter(Boolean))]

    if (clientIds.length === 0) {
      setSignedConsents([])
      return
    }

    try {
      const responses = await Promise.all(clientIds.map(clientId => consentsApi.getSignedByClient(clientId)))
      setSignedConsents(responses.flat())
    } catch (error) {
      console.error('Failed loading signed consents:', error)
      setSignedConsents([])
    }
  }


    const loadAppointments = async () => {
    setLoading(true)

    try {
       const result = await appointmentsService.getAppointments()

      if (!result || !result.data) {
        setAppointments([])
        setSignedConsents([])
        return
      }

      setAppointments(result.data)
      await loadSignedConsents(result.data)
    } catch (error) {
      console.error('Failed loading appointments:', error)
      setAppointments([])
      setSignedConsents([])
    } finally {
      setLoading(false)
    }
  }
  
  
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

const markNotDocumented = async (appointment: Appointment) => {
  try {
    await appointmentsService.markNotDocumented(appointment)
    await loadAppointments()
  } catch (error) {
    console.error(error)
  }
}

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<AppointmentRow | null>(null)
  const [consentAppointment, setConsentAppointment] = useState<AppointmentRow | null>(null)

  useEffect(() => {
    if (!hasPermission('manage_appointments')) {
      navigate('/unauthorized')
      return
    }
    loadData()
  }, [hasPermission, navigate])

  // --- SignalR Real-time Updates ---

    useEffect(() => {
      console.log('SIGNALR EFFECT RUNNING');
      let isMounted = true;

      const startConnection = async () => {
        if (connection.state === 'Disconnected') {
          try {
            await connection.start();
            console.log('SignalR state:', connection.state);
            console.log('SignalR connectionId:', connection.connectionId);
          } catch (err) {
            console.error('SignalR connection error:', err);
          }
        }
      };

      startConnection();

      const handleAppointmentUpdated = () => {
        console.log('AppointmentUpdated received');

        if (isMounted) {
          loadData();
        }
      };

      connection.on('AppointmentUpdated', handleAppointmentUpdated);

      return () => {
        isMounted = false;
        connection.off('AppointmentUpdated', handleAppointmentUpdated);
      };
    }, []);
      
  const loadData = async () => {
    setLoading(true)
    try {
      const result = await appointmentsService.getAppointments()
      const rows = result?.data ?? []
      setAppointments(rows)
      await loadSignedConsents(rows)
    } catch (error) {
      console.error(error)
      setSignedConsents([])
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
      statusFilter === 'all' || a.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString()

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const getStatusBadgeClass = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'cancelled':
      case 'noshow':
        return 'bg-red-100 text-red-700'
      case 'scheduled':
      case 'waiting':
      case 'inprogress':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }


  return (
    <div className="space-y-6">

      {/* Queue Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-s text-gray-500 mb-1">{t('currentPatient')}</div>
          {current ? (
            <div className="flex items-center gap-2 font-semibold text-purple-700">
              <CheckCircle className="w-5 h-5 text-purple-500" />
              {current.clientName}
            </div>
          ) : (
            <div className="text-gray-400">{t('none')}</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-s text-gray-500 mb-1">{t('nextPatient')}</div>
          {next ? (
            <div className="flex items-center gap-2 font-semibold text-yellow-700">
              <ArrowRight className="w-5 h-5 text-yellow-500" />
              {next.clientName}
            </div>
          ) : (
            <div className="text-gray-400">{t('none')}</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-s text-gray-500 mb-1">{t('waitingCount')}</div>
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
                  <th className="px-6 py-3 text-center text-xs bg-slate-50 border-x border-slate-100">{t('appointments.table.status')}</th>
                 <th className="px-6 py-3 text-center text-xs bg-slate-100/70 border-s border-slate-200">{t('common.actions')}</th>
                </tr>
              </thead>

              <tbody>
                {filteredAppointments.map(appointment => {
                  const isCurrent = appointment.status === 'InProgress';
                  const isNotDocumented = appointment.isDocumented === false;
                  const hasConsent = signedConsents.some(c => c.appointmentId === appointment.id)
                  const isSelected = consentAppointment?.id === appointment.id
                  const now = new Date();
                  const appointmentDate = new Date(appointment.startTime);
                  const isPast = appointmentDate < now;

                  return (
                    <tr
                      key={appointment.id}
                      className={`px-4 py-3 rounded-xl hover:bg-slate-50 transition
                        ${isSelected ? 'bg-blue-50 border border-blue-100' : ''}
                        ${isCurrent ? 'bg-blue-50 border border-blue-100' : ''}
                        ${isNotDocumented ? 'bg-red-50' : ''}
                        ${isPast ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/admin/clients/${appointment.clientId}`)}>
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-primary" />
                          <div className="flex flex-col">
                            <span className={`font-semibold text-slate-800 ${isNotDocumented ? 'text-red-600' : ''}`}>{appointment.clientName}</span>
                            <span className="text-xs text-slate-500">
                              {appointment.serviceName}
                            </span>
                            <div className="mt-1 flex gap-2 items-center">
                              {isPast && (
                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">
                                  {t('appointments.past')}
                                </span>
                              )}
                              {hasConsent ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-medium opacity-80" title="הסכמה כבר נחתמה">
                                  <CheckCircle className="w-3 h-3" />
                                  נחתם
                                </span>
                              ) : (
                                <span
                                  className="flex items-center gap-1 text-blue-600 text-xs font-medium cursor-pointer hover:underline opacity-80 hover:opacity-100"
                                  title="לחץ לחתימה"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setConsentAppointment(appointment)
                                  }}
                                >
                                  <FileSignature className="w-3 h-3" />
                                  חתום על הסכמה
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-sm">
                          <span className="text-slate-800">
                          {formatDate(appointment.startTime)}
                          </span>
                          <span className="text-xs text-slate-500">
                          {formatTime(appointment.startTime)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {appointment.staffName || '-'}
                      </td>
                      <td className="px-4 py-3 text-center bg-slate-50 border-x border-slate-100">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeClass(appointment.status)}`}
                        >
                          {t(`appointments.status.${appointment.status?.toLowerCase()}`)}
                        </span>
                        {isNotDocumented && (
                          <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">לא מתועד</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end bg-slate-100/70 border-s border-slate-200">
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
                          {appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
                            <ActionButton
                              type="cancel"
                              onClick={() => updateStatus(appointment.id, 'Cancelled')}
                            />
                          )}
                          {appointment.status !== 'NoShow' && appointment.status !== 'Completed' && (
                            <ActionButton
                              type="noshow"
                              onClick={() => updateStatus(appointment.id, 'NoShow')}
                            />
                          )}
                          {/* Not Documented Action */}
                          {appointment.status === 'Completed' && appointment.isDocumented !== false && (
                            <ActionButton
                              type="notDocumented"
                              onClick={() => markNotDocumented(appointment)}
                            />
                          )}
                          <div className="flex gap-2 opacity-70 hover:opacity-100">
                            <Edit
                              className="w-4 h-4 cursor-pointer text-gray-600 hover:text-blue-600"
                              onClick={() => setEditingAppointment(appointment)}
                              style={isPast ? { pointerEvents: 'none', opacity: 0.5 } : {}}
                            />
                            <Trash2
                              className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800"
                              onClick={() => handleDeleteAppointment(appointment.id)}
                            />
                          </div>
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
            loadData()
          }}
        />
      )}

    </div>
  )
}