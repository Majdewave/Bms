import { useState, useEffect, useMemo } from 'react'
import { User, Plus, Search, Filter, Trash2, Edit, ArrowRight, CheckCircle, FileSignature, ChevronDown, ChevronUp, Printer, Monitor } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AppointmentTicket, CreateAppointmentModal, SignConsentModal } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { connection } from '@/lib/signalr'
import { appointmentsService, type Appointment } from '@/api/appointmentsService'
import ActionButton from '@/components/ActionButton'
import { useTranslation } from 'react-i18next'
import { scheduleAppointmentTicketPrint } from '@/utils/appointmentTicketPrint'
import { useTenant } from '@/contexts/TenantContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { queueDisplayApi } from '@/api/queueDisplay'

type AppointmentRow = Appointment

export default function AdminAppointments() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const { tenant } = useTenant()
  const { features } = useFeatures()

  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Scheduled' | 'Waiting' | 'InProgress' | 'Completed' | 'Cancelled' | 'NoShow'>('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [showHistory, setShowHistory] = useState(true)
  const [ticketToPrint, setTicketToPrint] = useState<{ appointment: AppointmentRow; queueNumber: number } | null>(null)
  const [draggedActiveId, setDraggedActiveId] = useState<string | null>(null)
  const [reorderingQueue, setReorderingQueue] = useState(false)
  const [reorderError, setReorderError] = useState<string | null>(null)

  const normalizeStatus = (status?: string | null) => (status ?? '').toLowerCase()
  const isWaitingStatus = (status?: string | null) => normalizeStatus(status) === 'waiting'
  const isInProgressStatus = (status?: string | null) => normalizeStatus(status) === 'inprogress'
  const isActiveQueueStatus = (status?: string | null) => {
    const normalized = normalizeStatus(status)
    return normalized === 'scheduled' || normalized === 'waiting' || normalized === 'inprogress'
  }
  const isSameBusinessDay = (leftDate: string, rightDate: string) => {
    const left = new Date(leftDate)
    const right = new Date(rightDate)
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    )
  }
  const displayQueueNumber = (appointment: AppointmentRow, fallback: number) => {
    if (isActiveQueueStatus(appointment.status) && typeof appointment.queueNumber === 'number') {
      return appointment.queueNumber
    }
    return fallback
  }

  // --- Queue Logic ---
  const current = appointments.find((a) => isInProgressStatus(a.status)) || null
  const waitingList = useMemo(
    () =>
      appointments
        .filter((a) => isWaitingStatus(a.status))
        .sort((a, b) => {
          const leftQueue = typeof a.queueNumber === 'number' ? a.queueNumber : Number.MAX_SAFE_INTEGER
          const rightQueue = typeof b.queueNumber === 'number' ? b.queueNumber : Number.MAX_SAFE_INTEGER

          if (leftQueue !== rightQueue) {
            return leftQueue - rightQueue
          }

          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        }),
    [appointments]
  )
  const activeQueueList = useMemo(
    () =>
      appointments
        .filter((a) => isActiveQueueStatus(a.status))
        .sort((a, b) => {
          const leftQueue = typeof a.queueNumber === 'number' ? a.queueNumber : Number.MAX_SAFE_INTEGER
          const rightQueue = typeof b.queueNumber === 'number' ? b.queueNumber : Number.MAX_SAFE_INTEGER

          if (leftQueue !== rightQueue) {
            return leftQueue - rightQueue
          }

          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        }),
    [appointments]
  )
  const next = waitingList[0] || null
  const waitingCount = waitingList.length

  
  // --- Status Actions ---
  const updateStatus = async (id: string, status: string) => {
    try {
      // If setting to inprogress, auto-complete any other inprogress
      if (status === 'InProgress') {
        const currentInProgress = appointments.find((a) => isInProgressStatus(a.status) && a.id !== id)
        if (currentInProgress) {
          await appointmentsService.updateAppointment(currentInProgress.id, { status: 'Completed' })
        }
      }
      await appointmentsService.updateAppointment(id, {
        status,
      })
      loadData()
    } catch (e) {
      // Optionally show error
    }
  }

  const reorderActiveQueue = async (targetAppointmentId: string) => {
    if (!draggedActiveId || draggedActiveId === targetAppointmentId) {
      return
    }

    const draggedAppointment = activeQueueList.find((item) => item.id === draggedActiveId)
    const targetAppointment = activeQueueList.find((item) => item.id === targetAppointmentId)

    if (!draggedAppointment || !targetAppointment) {
      setDraggedActiveId(null)
      return
    }

    if (!isSameBusinessDay(draggedAppointment.startTime, targetAppointment.startTime)) {
      setDraggedActiveId(null)
      return
    }

    const sameDayActiveQueue = activeQueueList.filter((item) =>
      isSameBusinessDay(item.startTime, draggedAppointment.startTime)
    )

    const sourceIndex = sameDayActiveQueue.findIndex((item) => item.id === draggedActiveId)
    const targetIndex = sameDayActiveQueue.findIndex((item) => item.id === targetAppointmentId)

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedActiveId(null)
      return
    }

    const reordered = [...sameDayActiveQueue]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    const previousAppointments = appointments
    const preservedQueueNumbers = sameDayActiveQueue.map((item, index) =>
      typeof item.queueNumber === 'number' ? item.queueNumber : index + 1
    )

    const renumbered = reordered.map((item, index) => ({
      ...item,
      queueNumber: preservedQueueNumbers[index],
    }))

    const queueLookup = new Map(renumbered.map((item) => [item.id, item.queueNumber] as const))
    setAppointments((prev) =>
      prev.map((appointment) => {
        const queueNumber = queueLookup.get(appointment.id)
        if (queueNumber === undefined) {
          return appointment
        }
        return { ...appointment, queueNumber }
      })
    )

    setReorderingQueue(true)
    setReorderError(null)
    try {
      await appointmentsService.reorderWaitingQueue(
        renumbered.map((item) => ({ id: item.id, queueNumber: item.queueNumber as number }))
      )
      await loadData()
    } catch (error) {
      console.error(error)
      setAppointments(previousAppointments)
      setReorderError('Failed to save queue order. Please try again.')
    } finally {
      setReorderingQueue(false)
      setDraggedActiveId(null)
    }
  }

