import type { BusinessDetails } from '@/platform/business-details/types'
import type { BusinessRecord } from '@/platform/businesses/types'

export interface BusinessLifecycleActions {
  canApprove: boolean
  canSuspend: boolean
  canActivate: boolean
  canExtendTrial: boolean
}

const isPendingBusiness = (status: string | null | undefined) => status === 'Pending'
const isSuspendedBusiness = (status: string | null | undefined) => status === 'Suspended'
const isApprovedBusiness = (approvalStatus: string | null | undefined) => approvalStatus === 'Approved'

const hasFutureTrialWindow = (trialEndsAt: string | null | undefined) => {
  if (!trialEndsAt) {
    return false
  }

  const parsed = new Date(trialEndsAt)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }

  return parsed.getTime() > Date.now()
}

export function getBusinessLifecycleActions(business: BusinessRecord): BusinessLifecycleActions {
  return {
    canApprove: isPendingBusiness(business.status),
    canSuspend: isApprovedBusiness(business.approvalStatus),
    canActivate: isSuspendedBusiness(business.status),
    canExtendTrial: hasFutureTrialWindow(business.trialEndsAt),
  }
}

export function getBusinessDetailsLifecycleActions(details: BusinessDetails): BusinessLifecycleActions {
  const isDeleted = details.deleted === true || details.businessStatus === 'Deleted'

  if (isDeleted) {
    return {
      canApprove: false,
      canSuspend: false,
      canActivate: false,
      canExtendTrial: false,
    }
  }

  return {
    canApprove: details.businessStatus === 'Pending',
    canSuspend: details.approved === true && details.suspended !== true,
    canActivate: details.businessStatus === 'Suspended',
    canExtendTrial: hasFutureTrialWindow(details.trialEndsAt),
  }
}
