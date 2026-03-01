import { Container, PageHeader } from '@/components'
import { useTranslation } from 'react-i18next'

export default function ClientProfile() {
  const { t } = useTranslation()

  return (
    <Container>
      <PageHeader
        title={t('client.profile.title')}
        description={t('client.profile.subtitle')}
      />
      <div className="card p-6">
        <p className="text-slate-600">{t('client.profile.placeholder')}</p>
      </div>
    </Container>
  )
}
