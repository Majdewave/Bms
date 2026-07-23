import { platformRequest } from '@/platform/services/platformApiClient'
import type {
  BusinessDetails,
  BusinessDetailsResult,
  ConnectedServiceStatus,
  TenantUserRecord,
  ActivityItem,
} from '@/platform/business-details/types'
import type { BusinessPlan } from '@/platform/businesses/types'
import { toLifecycleStatus } from '@/platform/businesses/status'

interface RawTenantDetails {
  tenantId?: string
  businessName?: string
  legalName?: string
  subdomain?: string
  businessType?: string
  createdAt?: string
  ownerName?: string
  ownerEmail?: string
  ownerPhone?: string
  status?: string
  lastLoginAt?: string | null
  trial?: {
    isTrial?: boolean
    trialStartsAt?: string | null
    trialEndsAt?: string | null
    remainingTrialDays?: number | null
  }
  subscription?: {
    plan?: string
    subscriptionStatus?: string
    subscriptionStart?: string | null
    subscriptionEnd?: string | null
    renewalDate?: string | null
    billingCycle?: string | null
    isSuspended?: boolean
  }
}

interface RawTenantUser {
  id?: string
  userId?: string
  fullName?: string
  name?: string
  email?: string
  role?: string
  lastLoginAt?: string | null
  status?: string
  isActive?: boolean
}

interface RawActivity {
  id?: string
  title?: string
  description?: string
  timestamp?: string
  createdAt?: string
}

const ensureString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

const normalizeBusinessPlan = (value: string | null): BusinessPlan | null => {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (normalized.includes('enterprise') || normalized.includes('pro')) return 'Enterprise'
  if (normalized.includes('growth') || normalized.includes('basic')) return 'Growth'
  if (normalized.includes('starter')) return 'Starter'
  return null
}

const normalizeServiceStatus = (value: string | null): ConnectedServiceStatus => {
  const normalized = (value || '').toLowerCase()
  if (normalized.includes('connect') || normalized === 'active' || normalized === 'enabled') return 'Connected'
  if (normalized.includes('pending') || normalized.includes('setup')) return 'Pending'
  return 'Disconnected'
}

const mapUserStatus = (raw: RawTenantUser): TenantUserRecord['status'] => {
  const fromStatus = ensureString(raw.status)?.toLowerCase()
  if (fromStatus?.includes('pending')) return 'Pending'
  if (fromStatus?.includes('inactive') || raw.isActive === false) return 'Inactive'
  return 'Active'
}

const mapTenantUsers = (items: RawTenantUser[]): TenantUserRecord[] => {
  return items.map((item, index) => ({
    id: ensureString(item.id || item.userId) || `user-${index}`,
    name: ensureString(item.fullName || item.name) || '-',
    email: ensureString(item.email) || '-',
    role: ensureString(item.role) || '-',
    lastLoginAt: ensureString(item.lastLoginAt),
    status: mapUserStatus(item),
  }))
}

const mapActivity = (items: RawActivity[]): ActivityItem[] => {
  return items.map((item, index) => ({
    id: ensureString(item.id) || `activity-${index}`,
    title: ensureString(item.title) || 'Activity',
    description: ensureString(item.description) || 'No description available.',
    timestamp: ensureString(item.timestamp || item.createdAt) || new Date(0).toISOString(),
  }))
}

