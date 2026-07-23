import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Plus, RefreshCw, Shield, ShieldOff, Users } from 'lucide-react'
import EmptyState from '@/platform/components/ui/EmptyState'
import ErrorState from '@/platform/components/ui/ErrorState'
import FilterDropdown from '@/platform/components/ui/FilterDropdown'
import Pagination from '@/platform/components/ui/Pagination'
import SearchInput from '@/platform/components/ui/SearchInput'
import SkeletonTable from '@/platform/components/ui/SkeletonTable'
import { Table, TableCell, TableHeader, TableRow } from '@/platform/components/ui/Table'
import { usePlatformAuth } from '@/platform/auth/PlatformAuthContext'
import PlatformUserActionMenu from '@/platform/users/components/PlatformUserActionMenu'
import {
  createPlatformUser,
  deletePlatformUser,
  disablePlatformUser,
  enablePlatformUser,
  fetchPlatformUsers,
  forcePlatformUserPasswordReset,
  resetPlatformUserPassword,
  updatePlatformUser,
  type PlatformUserRecord,
  type PlatformUsersResult,
} from '@/platform/users/services/platformUsersService'
import { PlatformApiError } from '@/platform/services/platformApiClient'

const rowsPerPageOptions = [10, 20, 50]
const roles = ['all', 'Super Admin', 'Platform Admin', 'Support Staff']
const statuses = ['all', 'Active', 'Disabled']

const defaultForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'Support Staff',
  isActive: true,
  forcePasswordReset: false,
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="platform-stat-card">
      <div className="platform-stat-top">
        <div>
          <p className="platform-stat-label">{label}</p>
          <p className="platform-stat-value">{value}</p>
        </div>
        <div className="platform-stat-icon">{icon}</div>
      </div>
    </div>
  )
}

