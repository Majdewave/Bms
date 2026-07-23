import { platformRequest } from '@/platform/services/platformApiClient'

export type PlatformUserRole = 'Super Admin' | 'Platform Admin' | 'Support Staff'
export type PlatformUserStatus = 'Active' | 'Disabled'

export interface PlatformUsersQuery {
  page: number
  pageSize: number
  search: string
  role: string
  status: string
  sort: string
}

export interface PlatformUserRecord {
  id: string
  fullName: string
  email: string
  role: PlatformUserRole
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  passwordResetRequired: boolean
}

export interface PlatformUsersStats {
  totalUsers: number
  active: number
  disabled: number
  superAdmins: number
  supportStaff: number
}

export interface PlatformUsersResult {
  items: PlatformUserRecord[]
  total: number
  page: number
  pageSize: number
  stats: PlatformUsersStats
}

interface RawPlatformUser {
  id?: string
  fullName?: string
  email?: string
  role?: string
  isActive?: boolean
  lastLoginAt?: string | null
  createdAt?: string
  updatedAt?: string
  passwordResetRequired?: boolean
}

interface RawUsersResponse {
  items: RawPlatformUser[]
  total: number
  page: number
  pageSize: number
  stats: {
    totalUsers?: number
    active?: number
    disabled?: number
    superAdmins?: number
    supportStaff?: number
  }
}

const normalizeRole = (value?: string): PlatformUserRole => {
  const normalized = (value ?? '').toLowerCase()
  if (normalized.includes('super')) return 'Super Admin'
  if (normalized.includes('platform')) return 'Platform Admin'
  return 'Support Staff'
}

const mapUser = (item: RawPlatformUser): PlatformUserRecord => ({
  id: item.id ?? crypto.randomUUID(),
  fullName: item.fullName ?? '-',
  email: item.email ?? '-',
  role: normalizeRole(item.role),
  isActive: item.isActive ?? true,
  lastLoginAt: item.lastLoginAt ?? null,
  createdAt: item.createdAt ?? new Date(0).toISOString(),
  updatedAt: item.updatedAt ?? new Date(0).toISOString(),
  passwordResetRequired: item.passwordResetRequired ?? false,
})

export async function fetchPlatformUsers(query: PlatformUsersQuery, signal?: AbortSignal): Promise<PlatformUsersResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    search: query.search,
    role: query.role,
    status: query.status,
    sort: query.sort,
  })

  const response = await platformRequest<RawUsersResponse>(`/api/platform/users?${params.toString()}`, { method: 'GET', signal })
  const items = response.items.map(mapUser)

  return {
    items,
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
    stats: {
      totalUsers: response.stats.totalUsers ?? items.length,
      active: response.stats.active ?? items.filter((user) => user.isActive).length,
      disabled: response.stats.disabled ?? items.filter((user) => !user.isActive).length,
      superAdmins: response.stats.superAdmins ?? items.filter((user) => user.role === 'Super Admin').length,
      supportStaff: response.stats.supportStaff ?? items.filter((user) => user.role === 'Support Staff').length,
    },
  }
}

export async function createPlatformUser(payload: { fullName: string; email: string; password: string; role: string; isActive: boolean; forcePasswordReset: boolean }): Promise<void> {
  await platformRequest('/api/platform/users', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updatePlatformUser(userId: string, payload: { fullName?: string; email?: string; role?: string; isActive?: boolean }): Promise<void> {
  await platformRequest(`/api/platform/users/${userId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function resetPlatformUserPassword(userId: string, payload: { newPassword: string }): Promise<void> {
  await platformRequest(`/api/platform/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function forcePlatformUserPasswordReset(userId: string): Promise<void> {
  await platformRequest(`/api/platform/users/${userId}/force-password-reset`, { method: 'POST' })
}

export async function enablePlatformUser(userId: string): Promise<void> {
  await platformRequest(`/api/platform/users/${userId}/enable`, { method: 'POST' })
}

export async function disablePlatformUser(userId: string): Promise<void> {
  await platformRequest(`/api/platform/users/${userId}/disable`, { method: 'POST' })
}

export async function changePlatformUserRole(userId: string, payload: { role: string }): Promise<void> {
  await platformRequest(`/api/platform/users/${userId}/change-role`, { method: 'POST', body: JSON.stringify(payload) })
}

export async function deletePlatformUser(userId: string): Promise<void> {
  await platformRequest(`/api/platform/users/${userId}`, { method: 'DELETE' })
}