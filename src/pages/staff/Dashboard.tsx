import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { appointmentsService, type Appointment } from '@/api/appointmentsService'
import { Container, PageHeader, Grid, Card, CardContent } from '@/components'
import { Calendar, CheckCircle, Users } from 'lucide-react'

export default function StaffDashboard() {
  const { user } = useAuth()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await appointmentsService.getAppointments()
        setAppointments(result?.data ?? [])
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // --- Calculations ---
  const today = new Date().toDateString()

  const todayAppointments = appointments.filter(a =>
    new Date(a.startTime).toDateString() === today
  )

  const completedToday = todayAppointments.filter(a =>
    a.status === 'Completed'
  )

  const totalClients = new Set(appointments.map(a => a.clientId)).size

  const upcoming = appointments
    .filter(a => new Date(a.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5)

  const stats = [
    {
      label: 'תורים היום',
      value: todayAppointments.length,
      icon: Calendar,
      color: 'text-blue-600',
    },
    {
      label: 'תורים שהושלמו היום',
      value: completedToday.length,
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      label: 'סה״כ לקוחות',
      value: totalClients,
      icon: Users,
      color: 'text-purple-600',
    },
  ]

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title={`ברוך שובך, ${user?.name}`}
        description="הנה מה שקורה בעסק שלך היום"
      />

      <Grid cols={3} gap="md">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-slate-50 ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </Grid>

      <div className="mt-8">
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">תורים קרובים</h3>

            {upcoming.length === 0 ? (
              <div className="text-center text-slate-400 py-6">
                אין תורים קרובים
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2">שעה</th>
                    <th className="p-2">לקוח</th>
                    <th className="p-2">שירות</th>
                    <th className="p-2">צוות</th>
                    <th className="p-2">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="p-2">
                        {new Date(a.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-2">{a.clientName}</td>
                      <td className="p-2">{a.serviceName || '-'}</td>
                      <td className="p-2">{a.staffName || '-'}</td>
                      <td className="p-2">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}