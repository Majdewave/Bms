import { useNavigate } from 'react-router-dom'
import type { PlatformRecentRegistrationItem } from '@/platform/dashboard/types'
import BusinessStatusBadge from '@/platform/businesses/components/BusinessStatusBadge'
import { asBusinessStatus } from '@/platform/businesses/status'
import EmptyState from '@/platform/components/ui/EmptyState'
import { Table, TableCell, TableHeader, TableRow } from '@/platform/components/ui/Table'

interface RecentRegistrationsTableProps {
  items: PlatformRecentRegistrationItem[]
  loading: boolean
}

const formatDate = (value: string) => new Date(value).toLocaleDateString()

export default function RecentRegistrationsTable({ items, loading }: RecentRegistrationsTableProps) {
  const navigate = useNavigate()

  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Recent Registrations</h3>
      </header>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : items.length === 0 ? (
        <EmptyState title="No recent registrations" description="New business registrations will appear here." />
      ) : (
        <Table>
          <thead>
            <tr>
              <TableHeader>Business</TableHeader>
              <TableHeader>Owner</TableHeader>
              <TableHeader>Created</TableHeader>
              <TableHeader>Status</TableHeader>
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
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell>
                  <BusinessStatusBadge status={asBusinessStatus(item.status)} />
                </TableCell>
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