function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="platform-modal-backdrop" onClick={onClose}>
      <div className="platform-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="platform-modal-header">
          <div>
            <h3 className="platform-modal-title">{title}</h3>
            {description && <p className="platform-modal-description">{description}</p>}
          </div>
          <button type="button" className="platform-button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function PlatformUsersPage() {
  const { currentUser } = usePlatformAuth()
  const [users, setUsers] = useState<PlatformUserRecord[]>([])
  const [stats, setStats] = useState<PlatformUsersResult['stats']>({
    totalUsers: 0,
    active: 0,
    disabled: 0,
    superAdmins: 0,
    supportStaff: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view' | 'resetPassword' | null>(null)
  const [selectedUser, setSelectedUser] = useState<PlatformUserRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const loadRef = useRef<() => void>(() => {})

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchPlatformUsers({
        page,
        pageSize: rowsPerPage,
        search,
        role,
        status,
        sort: 'newest',
      }, signal)
      setUsers(result.items)
      setStats(result.stats)
      setTotal(result.total)
      setPage(result.page)
      setRowsPerPage(result.pageSize)
    } catch (err) {
      if (signal?.aborted) return
      setError(err instanceof PlatformApiError ? err.message : 'Could not load platform users.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [page, rowsPerPage, role, search, status])

  useEffect(() => {
    loadRef.current = () => {
      const controller = new AbortController()
      void loadUsers(controller.signal)
    }
  }, [loadUsers])

  useEffect(() => {
    const controller = new AbortController()
    void loadUsers(controller.signal)
    return () => controller.abort()
  }, [loadUsers])

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage))

  const openCreate = () => {
    setForm(defaultForm)
    setSelectedUser(null)
    setNewPassword('')
    setFormMode('create')
  }

  const openEdit = (user: PlatformUserRecord) => {
    setSelectedUser(user)
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      isActive: user.isActive,
      forcePasswordReset: false,
    })
    setNewPassword('')
    setFormMode('edit')
  }

  const openView = (user: PlatformUserRecord) => {
    setSelectedUser(user)
    setFormMode('view')
  }

  const openResetPassword = (user: PlatformUserRecord) => {
    setSelectedUser(user)
    setNewPassword('')
    setFormMode('resetPassword')
  }

  const runAction = async (action: () => Promise<void>) => {
    try {
      setSaving(true)
      await action()
      setMessage('Saved successfully.')
      loadRef.current()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setSaving(false)
    }
  }

  const submitForm = async () => {
    if (!form.fullName.trim() || !form.email.trim() || (formMode === 'create' && !form.password.trim())) {
      setMessage('Full name, email, and password are required.')
      return
    }

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      isActive: form.isActive,
      forcePasswordReset: form.forcePasswordReset,
    }

    if (formMode === 'create') {
      await runAction(() => createPlatformUser(payload))
      setFormMode(null)
      return
    }

    if (!selectedUser) return
    await runAction(() => updatePlatformUser(selectedUser.id, {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      role: form.role,
      isActive: form.isActive,
    }))
    setFormMode(null)
  }

  const submitResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) {
      setMessage('A new password is required.')
      return
    }

    await runAction(() => resetPlatformUserPassword(selectedUser.id, { newPassword }))
    setFormMode(null)
  }

  const filteredUsers = useMemo(() => users, [users])

  return (
    <div className="platform-page">
      <header className="platform-page-header">
        <div>
          <h2 className="platform-page-title">Platform Users</h2>
          <p className="platform-page-subtitle">Manage platform administrators, support staff, and their access rights.</p>
        </div>

        <button type="button" className="platform-button-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Platform User
        </button>
      </header>

      <section className="platform-stats-grid">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Active" value={stats.active} icon={<Shield className="h-4 w-4" />} />
        <StatCard label="Disabled" value={stats.disabled} icon={<ShieldOff className="h-4 w-4" />} />
        <StatCard label="Super Admins" value={stats.superAdmins} icon={<Shield className="h-4 w-4" />} />
        <StatCard label="Support Staff" value={stats.supportStaff} icon={<Users className="h-4 w-4" />} />
      </section>

      <section className="platform-toolbar-card">
        <div className="platform-toolbar-grid">
          <SearchInput value={search} placeholder="Search users" onChange={(value) => setSearch(value)} />
          <FilterDropdown label="Role" value={role} options={roles.map((value) => ({ value, label: value }))} onChange={setRole} />
          <FilterDropdown label="Status" value={status} options={statuses.map((value) => ({ value, label: value }))} onChange={setStatus} />
        </div>
      </section>

      {message && <div className="platform-inline-message">{message}</div>}

      {loading ? (
        <SkeletonTable columns={7} rows={8} />
      ) : error ? (
        <ErrorState title="Could not load platform users" description={error} onRetry={() => loadRef.current()} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="No platform users found" description="Create a platform administrator or adjust your filters." />
      ) : (
        <Table>
          <thead>
            <tr>
              <TableHeader className="platform-table-header-wide">Name</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Role</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Last Login</TableHeader>
              <TableHeader>Created</TableHeader>
              <TableHeader>Actions</TableHeader>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="platform-row-primary">{user.fullName}</div>
                  {currentUser?.id === user.id && <div className="platform-row-meta">You</div>}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <span className={`platform-badge ${user.isActive ? 'platform-badge-active' : 'platform-badge-suspended'}`}>
                    {user.isActive ? 'Active' : 'Disabled'}
                  </span>
                </TableCell>
                <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <PlatformUserActionMenu
                    user={user}
                    currentUserId={currentUser?.id}
                    onView={() => openView(user)}
                    onEdit={() => openEdit(user)}
                    onResetPassword={() => openResetPassword(user)}
                    onEnable={() => runAction(() => enablePlatformUser(user.id))}
                    onDisable={() => runAction(() => disablePlatformUser(user.id))}
                    onChangeRole={() => openEdit(user)}
                    onForcePasswordReset={() => runAction(() => forcePlatformUserPasswordReset(user.id))}
                    onDelete={() => {
                      if (window.confirm(`Delete ${user.fullName}?`)) {
                        void runAction(() => deletePlatformUser(user.id))
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}

      {!loading && !error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value)
            setPage(1)
          }}
        />
      )}

      <Modal
        open={formMode !== null}
        title={formMode === 'create' ? 'Add Platform User' : formMode === 'edit' ? 'Edit Platform User' : 'Platform User'}
        description="Platform administrators only."
        onClose={() => setFormMode(null)}
      >
        {formMode === 'view' && selectedUser ? (
          <div className="platform-modal-grid">
            <div><p className="platform-detail-label">Name</p><p className="platform-detail-value">{selectedUser.fullName}</p></div>
            <div><p className="platform-detail-label">Email</p><p className="platform-detail-value">{selectedUser.email}</p></div>
            <div><p className="platform-detail-label">Role</p><p className="platform-detail-value">{selectedUser.role}</p></div>
            <div><p className="platform-detail-label">Status</p><p className="platform-detail-value">{selectedUser.isActive ? 'Active' : 'Disabled'}</p></div>
            <div><p className="platform-detail-label">Last Login</p><p className="platform-detail-value">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : '-'}</p></div>
            <div><p className="platform-detail-label">Created</p><p className="platform-detail-value">{new Date(selectedUser.createdAt).toLocaleString()}</p></div>
          </div>
        ) : formMode === 'resetPassword' && selectedUser ? (
          <div className="platform-form-grid">
            <div className="platform-card-note sm:col-span-2">
              <p className="platform-detail-value">Reset password for {selectedUser.fullName}</p>
              <p className="platform-detail-meta">This updates the platform password immediately.</p>
            </div>
            <label className="platform-field sm:col-span-2"><span>New Password</span><input className="input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          </div>
        ) : (
          <div className="platform-form-grid">
            <label className="platform-field"><span>Full Name</span><input className="input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
            <label className="platform-field"><span>Email</span><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label className="platform-field"><span>Role</span><select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Super Admin</option><option>Platform Admin</option><option>Support Staff</option></select></label>
            <label className="platform-field"><span>Status</span><select className="input" value={form.isActive ? 'active' : 'disabled'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })}><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
            {formMode === 'create' && <label className="platform-field"><span>Password</span><input className="input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}
            <label className="platform-field"><span>Force Password Reset</span><input type="checkbox" checked={form.forcePasswordReset} onChange={(event) => setForm({ ...form, forcePasswordReset: event.target.checked })} /></label>
          </div>
        )}

        {formMode === 'resetPassword' && (
          <div className="platform-modal-actions">
            <button type="button" className="platform-button-secondary" onClick={() => setFormMode(null)}>Cancel</button>
            <button type="button" className="platform-button-primary" disabled={saving} onClick={() => void submitResetPassword()}>{saving ? 'Saving...' : 'Reset Password'}</button>
          </div>
        )}

        {formMode !== 'view' && formMode !== 'resetPassword' && (
          <div className="platform-modal-actions">
            <button type="button" className="platform-button-secondary" onClick={() => setFormMode(null)}>Cancel</button>
            <button type="button" className="platform-button-primary" disabled={saving} onClick={() => void submitForm()}>{saving ? 'Saving...' : 'Save User'}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
