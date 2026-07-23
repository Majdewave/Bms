import type { PlatformBusinessLifecycleStatus } from '@/platform/business-details/types'
import type { BusinessStatus } from '@/platform/businesses/types'

const ACTIVE_STATUSES = new Set<BusinessStatus>(['Pending', 'Under Review', 'Approved', 'Rejected', 'Trial', 'Active', 'Suspended', 'Expired'])

export function toBusinessStatus(value: string | null | undefined): BusinessStatus {
  if (!value) return 'Pending'

  const normalized = value.toLowerCase()

  if (normalized.includes('under review')) return 'Under Review'
  if (normalized.includes('approved')) return 'Approved'
  if (normalized.includes('rejected')) return 'Rejected'
  if (normalized.includes('pending')) return 'Pending'
  if (normalized.includes('trial')) return 'Trial'
  if (normalized.includes('active')) return 'Active'
  if (normalized.includes('suspend')) return 'Suspended'
  if (normalized.includes('expire') || normalized.includes('cancel') || normalized.includes('unpaid') || normalized.includes('pastdue') || normalized.includes('grace')) return 'Expired'

  return 'Pending'
}

export function toBusinessStatusFromSubscription(input: {
  approvalStatus?: string | null
  subscriptionStatus?: string | null
  fallbackStatus?: string | null
  isSuspended?: boolean
  trialEndsAt?: string | null
}): BusinessStatus {
  const approvalStatus = toBusinessStatus(input.approvalStatus)
  if (approvalStatus === 'Under Review' || approvalStatus === 'Approved' || approvalStatus === 'Rejected') {
    return approvalStatus
  }

  if (input.isSuspended) return 'Suspended'

  const rawStatus = toBusinessStatus(input.subscriptionStatus || input.fallbackStatus)
  if (rawStatus !== 'Pending') {
    return rawStatus
  }

  if (input.trialEndsAt) {
    const trialEnd = new Date(input.trialEndsAt)
    if (!Number.isNaN(trialEnd.getTime()) && trialEnd.getTime() < Date.now()) {
      return 'Expired'
    }
  }

  return 'Pending'
}

export function toLifecycleStatus(value: string | null | undefined): PlatformBusinessLifecycleStatus | null {
  if (!value) return null
  if (value.toLowerCase().includes('delete')) return 'Deleted'
  return toBusinessStatus(value)
}

export function asBusinessStatus(value: string | null | undefined): BusinessStatus {
  const candidate = value as BusinessStatus
  return ACTIVE_STATUSES.has(candidate) ? candidate : toBusinessStatus(value)
}
