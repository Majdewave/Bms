import { Calendar, Plus, Search, Clock, CheckCircle, XCircle, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { appointmentsService } from '@/api'
import type { Appointment } from '@/api/appointmentsService'

type TabType = 'upcoming' | 'past'

export default function Appointments() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [search, setSearch] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true)
      try {
        let data = null
        if (activeTab === 'upcoming') {
          data = await appointmentsService.getUpcomingAppointments()
        } else {
          data = await appointmentsService.getPastAppointments()
        }
        if (!data) {
          setAppointments([])
        } else {
          setAppointments(data)
        }
      } catch (error) {
        console.warn('Failed to load appointments:', error)
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [activeTab])

  const filteredAppointments = appointments.filter(
    (apt) =>
      apt.title.toLowerCase().includes(search.toLowerCase()) ||
      apt.service.toLowerCase().includes(search.toLowerCase()) ||
      apt.staff.toLowerCase().includes(search.toLowerCase()),
  )

  const normalizeStatusKey = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'Scheduled'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      case 'noshow':
        return 'NoShow'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-amber-600" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'noshow':
        return <XCircle className="w-4 h-4 text-gray-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return 'bg-amber-100 text-amber-800'
      case 'completed':
        return 'bg-emerald-100 text-emerald-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'noshow':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-2">Manage your scheduled meetings and consultations.</p>
        </div>
        <button
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
          aria-label="Schedule new appointment"
        >
          <Plus className="w-5 h-5" />
          Schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'upcoming'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming
          </span>
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'past'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Past
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title, service, or staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          aria-label="Search appointments"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow overflow-hidden p-12">
          <div className="flex justify-center items-center gap-2">
            <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg mb-1">
            No {activeTab} appointments
          </p>
          <p className="text-gray-500">
            {activeTab === 'upcoming'
              ? 'Schedule a new appointment to get started'
              : 'Your past appointments will appear here'}
          </p>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Service
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Staff Member
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.map((apt) => (
                  <tr
                    key={apt.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Date */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(apt.startTime || (apt as any).date)}
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatTime(apt.startTime || (apt as any).date)}
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-semibold">{apt.service}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{apt.title}</div>
                    </td>

                    {/* Staff */}
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{apt.staff}</div>
                          {apt.duration && (
                            <div className="text-xs text-gray-500">{apt.duration}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(apt.status)}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                            apt.status,
                          )}`}
                        >
                          {t(`appointments.status.${normalizeStatusKey(apt.status)}`)}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-sm space-x-2 flex">
                      <button
                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded font-semibold transition-colors"
                        aria-label={`View details for ${apt.title}`}
                      >
                        View
                      </button>
                      {apt.status === 'scheduled' && (
                        <button
                          className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded font-semibold transition-colors"
                          aria-label={`Reschedule ${apt.title}`}
                        >
                          Reschedule
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-medium">
              Showing <span className="font-bold">{filteredAppointments.length}</span> of{' '}
              <span className="font-bold">{appointments.length}</span> appointments
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
