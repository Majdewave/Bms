import { useState, useEffect } from 'react'
import { useTenant } from '@/hooks/useTenant'
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/api'
import { useNavigate } from 'react-router-dom'
import { Container, PageHeader, Card, CardHeader, CardContent } from '@/components'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Calendar,
  Clock3,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileText,
} from 'lucide-react'
import BillingBanner from '@/components/BillingBanner'
import DashboardUpcomingAppointments from '@/components/DashboardUpcomingAppointments'

export default function AdminDashboard() {
  const navigate = useNavigate()
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
    staff_created: { icon: UserPlus, color: 'text-primary-700' },
    staff_deleted: { icon: Trash2, color: 'text-red-600' },
    user_deleted: { icon: Trash2, color: 'text-red-600' },
    client_deleted: { icon: Trash2, color: 'text-red-600' },
    client_created: { icon: Users, color: 'text-primary-700' },
    appointment_created: { icon: Calendar, color: 'text-primary-700' },
    appointment_completed: { icon: CheckCircle, color: 'text-emerald-600' },
    visit_summary_created: { icon: FileText, color: 'text-violet-600' },
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
      return (
        <span className={`inline-flex h-5 w-5 items-center justify-center ${config.color}`}>
          <Icon className="h-4 w-4" />
        </span>
      )
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

  const dayLabel = now.toLocaleDateString(locale, { weekday: 'long' })
  const dateLabel = now.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeLabel = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <Container>
      <div className="space-y-4 pb-4">
        <BillingBanner />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]" dir={dir}>
        <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-[#f5f9ff] to-white px-5 py-6 shadow-[0_2px_10px_rgba(15,23,42,0.05)] md:px-7 md:py-7">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -top-14 right-[-12%] h-44 w-72 rounded-full bg-primary-200/25 blur-3xl" />
            <div className="absolute -bottom-16 left-[-8%] h-48 w-72 rounded-full bg-primary-100/30 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(70%_100%_at_50%_100%,rgba(37,99,235,0.12),transparent_68%)]" />
          </div>

          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="text-[1.55rem] font-semibold tracking-tight text-slate-900 md:text-[2rem]">
                {t('admin.dashboard.title', { name: user?.name })}
              </h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">{t('admin.dashboard.subtitle')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => navigate('/admin/clients')}
                className="inline-flex h-10 min-w-[144px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                {t('admin.clients.add')}
              </button>
              <button
                onClick={() => navigate('/admin/appointments')}
                className="inline-flex h-10 min-w-[144px] items-center justify-center rounded-lg bg-primary-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                {t('appointments.new')}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-gradient-to-br from-primary-600 via-primary-600 to-[#4f8cff] px-5 py-5 text-white shadow-[0_10px_22px_rgba(37,99,235,0.28)]">
          <div className="flex h-full items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100">{t('dashboard.totalClients')}</p>
              <p className="mt-2 text-5xl font-semibold leading-none tracking-tight">{stats?.totalClients?.count ?? 0}</p>
              <p className="mt-2 text-xs text-blue-100">{t('dashboard.activeClients')}</p>
            </div>
            <div className="rounded-lg border border-white/25 bg-white/15 p-2.5">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </section>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card
          className="cursor-pointer rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow] duration-200 hover:scale-[1.01] hover:shadow-sm"
          onClick={() => navigate('/admin/appointments')}
        >
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 md:text-sm">{t('dashboard.appointmentsToday')}</p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
                  {stats?.appointmentsToday?.count ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-2 text-primary-700">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow] duration-200 hover:scale-[1.01] hover:shadow-sm">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 md:text-sm">{t('dashboard.completedToday')}</p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
                  {stats?.completedToday?.count ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-2 text-primary-700">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow] duration-200 hover:scale-[1.01] hover:shadow-sm"
          onClick={() => navigate('/admin/clients')}
        >
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 md:text-sm">{t('dashboard.totalClients')}</p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
                  {stats?.totalClients?.count ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-2 text-primary-700">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow] duration-200 hover:scale-[1.01] hover:shadow-sm">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 md:text-sm">{t('dashboard.notDocumentedClients')}</p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">
                  {stats?.notDocumentedClients?.count ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[transform,box-shadow] duration-200 hover:scale-[1.01] hover:shadow-sm">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 md:text-sm">{t('dashboard.dateTime')}</p>
                <p className="mt-1 text-xs text-slate-500">{dayLabel}</p>
                <p className="text-sm font-medium text-slate-700">{dateLabel}</p>
                <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900">{timeLabel}</p>
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-2 text-primary-700">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments Section */}
      <Card className="mb-8 rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
      <Card className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