const markNotDocumented = async (appointment: Appointment) => {
  try {
    await appointmentsService.markNotDocumented(appointment)
    await loadData()
  } catch (error) {
    console.error(error)
  }
}

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [openingQueueDisplay, setOpeningQueueDisplay] = useState(false)
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
      let isMounted = true;

      const startConnection = async () => {
        if (connection.state === 'Disconnected') {
          try {
            await connection.start();
          } catch (err) {
            console.error('SignalR connection error:', err);
          }
        }
      };

      startConnection();

      const handleAppointmentUpdated = () => {
        if (isMounted) {
          loadData()
        }
      }

      connection.on('AppointmentUpdated', handleAppointmentUpdated)
      connection.on('QueueReordered', handleAppointmentUpdated)
      connection.on('WaitingQueueReordered', handleAppointmentUpdated)

      return () => {
        isMounted = false
        connection.off('AppointmentUpdated', handleAppointmentUpdated)
        connection.off('QueueReordered', handleAppointmentUpdated)
        connection.off('WaitingQueueReordered', handleAppointmentUpdated)
      }
    }, [])
      
  const loadData = async () => {
    setLoading(true)
    try {
      const result = await appointmentsService.getAppointments()
      const rows = result?.data ?? []
      setAppointments(rows)
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

const availableDepartments = useMemo(() => {
  const seen = new Map<string, { id: string; name: string }>()

  appointments.forEach((appointment) => {
    if (!appointment.departmentId || !appointment.departmentName || seen.has(appointment.departmentId)) {
      return
    }

    seen.set(appointment.departmentId, {
      id: appointment.departmentId,
      name: appointment.departmentName,
    })
  })

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
}, [appointments])

const filteredAppointments = appointments
  .filter(a => {
    const matchesSearch =
      a.clientName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || a.status.toLowerCase() === statusFilter.toLowerCase()

    const matchesDepartment =
      departmentFilter === 'all' || a.departmentId === departmentFilter

    return matchesSearch && matchesStatus && matchesDepartment
  })


const activeAppointments = filteredAppointments.filter(a =>
  a.status !== 'Completed' &&
  a.status !== 'Cancelled' &&
  a.status !== 'NoShow'
);


const historyAppointments = filteredAppointments
  .filter(a =>
    a.status === 'Completed' ||
    a.status === 'Cancelled' ||
    a.status === 'NoShow'
  )
  .sort((a, b) =>
    new Date(b.endTime).getTime() -
    new Date(a.endTime).getTime()
  );

  useEffect(() => {
    if (!ticketToPrint) {
      return
    }

    const timerId = scheduleAppointmentTicketPrint()
    const handleAfterPrint = () => setTicketToPrint(null)

    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      window.clearTimeout(timerId)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [ticketToPrint])


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

  const renderDepartmentBadge = (appointment: AppointmentRow, compact = false) => {
    if (!appointment.departmentId || !appointment.departmentName) {
      return null
    }

    const color = appointment.departmentColor || '#6b7280'
    const badgeClass = compact
      ? 'inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium leading-none max-w-full'
      : 'inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium leading-none max-w-full'

    return (
      <span
        className={badgeClass}
        title={appointment.departmentName}
        style={{ color, borderColor: color, backgroundColor: 'rgba(255, 255, 255, 0.92)' }}
      >
        <span className="truncate">{appointment.departmentName}</span>
      </span>
    )
  }

  const handlePrintAppointment = (appointment: AppointmentRow, queueNumber: number) => {
    setTicketToPrint({ appointment, queueNumber })
  }

  const openQueueDisplay = async () => {
    if (!features?.queueDisplayEnabled || openingQueueDisplay) {
      return
    }

    setOpeningQueueDisplay(true)
    try {
      const link = await queueDisplayApi.getAccessLink()
      const url = `${window.location.origin}/queue-display/${link.publicToken}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Failed to open queue display', error)
    } finally {
      setOpeningQueueDisplay(false)
    }
  }


  const markDocumented = async (appointment: Appointment) => {
  try {
    await appointmentsService.updateAppointment(appointment.id, {
      ...appointment,
      isDocumented: true
    })

    await loadData()
  } catch (error) {
    console.error(error)
  }
}

  const renderAppointmentsTable = (rows: AppointmentRow[]) => {
    if (loading) {
      return (
        <div className="p-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      )
    }

    return (
      <>
        {reorderingQueue && (
          <div className="mx-3 mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Saving queue order...</span>
          </div>
        )}
        {reorderError && !reorderingQueue && (
          <div className="mx-3 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {reorderError}
          </div>
        )}
        {/* Mobile: cards */}
        <div className="flex flex-col gap-2 md:hidden p-3">
          {rows.map((appointment, idx) => {
            const isCurrent = isInProgressStatus(appointment.status)
            const isNotDocumented = appointment.isDocumented === false
            const isActiveQueueItem = isActiveQueueStatus(appointment.status)
            const queueNumber = displayQueueNumber(appointment, idx + 1)
           const hasConsent = appointment.hasSignedConsent === true
           return (
              <div
                key={`m-${appointment.id}`}
                draggable={isActiveQueueItem && !reorderingQueue}
                onDragStart={() => {
                  if (isActiveQueueItem) {
                    setDraggedActiveId(appointment.id)
                  }
                }}
                onDragEnd={() => setDraggedActiveId(null)}
                onDragOver={(event) => {
                  if (isActiveQueueItem) {
                    event.preventDefault()
                  }
                }}
                onDrop={(event) => {
                  if (isActiveQueueItem) {
                    event.preventDefault()
                    reorderActiveQueue(appointment.id)
                  }
                }}
                className={`rounded-xl px-4 py-3 flex flex-col gap-2 ${
                  isNotDocumented
                    ? 'bg-red-50 border border-red-100'
                    : isCurrent
                    ? 'bg-blue-50 border border-blue-100'
                    : idx % 2 === 0
                    ? 'bg-sky-100 border border-sky-200'
                    : 'bg-white border border-slate-100'
                } ${isActiveQueueItem ? 'cursor-move' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 text-slate-500 text-sm font-medium">
                  <span>{queueNumber}</span>
                  <button
                    type="button"
                    onClick={() => handlePrintAppointment(appointment, queueNumber)}
                    className="inline-flex items-center justify-center rounded-full p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    aria-label={t('common.print')}
                    title={t('common.print')}
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-sm text-slate-700">
                  <span className="text-slate-500">{t('appointments.table.client')}:</span>{' '}
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold text-base cursor-pointer hover:underline ${
                          isNotDocumented ? 'text-red-600' : 'text-slate-800'
                        }`}
                        onClick={() => navigate(`/admin/clients/${appointment.clientId}`)}
                      >
                        {appointment.clientName}
                      </span>

                      {showHistory &&
                        appointment.status === 'Completed' &&
                        idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            🟢 חדש
                          </span>
                      )}
                    </div>
                </div>

                <div className="text-sm text-slate-700 font-mono">
                  <span className="text-slate-500">{t('appointments.table.datetime')}:</span> {formatDate(appointment.startTime)} {formatTime(appointment.startTime)}
                </div>

                <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500">שירות:</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                    {appointment.serviceName}
                  </span>
                  {renderDepartmentBadge(appointment, true)}
                </div>

                {appointment.staffName && (
                  <>
                    <div className="text-sm text-slate-700">
                      <span className="text-slate-500">{t('appointments.table.staff')}:</span> {appointment.staffName}
                    </div>
                  </>
                )}

                <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500">{t('appointments.table.status')}:</span>
                  <span className={`px-2 py-0.5 rounded-full text-sm font-semibold ${
                    getStatusBadgeClass(appointment.status)
                  }`}>
                    {t(`appointments.status.${appointment.status?.toLowerCase()}`)}
                  </span>
                  {isNotDocumented && (
                    <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-red-100 text-red-700">לא מתועד</span>
                  )}
                  {hasConsent ? (
                    <span className="flex items-center gap-1 text-green-700 text-sm font-medium">
                      <CheckCircle className="w-3 h-3" />נחתם
                    </span>
                  ) : (
                    <span
                      className="flex items-center gap-1 text-blue-600 text-sm font-medium cursor-pointer hover:underline"
                      onClick={() => setConsentAppointment(appointment)}
                    >
                      <FileSignature className="w-3 h-3" />חתום
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {appointment.status === 'Scheduled' && (
                    <ActionButton type="arrived" onClick={() => updateStatus(appointment.id, 'Waiting')} />
                  )}
                  {appointment.status === 'Waiting' && (
                    <ActionButton type="start" onClick={() => updateStatus(appointment.id, 'InProgress')} />
                  )}
                  {appointment.status === 'InProgress' && (
                    <ActionButton type="complete" onClick={() => updateStatus(appointment.id, 'Completed')} />
                  )}
                  {appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
                    <ActionButton type="cancel" onClick={() => updateStatus(appointment.id, 'Cancelled')} />
                  )}
                  {appointment.status !== 'NoShow' && appointment.status !== 'Completed' && (
                    <ActionButton type="noshow" onClick={() => updateStatus(appointment.id, 'NoShow')} />
                  )}
                  {appointment.status === 'Completed' && appointment.isDocumented !== false && (
                    <ActionButton type="notDocumented" onClick={() => markNotDocumented(appointment)} />
                  )}
                  {appointment.isDocumented === false && (
                    <button onClick={() => markDocumented(appointment)} className="px-2 py-1 rounded bg-green-100 text-green-700 text-sm">סמן כמתועד</button>
                  )}
                  <Edit
                    className="w-4 h-4 cursor-pointer text-gray-500 hover:text-blue-600 ms-auto"
                    onClick={() => setEditingAppointment(appointment)}
                  />
                  <Trash2
                    className="w-4 h-4 cursor-pointer text-red-500 hover:text-red-700"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: original table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="w-12 px-3 py-3 text-center text-sm">#</th>
              <th className="px-6 py-3 text-center text-sm">{t('appointments.table.client')}</th>
              <th className="px-6 py-3 text-center text-sm">{t('appointments.table.datetime')}</th>
              <th className="px-6 py-3 text-center text-sm">{t('appointments.table.staff')}</th>
              <th className="px-6 py-3 text-center text-sm bg-slate-50 border-x border-slate-100">{t('appointments.table.status')}</th>
              <th className="px-6 py-3 text-center text-sm bg-slate-100/70 border-s border-slate-200">{t('common.actions')}</th>
            </tr>
          </thead>

          <tbody>
             {rows.map((appointment, index) => {
              const isCurrent = isInProgressStatus(appointment.status)
              const isNotDocumented = appointment.isDocumented === false
              const isActiveQueueItem = isActiveQueueStatus(appointment.status)
              const queueNumber = displayQueueNumber(appointment, index + 1)
              const hasConsent = appointment.hasSignedConsent === true
             const isSelected = consentAppointment?.id === appointment.id

              return (
                <tr
                  key={appointment.id}
                  draggable={isActiveQueueItem && !reorderingQueue}
                  onDragStart={() => {
                    if (isActiveQueueItem) {
                      setDraggedActiveId(appointment.id)
                    }
                  }}
                  onDragEnd={() => setDraggedActiveId(null)}
                  onDragOver={(event) => {
                    if (isActiveQueueItem) {
                      event.preventDefault()
                    }
                  }}
                  onDrop={(event) => {
                    if (isActiveQueueItem) {
                      event.preventDefault()
                      reorderActiveQueue(appointment.id)
                    }
                  }}
                  className={`transition
                    ${isSelected ? 'bg-blue-50 border border-blue-100' : ''}
                    ${isCurrent ? 'bg-blue-50 border border-blue-100' : ''}
                    ${isNotDocumented ? 'bg-red-50' : ''}
                    ${isActiveQueueItem ? 'cursor-move' : ''}
                  `}
                >

                  <td className="px-3 py-3 text-center text-slate-500 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <span>{queueNumber}</span>
                        <button
                          type="button"
                          onClick={() => handlePrintAppointment(appointment, queueNumber)}
                          className="inline-flex items-center justify-center rounded-full p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          aria-label={t('common.print')}
                          title={t('common.print')}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/admin/clients/${appointment.clientId}`)}>
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-primary" />
                      <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-slate-800 ${
                            isNotDocumented ? 'text-red-600' : ''
                          }`}
                        >
                          {appointment.clientName}
                        </span>

                        {showHistory &&
                          appointment.status === 'Completed' &&
                          index === 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                              🟢 חדש
                            </span>
                        )}
                      </div>
                        <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                          {appointment.serviceName}
                        </span>
                        {renderDepartmentBadge(appointment)}
                        <div className="mt-1 flex gap-2 items-center">
                          {hasConsent ? (
                            <span className="flex items-center gap-1 text-green-700 text-sm font-medium opacity-80" title="הסכמה כבר נחתמה">
                              <CheckCircle className="w-3 h-3" />
                              נחתם
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 text-blue-600 text-sm font-medium cursor-pointer hover:underline opacity-80 hover:opacity-100"
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
                  <td className="px-4 py-3 text-center bg-slate-50 border-x border-slate-200">
                      <span
                          className={`px-2 py-1 text-sm rounded-full font-medium ${getStatusBadgeClass(
                              appointment.status
                          )}`}
                      >
                          {t(`appointments.status.${appointment.status?.toLowerCase()}`)}
                      </span>

                      {isNotDocumented && (
                          <span className="ml-2 px-2 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                              לא מתועד
                          </span>
                      )}
                  </td>
                  <td className="px-4 py-3 text-end bg-slate-100/70 border-s border-slate-200">
                    <div className="flex items-center gap-2 justify-end flex-wrap">
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
                      {appointment.status === 'Completed' && appointment.isDocumented !== false && (
                        <ActionButton
                          type="notDocumented"
                          onClick={() => markNotDocumented(appointment)}
                        />
                      )}
                      {appointment.isDocumented === false && (
                      <button
                        onClick={() => markDocumented(appointment)}
                        className="px-2 py-1 rounded bg-green-100 text-green-700 text-sm"
                      >
                        סמן כמתועד
                      </button>
                    )}
                      <div className="flex gap-2 opacity-70 hover:opacity-100">
                        <Edit
                          className="w-4 h-4 cursor-pointer text-gray-600 hover:text-blue-600"
                          onClick={() => setEditingAppointment(appointment)}
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
      </>
    )
  }


  const businessName = tenant?.businessName || tenant?.name || tenant?.legalBusinessName || ''

  return (
    <>
    <div className="space-y-6 print:hidden">

      {/* Queue Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500 mb-1">{t('currentPatient')}</div>
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
          <div className="text-sm text-gray-500 mb-1">{t('nextPatient')}</div>
          {next ? (
            <div className="flex items-center gap-2 font-semibold text-yellow-700">
              <ArrowRight className="w-5 h-5 text-yellow-500" />
              #{next.queueNumber ?? '-'} {next.clientName}
            </div>
          ) : (
            <div className="text-gray-400">{t('none')}</div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500 mb-1">{t('waitingCount')}</div>
          <div className="font-bold text-lg text-yellow-700">{waitingCount}</div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">{t('appointments.title')}</h1>
            <p className="text-base text-slate-600 mt-2">{t('appointments.subtitle')}</p>
          </div>

          <div className="w-full md:w-auto">
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:justify-end">
              {features?.queueDisplayEnabled && (
                <button
                  type="button"
                  onClick={openQueueDisplay}
                  disabled={openingQueueDisplay}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Monitor className="h-4 w-4" />
                  {openingQueueDisplay ? t('common.loading') : t('queueDisplay.openDisplay')}
                </button>
              )}

              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary btn-md gap-2 w-full justify-center md:w-auto"
              >
                <Plus className="w-4 h-4" />
                {t('appointments.new')}
              </button>
            </div>
          </div>
        </div>
      </div>

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

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="input"
          >
            <option value="all">כל המחלקות</option>
            {availableDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {renderAppointmentsTable(activeAppointments)}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="
flex items-center gap-2
px-4 py-2
bg-slate-100 hover:bg-slate-200
border border-slate-200
rounded-lg
font-medium
transition
"
        >
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showHistory
            ? `▼ היסטוריה (${historyAppointments.length})`
            : `▶ היסטוריה (${historyAppointments.length})`}
        </button>
      </div>

      {showHistory && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-800">היסטוריה</h3>
          <div className="card overflow-hidden">
            {renderAppointmentsTable(historyAppointments)}
          </div>
        </div>
      )}

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

    {ticketToPrint ? (
      <div className="hidden print:block">
        <AppointmentTicket
          appointment={ticketToPrint.appointment}
          queueNumber={ticketToPrint.queueNumber}
          business={{
            name: businessName,
            phone: tenant?.phone ?? null,
          }}
        />
      </div>
    ) : null}
    </>
  )
}