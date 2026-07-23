import BusinessRowActions from '@/platform/businesses/components/BusinessRowActions'
import BusinessStatusBadge from '@/platform/businesses/components/BusinessStatusBadge'
import { getBusinessLifecycleActions } from '@/platform/businesses/lifecycle'
import type { BusinessRecord } from '@/platform/businesses/types'
import EmptyState from '@/platform/components/ui/EmptyState'
import ErrorState from '@/platform/components/ui/ErrorState'
import SkeletonTable from '@/platform/components/ui/SkeletonTable'
import { Table, TableCell, TableHeader, TableRow } from '@/platform/components/ui/Table'

interface BusinessTableProps {
  mode?: 'businesses' | 'pendingApprovals'
  businesses: BusinessRecord[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onView: (business: BusinessRecord) => void
  onApprove: (business: BusinessRecord) => void
  onReject?: (business: BusinessRecord) => void
  onRequestMoreInfo?: (business: BusinessRecord) => void
  onSuspend: (business: BusinessRecord) => void
  onActivate: (business: BusinessRecord) => void
  onDelete: (business: BusinessRecord) => void
}

const formatDate = (value: string | null) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

export default function BusinessTable({
  mode = 'businesses',
  businesses,
  loading,
  error,
  onRetry,
  onView,
  onApprove,
  onReject,
  onRequestMoreInfo,
  onSuspend,
  onActivate,
  onDelete,
}: BusinessTableProps) {
  if (loading) {
    return <SkeletonTable columns={10} rows={8} />
  }

  if (error) {
    return <ErrorState title="Could not load businesses" description={error} onRetry={onRetry} />
  }

  if (!businesses.length) {
    return <EmptyState title="No businesses found." description="Try adjusting your filters or search terms." />
  }

  return (
    <Table>
      <thead>
        <tr>
          <TableHeader>Business</TableHeader>
          <TableHeader>Owner</TableHeader>
          <TableHeader>Email</TableHeader>
          <TableHeader>Phone</TableHeader>
          {mode === 'pendingApprovals' && <TableHeader>Business Type</TableHeader>}
          <TableHeader>Status</TableHeader>
          <TableHeader>Plan</TableHeader>
          <TableHeader>Trial Ends</TableHeader>
          <TableHeader>Created</TableHeader>
          <TableHeader>Last Login</TableHeader>
          <TableHeader>Actions</TableHeader>
        </tr>
      </thead>

      <tbody>
        {businesses.map((business) => (
          <TableRow key={business.id}>
            <TableCell>
              <div className="platform-row-primary">{business.name}</div>
            </TableCell>
            <TableCell>{business.ownerName}</TableCell>
            <TableCell>{business.email}</TableCell>
            <TableCell>{business.phone}</TableCell>
            {mode === 'pendingApprovals' && <TableCell>{business.businessType || '-'}</TableCell>}
            <TableCell>
              <BusinessStatusBadge status={mode === 'pendingApprovals' ? business.approvalStatus : business.status} />
            </TableCell>
            <TableCell>{business.plan}</TableCell>
            <TableCell>{formatDate(business.trialEndsAt)}</TableCell>
            <TableCell>{formatDate(business.createdAt)}</TableCell>
            <TableCell>{formatDate(business.lastLoginAt)}</TableCell>
            <TableCell>
              {/** lifecycle actions are derived from the current row state */}
              
              <BusinessRowActions
                mode={mode}
                onView={() => onView(business)}
                onApprove={() => onApprove(business)}
                onReject={() => onReject?.(business)}
                onRequestMoreInfo={() => onRequestMoreInfo?.(business)}
                onSuspend={() => onSuspend(business)}
                onActivate={() => onActivate(business)}
                onDelete={() => onDelete(business)}
                {...getBusinessLifecycleActions(business)}
                canReject={business.status === 'Pending'}
              />
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  )
}
