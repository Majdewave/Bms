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
import { Container, PageHeader, Card, CardHeader, CardContent } from '@/components'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Calendar,
  UserPlus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import BillingBanner from '@/components/BillingBanner'

export default function AdminDashboard() {
  const { loading: tenantLoading } = useTenant();
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const dir = i18n.dir()
  const isRTL = dir === 'rtl'
  const [stats, setStats] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const activityConfig: Record<string, { icon: string; color: string }> = {
    staff_created: { icon: '👤', color: 'text-green-600' },
    staff_deleted: { icon: '🗑️', color: 'text-red-600' },
    client_created: { icon: '👥', color: 'text-blue-600' },
    appointment_created: { icon: '📅', color: 'text-purple-600' },
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

  const getActivityIcon = (type: string) => {
    const config = activityConfig[type]
    if (config) {
      return (
        <span className={`w-5 h-5 inline-flex items-center justify-center ${config.color}`}>
          {config.icon}
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

  return (
    <Container>
      <div className="space-y-4">
        <BillingBanner />
        <PageHeader
          title={t('admin.dashboard.title', { name: user?.name })}
          description={t('admin.dashboard.subtitle')}
        />
      </div>

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
                  { stats?.upcomingAppointmentsList ? stats.upcomingAppointmentsList.filter( (a: any) => !a.isDocumented && a.status !== 'Completed' && a.status !== 'Cancelled' ).length : 0 }
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
                        key={`${apt.id}-${idx}`}
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
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} cursor-pointer hover:bg-gray-100 transition transform`}
                    >
                      {isRTL ? (
                        <>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center gap-2 justify-start">
                              {getActivityIcon(activity.type)}
                              <span className={config.color || 'text-slate-900'}>{config.icon ? `${activityTitle}` : activityTitle}</span>
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
                              <span className={config.color || 'text-slate-900'}>{config.icon ? `${config.icon} ${activityTitle}` : activityTitle}</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" dir={dir}>
          <div className="bg-white rounded-xl p-6 w-[400px] shadow-lg">
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
              className="mt-4 w-full bg-primary-600 text-white py-2 rounded"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </Container>
  )
}
