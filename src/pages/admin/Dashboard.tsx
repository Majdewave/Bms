// Returns translated label for activity action type
  const getActionLabel = (type: string, t: any) => {
    switch (type) {
      case 'appointment_created':
        return t('dashboard.activity.appointmentCreated');
      case 'client_created':
        return t('dashboard.activity.clientCreated');
      case 'staff_created':
        return t('dashboard.activity.staffCreated');
      case 'staff_deleted':
        return t('dashboard.activity.staffDeleted', 'Staff deleted');
      default:
        return type;
    }
  };
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
} from 'lucide-react'
import BillingBanner from '@/components/BillingBanner'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { loading: tenantLoading } = useTenant();
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const dir = i18n.dir()
  const isRTL = dir === 'rtl'
  const [stats, setStats] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  const activityConfig: Record<string, { icon: any; color: string }> = {
    staff_created: { icon: UserPlus, color: 'text-primary-700' },
    staff_deleted: { icon: Trash2, color: 'text-red-600' },
    client_created: { icon: Users, color: 'text-primary-700' },
    appointment_created: { icon: Calendar, color: 'text-primary-700' },
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

    switch (type) {
      case 'appointment_created':
        return <Calendar className="w-5 h-5" />;
      case 'client_created':
        return <UserPlus className="w-5 h-5 text-blue-600" />;
      case 'staff_created':
        return <Users className="w-5 h-5 text-purple-600" />;
      default:
        return <Calendar className="w-5 h-5 text-slate-400" />;
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

  const locale = i18n.language === 'he' ? 'he-IL' : i18n.language === 'ar' ? 'ar-EG' : 'en-US'
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
          {(!stats?.upcomingAppointmentsList || stats.upcomingAppointmentsList.length === 0) ? (
            <div className="text-slate-400 py-4 text-center">No upcoming appointments</div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-2.5 md:hidden" dir={dir}>
                {stats.upcomingAppointmentsList.slice(0, 5).map((apt: any, idx: number) => {
                  const time = new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={`m-${apt.id}-${idx}`}
                      className={`flex flex-col gap-1.5 rounded-xl border px-4 py-3 ${
                        idx % 2 === 0 ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="text-sm text-slate-700">
                        <span className="text-slate-500">{t('dashboard.client')}:</span> {apt.clientName}
                      </div>
                      <div className="text-sm text-slate-700 font-mono">
                        <span className="text-slate-500">{t('dashboard.time')}:</span> {time}
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="text-slate-500">{t('dashboard.service')}:</span> {apt.serviceName}
                      </div>
                      {apt.staffName && (
                        <div className="text-sm text-slate-700">
                          <span className="text-slate-500">{t('dashboard.staff')}:</span> {apt.staffName}
                        </div>
                      )}
                      <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">{t('dashboard.status')}:</span>
                        <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-sm font-semibold text-slate-700 capitalize">
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: original table */}
              <div className="hidden md:block overflow-x-auto" dir={dir}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.time')}</th>
                      <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.client')}</th>
                      <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.service')}</th>
                      <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.staff')}</th>
                      <th className={`px-4 py-2 font-semibold text-slate-700 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t('dashboard.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.upcomingAppointmentsList.slice(0, 5).map((apt: any, idx: number) => {
                      const time = new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <tr key={`d-${apt.id}-${idx}`} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} transition-colors hover:bg-slate-100`}>
                          <td className={`px-4 py-2 font-mono ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{time}</td>
                          <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{apt.clientName}</td>
                          <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{apt.serviceName}</td>
                          <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{apt.staffName}</td>
                          <td className={`px-4 py-2 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                            <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 capitalize">{apt.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CardHeader 
          title={t('admin.dashboard.activity.title')}
          description={t('admin.dashboard.activity.subtitle')}
        />
        <CardContent>
          {/* Mobile: activity cards */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {recentActivity.map((activity, idx) => {
              const action = getActionLabel(activity.type, t);
              let entity = '';
              if (activity.type === 'appointment_created') {
                entity = [activity.clientName, activity.serviceName].filter(Boolean).join(' • ');
              } else if (activity.type === 'client_created') {
                entity = activity.clientName || '';
              } else if (activity.type === 'staff_created') {
                entity = activity.staffName || '';
              } else if (activity.type === 'staff_deleted') {
                entity = activity.staffName || activity.deletedStaffName || activity.deletedUserName || activity.targetName || activity.entityName || '';
              } else if (activity.type === 'client_deleted') {
                entity = activity.clientName || activity.entityName || '';
              } else if (activity.type === 'user_deleted') {
                entity = activity.staffName || activity.entityName || '';
              }
              const performedBy = activity.performedBy || [activity.performedByName, activity.performedByEmail].filter(Boolean).join(' • ') || [activity.actorName, activity.actorEmail].filter(Boolean).join(' • ') || '';
              const time = formatRelativeTime(activity.timestamp);
              const activityTitle = activity.title || action;
              const config = activityConfig[activity.type] || {};
              return (
                <div
                  key={`m-${activity.id}-${idx}`}
                  onClick={() => setSelectedActivity({ ...activity, title: activityTitle, performedBy })}
                  className={`cursor-pointer rounded-xl border px-4 py-3 flex flex-col gap-1.5 ${
                    idx % 2 === 0 ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500">{t('dashboard.activity.action')}:</span>
                    {getActivityIcon(activity.type)}
                    <span className={`text-base font-semibold ${config.color || 'text-slate-900'}`}>{activityTitle}</span>
                  </div>
                  {entity && (
                    <div className="text-xs text-slate-700">
                      <span className="text-slate-500">{t('dashboard.activity.entity')}:</span> {entity}
                    </div>
                  )}
                  {performedBy && (
                    <div className="text-xs text-slate-700">
                      <span className="text-slate-500">{t('dashboard.activity.performedBy')}:</span> {performedBy}
                    </div>
                  )}
                  <div className="text-xs text-slate-700">
                    <span className="text-slate-500">{t('dashboard.activity.time')}:</span> <span className="text-slate-400">{time}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: original table */}
          <div className="hidden md:block overflow-x-auto">
            <table dir={dir} className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
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
                  } else if (activity.type === 'staff_deleted') {
                    entity =
                      activity.staffName ||
                      activity.deletedStaffName ||
                      activity.deletedUserName ||
                      activity.targetName ||
                      activity.entityName ||
                      '';
                  }
                  else if (activity.type === 'client_deleted') {
                  entity = activity.clientName || activity.entityName || '';
                  }
                  else if (activity.type === 'user_deleted') {
                    entity = activity.staffName || activity.entityName || '';
                  }
                  // Performed By column
                  const performedBy =
                    activity.performedBy ||
                    [activity.performedByName, activity.performedByEmail].filter(Boolean).join(' • ') ||
                    [activity.actorName, activity.actorEmail].filter(Boolean).join(' • ') ||
                    '';
                  // Time column
                  const time = formatRelativeTime(activity.timestamp);
                  const activityTitle = activity.title || action;
                  const config = activityConfig[activity.type] || {};
                  return (
                    <tr
                      key={`${activity.id}-${idx}`}
                      onClick={() => setSelectedActivity({ ...activity, title: activityTitle, performedBy })}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} cursor-pointer transition-colors hover:bg-slate-100`}
                    >
                      {isRTL ? (
                        <>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center gap-2 justify-start">
                              {getActivityIcon(activity.type)}
                              <span className={config.color || 'text-slate-900'}>{activityTitle}</span>
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
                              <span className={config.color || 'text-slate-900'}>{activityTitle}</span>
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

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45" dir={dir}>
          <div className="w-[400px] rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
            <h2 className="text-lg font-bold mb-4">
              {selectedActivity.title}
            </h2>

            <div className="space-y-2 text-sm">
              <div>
                <strong>סוג פעולה:</strong> {selectedActivity.type}
              </div>

              <div>
                <strong>בוצע על ידי:</strong> {selectedActivity.performedBy}
              </div>

              {selectedActivity.staffName && (
                <div>
                  <strong>איש צוות:</strong> {selectedActivity.staffName}
                </div>
              )}

              {selectedActivity.clientName && (
                <div>
                  <strong>לקוח:</strong> {selectedActivity.clientName}
                </div>
              )}

              {selectedActivity.serviceName && (
                <div>
                  <strong>שירות:</strong> {selectedActivity.serviceName}
                </div>
              )}

              <div>
                <strong>תאריך:</strong>{' '}
                {new Date(selectedActivity.timestamp).toLocaleString()}
              </div>
            </div>

            <button
              onClick={() => setSelectedActivity(null)}
              className="mt-4 w-full rounded-xl bg-primary-600 py-2 text-white transition-colors hover:bg-primary-700"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </Container>
  )
}
