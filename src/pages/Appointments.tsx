import { Calendar, Plus, Search, Clock, CheckCircle, XCircle, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { appointmentsService } from '@/api'
import { AppointmentStatus } from '@/constants/appointmentStatus'
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

  const filteredAppointments = appointments.filter((apt: any) => {
    const title = apt.title ?? ''
    const service = apt.service ?? ''
    const staff = apt.staff ?? ''

    return (
      title.toLowerCase().includes(search.toLowerCase()) ||
      service.toLowerCase().includes(search.toLowerCase()) ||
      staff.toLowerCase().includes(search.toLowerCase())
    )
  })

  const normalizeStatusKey = (status: string) => {
    switch (status) {
      case AppointmentStatus.Scheduled:
        return 'Scheduled'
      case AppointmentStatus.Waiting:
        return 'Waiting'
      case AppointmentStatus.InProgress:
        return 'InProgress'
      case AppointmentStatus.Completed:
        return 'Completed'
      case AppointmentStatus.Cancelled:
        return 'Cancelled'
      case AppointmentStatus.NoShow:
        return 'NoShow'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case AppointmentStatus.Scheduled:
        return <Clock className="w-4 h-4 text-amber-600" />
      case AppointmentStatus.Completed:
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case AppointmentStatus.Cancelled:
        return <XCircle className="w-4 h-4 text-red-600" />
      case AppointmentStatus.NoShow:
        return <XCircle className="w-4 h-4 text-gray-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case AppointmentStatus.Scheduled:
        return 'bg-blue-100 text-blue-700'
      case AppointmentStatus.Waiting:
        return 'bg-yellow-100 text-yellow-700'
      case AppointmentStatus.InProgress:
        return 'bg-purple-100 text-purple-700'
      case AppointmentStatus.Completed:
        return 'bg-green-100 text-green-700'
      case AppointmentStatus.Cancelled:
        return 'bg-red-100 text-red-700'
      case AppointmentStatus.NoShow:
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
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
          <p className="text-gray-600 mt-2">
            Manage your scheduled meetings and consultations.
          </p>
        </div>

        <button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm hover:shadow-md">
          <Plus className="w-5 h-5" />
          Schedule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-3 font-semibold text-sm border-b-2 ${
            activeTab === 'upcoming'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600'
          }`}
        >
          Upcoming
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-3 font-semibold text-sm border-b-2 ${
            activeTab === 'past'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600'
          }`}
        >
          Past
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search appointments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="p-12 text-center">Loading appointments...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          No appointments found
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <table className="w-full">

            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Service</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Staff</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {filteredAppointments.map((apt: any) => (
                <tr key={apt.id} className="hover:bg-gray-50">

                  <td className="px-6 py-4">
                    {formatDate(apt.startTime)}
                  </td>

                  <td className="px-6 py-4">
                    {formatTime(apt.startTime)}
                  </td>

                  <td className="px-6 py-4">
                    {apt.service ?? '-'}
                  </td>

                  <td className="px-6 py-4">
                    {apt.staff ?? '-'}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(apt.status)}`}>
                      {normalizeStatusKey(apt.status)}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>
  )
}