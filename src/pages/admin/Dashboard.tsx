  // Returns translated label for activity action type
  const getActionLabel = (type: string, t: any) => {
    switch (type) {
      case 'appointment_created':
        return t('dashboard.activity.appointmentCreated');
      case 'client_created':
        return t('dashboard.activity.clientCreated');
      case 'staff_created':
        return t('dashboard.activity.staffCreated');
      default:
        return type;
    }
  };
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/api'
import { Container, PageHeader, Grid, Card, CardHeader, CardContent } from '@/components'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Calendar,
  UserPlus,
  CheckCircle,
  Clock,
} from 'lucide-react'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const dir = i18n.dir()
  const isRTL = dir === 'rtl'
  const [stats, setStats] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          dashboardService.getAdminStats(),
          dashboardService.getRecentActivity(),
        ])
        setStats(statsData)
        setRecentActivity(activityData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'appointment_created':
        return <Calendar className="w-5 h-5" title={t('admin.dashboard.activity.icon.appointment_created', 'Appointment Created')} aria-label={t('admin.dashboard.activity.icon.appointment_created', 'Appointment Created')} role="img" />;
      case 'client_created':
        return <UserPlus className="w-5 h-5 text-blue-600" title={t('admin.dashboard.activity.icon.client_created', 'Client Created')} aria-label={t('admin.dashboard.activity.icon.client_created', 'Client Created')} role="img" />;
      case 'staff_created':
        return <Users className="w-5 h-5 text-purple-600" title={t('admin.dashboard.activity.icon.staff_created', 'Staff Created')} aria-label={t('admin.dashboard.activity.icon.staff_created', 'Staff Created')} role="img" />;
      default:
        return <Calendar className="w-5 h-5 text-slate-400" title={t('admin.dashboard.activity.icon.default', 'Activity')} aria-label={t('admin.dashboard.activity.icon.default', 'Activity')} role="img" />;
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'bg-green-100 text-green-700'
      case 'appointment':
        return 'bg-blue-100 text-blue-700'
      case 'client':
        return 'bg-purple-100 text-purple-700'
      case 'invoice':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title={t('admin.dashboard.title', { name: user?.name })}
        description={t('admin.dashboard.subtitle')}
      />

      {/* Stats Grid */}
      <Grid cols={3} gap="md" className="mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{t('dashboard.appointmentsToday')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats?.appointmentsToday?.count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{t('dashboard.completedToday')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats?.completedToday?.count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{t('dashboard.totalClients')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats?.totalClients?.count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* Upcoming Appointments Section */}
      <Card className="mb-8">
        <CardHeader title={t('dashboard.upcomingAppointments')} />
        <CardContent>
          {(!stats?.upcomingAppointmentsList || stats.upcomingAppointmentsList.length === 0) ? (
            <div className="text-slate-400 py-4 text-center">No upcoming appointments</div>
          ) : (
            <div className="overflow-x-auto" dir={dir}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.time')}</th>
                    <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.client')}</th>
                    <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.service')}</th>
                    <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.staff')}</th>
                    <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcomingAppointmentsList.slice(0, 5).map((apt: any, idx: number) => {
                    const dateObj = new Date(apt.startTime);
                    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <tr
                        key={apt.id}
                        className={
                          `${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`
                        }
                      >
                        <td className={`px-4 py-2 font-mono ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{time}</td>
                        <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{apt.clientName}</td>
                        <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{apt.serviceName}</td>
                        <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{apt.staffName}</td>
                        <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader 
          title={t('admin.dashboard.activity.title')}
          description={t('admin.dashboard.activity.subtitle')}
        />
        <CardContent>
          <div className="overflow-x-auto">
            <table dir={dir} className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  {isRTL ? (
                    <>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-right">{t('dashboard.activity.action')}</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-right">{t('dashboard.activity.entity')}</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-right">{t('dashboard.activity.performedBy')}</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-right">{t('dashboard.activity.time')}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-left">{t('dashboard.activity.action')}</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-left">{t('dashboard.activity.entity')}</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-left">{t('dashboard.activity.performedBy')}</th>
                      <th className="px-4 py-2 font-semibold text-slate-700 text-left">{t('dashboard.activity.time')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity, idx) => {
                  let formattedStartTime = '';
                  if (activity.startTime) {
                    const start = new Date(activity.startTime);
                    formattedStartTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }
                  // Action column
                  const action = getActionLabel(activity.type, t);
                  // Entity column
                  let entity = '';
                  if (activity.type === 'appointment_created') {
                    entity = [activity.clientName, activity.serviceName].filter(Boolean).join(' • ');
                  } else if (activity.type === 'client_created') {
                    entity = activity.clientName || '';
                  } else if (activity.type === 'staff_created') {
                    entity = activity.staffName || '';
                  }
                  // Performed By column
                  const performedBy = activity.performedBy || '';
                  // Time column
                  const time = formatRelativeTime(activity.timestamp);
                  return (
                    <tr key={activity.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      {isRTL ? (
                        <>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center gap-2 justify-start">
                              {getActivityIcon(activity.type)}
                              <span className="font-semibold text-slate-900">{action}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">{entity}</td>
                          <td className="px-4 py-2 text-right">{performedBy}</td>
                          <td className="px-4 py-2 text-sm text-slate-500 text-right">{time}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-left">
                            <div className="flex items-center gap-2">
                              {getActivityIcon(activity.type)}
                              <span className="font-semibold text-slate-900">{action}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-left">{entity}</td>
                          <td className="px-4 py-2 text-left">{performedBy}</td>
                          <td className="px-4 py-2 text-sm text-slate-500 text-left">{time}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}
