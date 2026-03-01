import { Container, PageHeader } from '@/components'
import { useTranslation } from 'react-i18next'

export default function ClientFiles() {
  const { t } = useTranslation()

  return (
    <Container>
      <PageHeader
        title={t('client.files.title')}
        description={t('client.files.subtitle')}
      />
      <div className="card p-6">
        <p className="text-slate-600">{t('client.files.placeholder')}</p>
      </div>
    </Container>
  )
}
