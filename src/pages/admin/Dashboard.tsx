import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/api'
import { Container, PageHeader, Grid, Card, CardHeader, CardContent } from '@/components'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle,
} from 'lucide-react'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const dir = i18n.dir()
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
      case 'payment':
        return <DollarSign className="w-4 h-4" title={t('admin.dashboard.activity.icon.payment', 'Payment')} alt={t('admin.dashboard.activity.icon.payment', 'Payment')} />
      case 'appointment':
        return <Calendar className="w-4 h-4" title={t('admin.dashboard.activity.icon.appointment', 'Appointment')} alt={t('admin.dashboard.activity.icon.appointment', 'Appointment')} />
      case 'client':
        return <UserPlus className="w-4 h-4" title={t('admin.dashboard.activity.icon.client', 'Client')} alt={t('admin.dashboard.activity.icon.client', 'Client')} />
      case 'invoice':
        return <FileText className="w-4 h-4" title={t('admin.dashboard.activity.icon.invoice', 'Invoice')} alt={t('admin.dashboard.activity.icon.invoice', 'Invoice')} />
      default:
        return <Clock className="w-4 h-4" title={t('admin.dashboard.activity.icon.default', 'Activity')} alt={t('admin.dashboard.activity.icon.default', 'Activity')} />
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
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const showDetails = activity.type === 'appointment';
              let formattedStartTime = '';
              if (showDetails && activity.startTime) {
                const start = new Date(activity.startTime);
                formattedStartTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                    {showDetails && (
                      <>
                        <p className="text-xs text-slate-700 mt-0.5">
                          {activity.clientName}
                          {activity.serviceName && ` • ${activity.serviceName}`}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          with {activity.staffName} at {formattedStartTime}
                        </p>
                      </>
                    )}
                    <p className="text-sm text-slate-600 mt-0.5">{activity.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs text-slate-500">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}
