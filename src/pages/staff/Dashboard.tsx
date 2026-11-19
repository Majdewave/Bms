import { useState, useEffect } from 'react'
import { useTenant } from '@/hooks/useTenant'
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/api'
import { Container, PageHeader, Card, CardHeader, CardContent } from '@/components'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Calendar,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileText,
} from 'lucide-react'
import BillingBanner from '@/components/BillingBanner'
import DashboardUpcomingAppointments from '@/components/DashboardUpcomingAppointments'
import AttendanceControl from '@/components/work-summary/AttendanceControl'

export default function AdminDashboard() {
  const { loading: tenantLoading } = useTenant();
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const dir = i18n.dir()
  const locale = i18n.language === 'he' ? 'he-IL' : i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const [stats, setStats] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  const activityConfig: Record<string, { icon: any; color: string }> = {
    appointment_created: { icon: Calendar, color: 'text-primary-700' },
    appointment_completed: { icon: CheckCircle, color: 'text-emerald-600' },
    visit_summary_created: { icon: FileText, color: 'text-violet-600' },
    client_created: { icon: Users, color: 'text-primary-700' },
    staff_created: { icon: UserPlus, color: 'text-primary-700' },
    staff_deleted: { icon: Trash2, color: 'text-red-600' },
    user_deleted: { icon: Trash2, color: 'text-red-600' },
    client_deleted: { icon: Trash2, color: 'text-red-600' },
  }

  const getActionLabel = (type: string) => {
    const keys: Record<string, string> = {
      appointment_created: 'appointmentCreated',
      appointment_completed: 'appointmentCompleted',
      visit_summary_created: 'visitSummaryCreated',
      client_created: 'clientCreated',
      staff_created: 'staffCreated',
      staff_deleted: 'staffDeleted',
      user_deleted: 'userDeleted',
      client_deleted: 'clientDeleted',
    }
    const key = keys[type]
    return key ? t(`dashboard.activity.${key}`) : t('dashboard.activity.unknown')
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          dashboardService.getAdminStats(),
          dashboardService.getRecentActivity(),
        ])
        setStats(statsData)
        
        // Remove duplicates from activity data
        if (Array.isArray(activityData)) {
          const unique = activityData.filter(
            (v, i, arr) => arr.findIndex(x => x.id === v.id) === i
          )
          setRecentActivity(unique)
        } else {
          setRecentActivity([])
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const getActivityIcon = (type: string) => {
    const config = activityConfig[type]
    if (config) {
      const Icon = config.icon
      return <Icon className="h-4 w-4" />
    }
    return <Calendar className="h-4 w-4 text-slate-500" />
  }

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const diffSeconds = (date.getTime() - now.getTime()) / 1000
    const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    if (Math.abs(diffSeconds) < 60) return relativeTime.format(0, 'second')
    if (Math.abs(diffSeconds) < 3600) return relativeTime.format(Math.round(diffSeconds / 60), 'minute')
    if (Math.abs(diffSeconds) < 86400) return relativeTime.format(Math.round(diffSeconds / 3600), 'hour')
    return relativeTime.format(Math.round(diffSeconds / 86400), 'day')
  }



  // Payment success toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast.success('🎉 Payment successful! Your plan is now active.');
      window.history.replaceState({}, document.title, '/admin/dashboard');
    }
  }, []);

  if (loading || tenantLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-4">
        <BillingBanner />
        <PageHeader
          title={t('admin.dashboard.title', { name: user?.name })}
          description={t('admin.dashboard.subtitle')}
          titleClassName="text-[21px] md:text-3xl font-bold text-slate-900"
        />
      </div>

      <AttendanceControl />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{t('dashboard.notDocumentedClients')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats?.notDocumentedClients?.count ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments Section */}
      <Card className="mb-8">
        <CardHeader title={t('dashboard.upcomingAppointments')} />
        <CardContent>
          <DashboardUpcomingAppointments
            appointments={stats?.upcomingAppointmentsList}
            direction={dir}
            locale={locale}
          />
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader 
          title={t('admin.dashboard.activity.title')}
          description={t('admin.dashboard.activity.subtitle')}
        />
        <CardContent>
          {recentActivity.length === 0 ? (
            <p dir={dir} className="py-8 text-center text-sm text-slate-500">{t('dashboard.activity.empty')}</p>
          ) : (
            <ol dir={dir} className="relative space-y-3 before:absolute before:inset-y-5 before:start-5 before:w-px before:bg-slate-200">
              {recentActivity.map((activity) => {
                const entity = activity.type === 'appointment_created'
                  ? [activity.clientName, activity.serviceName].filter(Boolean).join(' • ')
                  : activity.type === 'client_created' || activity.type === 'client_deleted'
                    ? activity.clientName || activity.entityName || ''
                    : activity.type === 'staff_created'
                      ? activity.staffName || ''
                      : activity.type === 'staff_deleted' || activity.type === 'user_deleted'
                        ? activity.staffName || activity.deletedStaffName || activity.deletedUserName || activity.targetName || activity.entityName || ''
                        : ''
                const performedBy = activity.performedBy || [activity.performedByName, activity.performedByEmail].filter(Boolean).join(' • ') || [activity.actorName, activity.actorEmail].filter(Boolean).join(' • ')
                const config = activityConfig[activity.type] || { color: 'text-slate-500' }

                return (
                  <li key={activity.id} className="relative flex min-w-0 items-start gap-3 md:gap-4">
                    <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm ${config.color}`} aria-hidden="true">
                      {getActivityIcon(activity.type)}
                    </span>
                    <article className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50/70">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className={`text-sm font-semibold leading-5 ${config.color}`}>{getActionLabel(activity.type)}</h3>
                          {entity && <p className="mt-1 break-words text-sm text-slate-600"><bdi>{entity}</bdi></p>}
                        </div>
                        <time className="shrink-0 text-xs text-slate-500" dateTime={activity.timestamp}>{formatRelativeTime(activity.timestamp)}</time>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {t('dashboard.activity.performedBy')}: <span className="font-medium text-slate-700"><bdi>{performedBy || t('dashboard.activity.actorUnavailable')}</bdi></span>
                      </p>
                    </article>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>

    </Container>
  )
}
