import { useSearchParams } from 'react-router-dom'
import PlatformBusinessesListView from '@/platform/businesses/components/PlatformBusinessesListView'

const resolveInitialStatus = (rawStatus: string | null) => {
  const status = (rawStatus || '').toLowerCase()
  if (status === 'pending') return 'Pending'
  if (status === 'trial') return 'Trial'
  if (status === 'active') return 'Active'
  if (status === 'suspended') return 'Suspended'
  if (status === 'expired') return 'Expired'
  return 'all'
}

export default function PlatformBusinessesPage() {
  const [searchParams] = useSearchParams()

  return (
    <PlatformBusinessesListView
      mode="businesses"
      title="Businesses"
      subtitle="Manage all Clienta businesses."
      detailsBasePath="/platform/businesses"
      defaultStatus={resolveInitialStatus(searchParams.get('status'))}
      showAddBusinessButton
    />
  )
}
