import type { BusinessStatus } from '@/platform/businesses/types'

const statusClassMap: Record<BusinessStatus, string> = {
  Pending: 'platform-badge-pending',
  'Under Review': 'platform-badge-under-review',
  Approved: 'platform-badge-approved',
  Rejected: 'platform-badge-rejected',
  Trial: 'platform-badge-trial',
  Active: 'platform-badge-active',
  Suspended: 'platform-badge-suspended',
  Expired: 'platform-badge-expired',
}

export default function BusinessStatusBadge({ status }: { status: BusinessStatus }) {
  return <span className={`platform-badge ${statusClassMap[status]}`}>{status}</span>
}
