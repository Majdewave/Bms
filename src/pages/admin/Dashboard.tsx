import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardService } from '@/api'
import { Container, PageHeader, Grid, Card, CardHeader, CardContent } from '@/components'
import { useTranslation } from 'react-i18next'
import {
  Users,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  UserPlus,
} from 'lucide-react'

export default function AdminDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
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
        return <DollarSign className="w-4 h-4" />
      case 'appointment':
        return <Calendar className="w-4 h-4" />
      case 'client':
        return <UserPlus className="w-4 h-4" />
      case 'invoice':
        return <FileText className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
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
      <Grid cols={4} gap="md" className="mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{t('admin.dashboard.stats.totalClients')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats?.totalClients.count}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {stats?.totalClients.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${stats?.totalClients.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stats?.totalClients.change}
                  </span>
                  <span className="text-sm text-slate-500">{t('admin.dashboard.stats.vsLastMonth')}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{t('admin.dashboard.stats.appointmentsToday')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats?.upcomingAppointments.today}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {t('admin.dashboard.stats.thisWeek', { count: stats?.upcomingAppointments.thisWeek })}
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
                <p className="text-sm text-slate-500 font-medium">{t('admin.dashboard.stats.monthlyRevenue')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {formatCurrency(stats?.monthlyRevenue.amount, stats?.monthlyRevenue.currency)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {stats?.monthlyRevenue.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${stats?.monthlyRevenue.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {stats?.monthlyRevenue.change}
                  </span>
                  <span className="text-sm text-slate-500">{t('admin.dashboard.stats.vsLastMonth')}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-500 font-medium">{t('admin.dashboard.stats.unpaidInvoices')}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {stats?.unpaidInvoices.count}
                </p>
                <p className="text-sm text-amber-600 font-medium mt-2">
                  {t('admin.dashboard.stats.outstanding', { amount: formatCurrency(stats?.unpaidInvoices.totalAmount, stats?.unpaidInvoices.currency) })}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Card>
        <CardHeader 
          title={t('admin.dashboard.activity.title')}
          description={t('admin.dashboard.activity.subtitle')}
        />
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{activity.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{activity.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs text-slate-500">
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}
