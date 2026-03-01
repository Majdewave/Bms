import { Container, PageHeader, Grid, Card, CardContent } from '@/components'
import { BarChart3, TrendingUp, DollarSign, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AdminReports() {
  const { t } = useTranslation()

  return (
    <Container>
      <PageHeader
        title={t('admin.reports.title')}
        description={t('admin.reports.description')}
      />

      <Grid cols={2} gap="lg">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('admin.reports.revenue.title')}</h3>
            </div>
            <p className="text-slate-600">{t('admin.reports.revenue.subtitle')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('admin.reports.performance.title')}</h3>
            </div>
            <p className="text-slate-600">{t('admin.reports.performance.subtitle')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('admin.reports.financial.title')}</h3>
            </div>
            <p className="text-slate-600">{t('admin.reports.financial.subtitle')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-50 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{t('admin.reports.clients.title')}</h3>
            </div>
            <p className="text-slate-600">{t('admin.reports.clients.subtitle')}</p>
          </CardContent>
        </Card>
      </Grid>
    </Container>
  )
}
