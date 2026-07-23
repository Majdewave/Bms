import PlatformBusinessesListView from '@/platform/businesses/components/PlatformBusinessesListView'

export default function PlatformPendingApprovalsPage() {
  return (
    <PlatformBusinessesListView
      mode="pendingApprovals"
      title="Pending Approvals"
      subtitle="Review business applications and complete approval workflows."
      detailsBasePath="/platform/pending-approvals"
      defaultStatus="Pending"
    />
  )
}
