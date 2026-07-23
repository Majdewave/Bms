import type { TenantUserRecord } from '@/platform/business-details/types'
import { formatDate } from '@/platform/business-details/components/detailFormatters'
import EmptyState from '@/platform/components/ui/EmptyState'
import { Table, TableCell, TableHeader, TableRow } from '@/platform/components/ui/Table'

interface UsersTableProps {
  users: TenantUserRecord[]
}

const userStatusClassMap: Record<TenantUserRecord['status'], string> = {
  Active: 'platform-badge-active',
  Inactive: 'platform-badge-expired',
  Pending: 'platform-badge-pending',
}

export default function UsersTable({ users }: UsersTableProps) {
  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Users</h3>
      </header>

      {!users.length ? (
        <EmptyState
          title="No users available"
          description="User list will appear once the business users endpoint is available."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <TableHeader>Name</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>Last Login</TableHeader>
              <TableHeader>Status</TableHeader>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="platform-row-primary">{user.name}</div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{formatDate(user.lastLoginAt)}</TableCell>
                <TableCell>
                  <span className={`platform-badge ${userStatusClassMap[user.status]}`}>{user.status}</span>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  )
}