const mapFromTenantDetails = (tenantId: string, raw: RawTenantDetails): BusinessDetails => {
  const normalizedStatus = toLifecycleStatus(ensureString(raw.status))
  const trialEndsAt = ensureString(raw.trial?.trialEndsAt)
  const trialEndDate = trialEndsAt ? new Date(trialEndsAt) : null
  const hasValidTrialEnd = trialEndDate !== null && !Number.isNaN(trialEndDate.getTime())
  const hasFutureTrialEnd = hasValidTrialEnd && trialEndDate!.getTime() > Date.now()
  const hasExpiredTrialEnd = hasValidTrialEnd && trialEndDate!.getTime() <= Date.now()

  const trialStatus = hasFutureTrialEnd
    ? 'On Trial'
    : hasExpiredTrialEnd
      ? 'Expired'
      : 'Not on Trial'

  return {
    tenantId,
    businessName: ensureString(raw.businessName),
    legalName: ensureString(raw.legalName),
    subdomain: ensureString(raw.subdomain),
    businessType: ensureString(raw.businessType),
    registrationDate: ensureString(raw.createdAt),
    ownerName: ensureString(raw.ownerName),
    ownerEmail: ensureString(raw.ownerEmail),
    ownerPhone: ensureString(raw.ownerPhone),

    plan: normalizeBusinessPlan(ensureString(raw.subscription?.plan)),
    trialStatus,
    trialEndsAt,
    subscriptionStatus: ensureString(raw.subscription?.subscriptionStatus),
    subscriptionStart: ensureString(raw.subscription?.subscriptionStart),
    subscriptionEnd: ensureString(raw.subscription?.subscriptionEnd),
    renewalDate: ensureString(raw.subscription?.renewalDate),

    businessStatus: normalizedStatus,
    approved: normalizedStatus ? normalizedStatus !== 'Pending' : null,
    suspended: typeof raw.subscription?.isSuspended === 'boolean' ? raw.subscription.isSuspended : null,
    deleted: normalizedStatus === 'Deleted',

    createdAt: ensureString(raw.createdAt),
    lastLoginAt: ensureString(raw.lastLoginAt),

    services: {
      stripe: 'Disconnected',
      whatsapp: 'Disconnected',
      email: 'Disconnected',
      storage: 'Disconnected',
    },
    users: [],
    recentActivity: [],
  }
}

export async function fetchPlatformBusinessDetails(tenantId: string, signal?: AbortSignal): Promise<BusinessDetailsResult> {
  const detailsResponse = await platformRequest<RawTenantDetails>(`/api/platform/tenants/${tenantId}`, { method: 'GET', signal })

  const [usersResponse, servicesResponse, activityResponse] = await Promise.allSettled([
    platformRequest<RawTenantUser[]>(`/api/platform/tenants/${tenantId}/users`, { method: 'GET', signal }),
    platformRequest<Partial<{ stripe: string; whatsapp: string; whatsApp: string; email: string; storage: string }>>(
      `/api/platform/tenants/${tenantId}/services`,
      { method: 'GET', signal },
    ),
    platformRequest<RawActivity[]>(`/api/platform/tenants/${tenantId}/activity`, { method: 'GET', signal }),
  ])

  const details = mapFromTenantDetails(tenantId, detailsResponse)

  details.users = usersResponse.status === 'fulfilled' ? mapTenantUsers(usersResponse.value) : []
  details.recentActivity = activityResponse.status === 'fulfilled' ? mapActivity(activityResponse.value) : []

  const resolvedServices = servicesResponse.status === 'fulfilled'
    ? servicesResponse.value
    : {}

  details.services = {
    stripe: normalizeServiceStatus(ensureString(resolvedServices.stripe)),
    whatsapp: normalizeServiceStatus(ensureString(resolvedServices.whatsapp ?? resolvedServices.whatsApp)),
    email: normalizeServiceStatus(ensureString(resolvedServices.email)),
    storage: normalizeServiceStatus(ensureString(resolvedServices.storage)),
  }

  return {
    data: details,
  }
}

export async function approveBusiness(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/approve`, { method: 'POST' })
}

export async function suspendBusiness(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/suspend`, { method: 'POST' })
}

export async function activateBusiness(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/activate`, { method: 'POST' })
}

export async function extendBusinessTrial(tenantId: string, days = 14): Promise<void> {
  await platformRequest(`/api/platform/tenants/${tenantId}/extend-trial`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  })
}
