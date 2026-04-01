import { Plus, Search } from 'lucide-react'
import ActionButton from '@/components/ActionButton'
import { useState, useEffect } from 'react'
import { appointmentsService } from '@/api/appointmentsService'
import { AppointmentStatus } from '@/constants/appointmentStatus'
import type { Appointment } from '@/api/appointmentsService'


type TabType = 'upcoming' | 'past'

export default function Appointments() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [search, setSearch] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const loadAppointments = async () => {
    setLoading(true)
    try {
      let data = null

      if (activeTab === 'upcoming') {
        data = await appointmentsService.getUpcomingAppointments()
      } else {
        data = await appointmentsService.getPastAppointments()
      }

      setAppointments(data || [])
    } catch (error) {
      console.warn('Failed to load appointments:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await appointmentsService.updateAppointment(id, { status })
      await loadAppointments()
    } catch (error) {
      console.error(error)
    }
  }


const markNotDocumented = async (appointment: Appointment) => {
  try {
    await appointmentsService.markNotDocumented(appointment)
    await loadAppointments()
  } catch (error) {
    console.error(error)
  }
}

  useEffect(() => {
    loadAppointments()
  }, [activeTab])

  const filteredAppointments = appointments.filter((apt: any) => {
    const name = apt.clientName ?? ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

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

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold">Appointments</h1>

        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg flex gap-2">
          <Plus className="w-5 h-5" />
          Schedule
        </button>
      </div>

      <input
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded-lg w-full"
      />

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full border">
          <tbody>
            {filteredAppointments.map((apt) => {
              const isNotDocumented = apt.isDocumented === false

              return (
                <tr
                  key={apt.id}
                  className={`border-b ${isNotDocumented ? 'bg-red-50' : ''}`}
                >
                  <td className={`p-3 ${isNotDocumented ? 'text-red-600' : ''}`}>
                    {apt.clientName}
                  </td>

                  <td className="p-3">{apt.staffName ?? '-'}</td>

                  <td className="p-3">
                    <span className={`px-2 py-1 rounded ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                  </td>

                  <td className="p-3 flex gap-2">

                    <ActionButton
                      type="start"
                      onClick={() => updateStatus(apt.id, 'InProgress')}
                    />

                    <ActionButton
                      type="complete"
                      onClick={() => updateStatus(apt.id, 'Completed')}
                    />

                    <ActionButton
                      type="cancel"
                      onClick={() => updateStatus(apt.id, 'Cancelled')}
                    />

                    {apt.status === 'Completed' && apt.isDocumented !== false && (
                      <ActionButton
                        type="notDocumented"
                        onClick={() => markNotDocumented(apt)}
                      />
                    )}

                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}