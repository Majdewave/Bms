import { useAuth } from '@/contexts/AuthContext'
import { Container, PageHeader, Grid, Card, CardContent } from '@/components'
import { Calendar, FileText, FolderOpen, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ClientDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const stats = [
    { label: t('client.dashboard.stats.nextAppointment'), value: 'Feb 15', icon: Calendar, color: 'text-blue-600' },
    { label: t('client.dashboard.stats.pendingInvoices'), value: '2', icon: FileText, color: 'text-amber-600' },
    { label: t('client.dashboard.stats.filesAvailable'), value: '8', icon: FolderOpen, color: 'text-green-600' },
    { label: t('client.dashboard.stats.lastVisit'), value: t('client.dashboard.stats.lastVisitValue'), icon: Clock, color: 'text-purple-600' },
  ]

  return (
    <Container>
      <PageHeader
        title={t('client.dashboard.title', { name: user?.name })}
        description={t('client.dashboard.subtitle')}
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
                    <p className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-slate-50 ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </Grid>
    </Container>
  )
}
