import { useAuth } from '@/contexts/AuthContext'
import { Container, PageHeader, Grid, Card, CardContent } from '@/components'
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function StaffDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const stats = [
    { label: t('staff.dashboard.stats.todayAppointments'), value: '8', icon: Calendar, color: 'text-blue-600' },
    { label: t('staff.dashboard.stats.pendingTasks'), value: '5', icon: Clock, color: 'text-amber-600' },
    { label: t('staff.dashboard.stats.completedToday'), value: '3', icon: CheckCircle, color: 'text-green-600' },
    { label: t('staff.dashboard.stats.assignedClients'), value: '24', icon: AlertCircle, color: 'text-purple-600' },
  ]

  return (
    <Container>
      <PageHeader
        title={t('staff.dashboard.title', { name: user?.name })}
        description={t('staff.dashboard.subtitle')}
      />

      <Grid cols={4} gap="md">
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
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-slate-900">{t('staff.dashboard.cardTitle')}</h4>
                <p className="text-sm text-slate-600 mt-1">
                  {t('staff.dashboard.cardText')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}
