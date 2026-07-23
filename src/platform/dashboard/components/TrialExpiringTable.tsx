import { useNavigate } from 'react-router-dom'
import type { PlatformTrialExpiringItem } from '@/platform/dashboard/types'
import EmptyState from '@/platform/components/ui/EmptyState'
import { Table, TableCell, TableHeader, TableRow } from '@/platform/components/ui/Table'

interface TrialExpiringTableProps {
  items: PlatformTrialExpiringItem[]
  loading: boolean
}

const formatDate = (value: string) => new Date(value).toLocaleDateString()

export default function TrialExpiringTable({ items, loading }: TrialExpiringTableProps) {
  const navigate = useNavigate()

  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Trial Expiration</h3>
      </header>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : items.length === 0 ? (
        <EmptyState title="No upcoming trial expirations" description="All current trials are beyond the next 14 days." />
      ) : (
        <Table>
          <thead>
            <tr>
              <TableHeader>Business</TableHeader>
              <TableHeader>Owner</TableHeader>
              <TableHeader>Trial Ends</TableHeader>
              <TableHeader>Days Remaining</TableHeader>
              <TableHeader>Action</TableHeader>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <TableRow key={item.tenantId}>
                <TableCell>
                  <div className="platform-row-primary">{item.businessName}</div>
                </TableCell>
                <TableCell>{item.ownerName || '-'}</TableCell>
                <TableCell>{formatDate(item.trialEndsAt)}</TableCell>
                <TableCell>{item.daysRemaining}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    className="platform-button-secondary"
                    onClick={() => navigate(`/platform/businesses/${item.tenantId}`)}
                  >
                    View Business
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  )
}
