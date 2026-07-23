import { platformRequest } from '@/platform/services/platformApiClient'
import type { BusinessRecord, BusinessStatus, SortOption, TrialFilter } from '@/platform/businesses/types'
import { toBusinessStatusFromSubscription } from '@/platform/businesses/status'

export interface BusinessesQuery {
  page: number
  pageSize: number
  searchName: string
  searchOwner: string
  registrationDate: string
  businessType: string
  status: string
  plan: string
  trial: TrialFilter
  sort: SortOption
}

export interface BusinessesStats {
  total: number
  pending: number
  trial: number
  active: number
  suspended: number
  approvedToday: number
  rejectedToday: number
  averageApprovalTimeHours: number
}

export interface BusinessesResult {
  items: BusinessRecord[]
  total: number
  page: number
  pageSize: number
  serverFiltering: boolean
  serverPagination: boolean
  stats: BusinessesStats
}

const businessesUpdatedEventName = 'platform-businesses-updated'

export function notifyBusinessesUpdated() {
  window.dispatchEvent(new CustomEvent(businessesUpdatedEventName))
}

export function subscribeBusinessesUpdated(onUpdated: () => void) {
  const handler = () => onUpdated()
  window.addEventListener(businessesUpdatedEventName, handler)
  return () => window.removeEventListener(businessesUpdatedEventName, handler)
}

interface RawPlatformBusiness {
  id?: string
  tenantId?: string
  name?: string
  businessName?: string
  ownerName?: string
  ownerFullName?: string
  ownerEmail?: string
  email?: string
  phone?: string
  businessType?: string | null
  subscriptionStatus?: string
  status?: string
  approvalStatus?: string
  plan?: string
  trialEndsAt?: string | null
  createdAt?: string
  registrationDate?: string
  lastLoginAt?: string | null
  ownerLastLoginAt?: string | null
  isSuspended?: boolean
  submittedDocuments?: {
    businessLicense?: string
    identityDocument?: string
    proofOfAddress?: string
    taxRegistration?: string
  }
}

interface RawBusinessesListResponse {
  items: RawPlatformBusiness[]
  total: number
  page: number
  pageSize: number
  stats?: {
    total?: number
    pending?: number
    trial?: number
    active?: number
    suspended?: number
    approvedToday?: number
    rejectedToday?: number
    averageApprovalTimeHours?: number
  }
}

const ensureString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

const normalizePlan = (value: string): BusinessRecord['plan'] => {
  const normalized = value.toLowerCase()
  if (normalized.includes('enterprise') || normalized.includes('pro')) return 'Enterprise'
  if (normalized.includes('growth') || normalized.includes('basic')) return 'Growth'
  return 'Starter'
}

const parseDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const mapBusiness = (item: RawPlatformBusiness): BusinessRecord => {
  const createdAt = ensureString(item.createdAt || item.registrationDate, new Date(0).toISOString())
  const status = toBusinessStatusFromSubscription({
    approvalStatus: item.approvalStatus,
    subscriptionStatus: item.subscriptionStatus,
    fallbackStatus: item.status,
    isSuspended: item.isSuspended,
    trialEndsAt: item.trialEndsAt,
  })
  const submittedDocuments = item.submittedDocuments || {}

  const normalizeDocumentStatus = (value: unknown): BusinessRecord['submittedDocuments']['businessLicense'] => {
    const normalized = ensureString(value).toLowerCase()
    if (normalized.includes('upload')) return 'Uploaded'
    if (normalized.includes('verify')) return 'Verified'
    if (normalized.includes('reject')) return 'Rejected'
    return 'Missing'
  }

  return {
    id: ensureString(item.id || item.tenantId, crypto.randomUUID()),
    name: ensureString(item.name || item.businessName, 'Unknown Business'),
    ownerName: ensureString(item.ownerName || item.ownerFullName, '-'),
    email: ensureString(item.email || item.ownerEmail, '-'),
    phone: ensureString(item.phone, '-'),
    businessType: typeof item.businessType === 'string' ? item.businessType : null,
    status,
    approvalStatus: status,
    plan: normalizePlan(ensureString(item.plan, 'starter')),
    trialEndsAt: typeof item.trialEndsAt === 'string' ? item.trialEndsAt : null,
    createdAt,
    lastLoginAt: typeof item.lastLoginAt === 'string'
      ? item.lastLoginAt
      : typeof item.ownerLastLoginAt === 'string'
        ? item.ownerLastLoginAt
        : null,
    submittedDocuments: {
      businessLicense: normalizeDocumentStatus(submittedDocuments.businessLicense),
      identityDocument: normalizeDocumentStatus(submittedDocuments.identityDocument),
      proofOfAddress: normalizeDocumentStatus(submittedDocuments.proofOfAddress),
      taxRegistration: normalizeDocumentStatus(submittedDocuments.taxRegistration),
    },
  }
}

const buildStats = (items: BusinessRecord[]): BusinessesStats => ({
  total: items.length,
  pending: items.filter((item) => item.status === 'Pending').length,
  trial: items.filter((item) => item.status === 'Trial').length,
  active: items.filter((item) => item.status === 'Active').length,
  suspended: items.filter((item) => item.status === 'Suspended').length,
  approvedToday: 0,
  rejectedToday: 0,
  averageApprovalTimeHours: 0,
})

const toSortParam = (sort: SortOption) => {
  if (sort === 'name') return 'name'
  if (sort === 'oldest') return 'created_asc'
  return 'created_desc'
}

export async function fetchPlatformBusinesses(query: BusinessesQuery, signal?: AbortSignal): Promise<BusinessesResult> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    searchName: query.searchName,
    searchOwner: query.searchOwner,
    registrationDate: query.registrationDate,
    businessType: query.businessType,
    status: query.status,
    plan: query.plan,
    trial: query.trial,
    sort: toSortParam(query.sort),
  })

  const rawResponse = await platformRequest<RawBusinessesListResponse>(
    `/api/platform/tenants?${params.toString()}`,
    { method: 'GET', signal },
  )

  const mappedItems = rawResponse.items.map(mapBusiness)

  const statsFromApi = rawResponse.stats
  const stats = statsFromApi
    ? {
        total: statsFromApi.total ?? mappedItems.length,
        pending: statsFromApi.pending ?? mappedItems.filter((item) => item.status === 'Pending').length,
        trial: statsFromApi.trial ?? mappedItems.filter((item) => item.status === 'Trial').length,
        active: statsFromApi.active ?? mappedItems.filter((item) => item.status === 'Active').length,
        suspended: statsFromApi.suspended ?? mappedItems.filter((item) => item.status === 'Suspended').length,
        approvedToday: statsFromApi.approvedToday ?? 0,
        rejectedToday: statsFromApi.rejectedToday ?? 0,
        averageApprovalTimeHours: statsFromApi.averageApprovalTimeHours ?? 0,
      }
    : buildStats(mappedItems)

  return {
    items: mappedItems,
    total: rawResponse.total,
    page: rawResponse.page,
    pageSize: rawResponse.pageSize,
    serverFiltering: true,
    serverPagination: true,
    stats,
  }
}

export async function approveBusiness(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/approve`, { method: 'POST' })
}

export async function rejectBusiness(tenantId: string, reason?: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  })
}

export async function suspendBusiness(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/suspend`, { method: 'POST' })
}

export async function activateBusiness(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/activate`, { method: 'POST' })
}

export async function deleteBusiness(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}`, { method: 'DELETE' })
}
