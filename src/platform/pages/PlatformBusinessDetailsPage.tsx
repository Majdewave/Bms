import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ActivityTimeline from '@/platform/business-details/components/ActivityTimeline'
import ActionPanel from '@/platform/business-details/components/ActionPanel'
import BusinessInfoCard from '@/platform/business-details/components/BusinessInfoCard'
import PlatformStatusCard from '@/platform/business-details/components/PlatformStatusCard'
import ServicesCard from '@/platform/business-details/components/ServicesCard'
import SubscriptionCard from '@/platform/business-details/components/SubscriptionCard'
import UsersTable from '@/platform/business-details/components/UsersTable'
import { formatDate } from '@/platform/business-details/components/detailFormatters'
import {
  activateBusiness,
  approveBusiness,
  extendBusinessTrial,
  fetchPlatformBusinessDetails,
  suspendBusiness,
} from '@/platform/business-details/services/platformBusinessDetailsService'
import { notifyBusinessesUpdated } from '@/platform/businesses/services/platformBusinessesService'
import type { BusinessDetails, BusinessDetailsResult } from '@/platform/business-details/types'
import BusinessStatusBadge from '@/platform/businesses/components/BusinessStatusBadge'
import { getBusinessDetailsLifecycleActions } from '@/platform/businesses/lifecycle'
import ErrorState from '@/platform/components/ui/ErrorState'
import { PlatformApiError } from '@/platform/services/platformApiClient'

const emptyDetails: BusinessDetails = {
  tenantId: '',
  businessName: null,
  legalName: null,
  subdomain: null,
  businessType: null,
  registrationDate: null,
  ownerName: null,
  ownerEmail: null,
  ownerPhone: null,

  plan: null,
  trialStatus: null,
  trialEndsAt: null,
  subscriptionStatus: null,
  subscriptionStart: null,
  subscriptionEnd: null,
  renewalDate: null,

  businessStatus: null,
  approved: null,
  suspended: null,
  deleted: null,

  createdAt: null,
  lastLoginAt: null,

  services: {
    stripe: 'Disconnected',
    whatsapp: 'Disconnected',
    email: 'Disconnected',
    storage: 'Disconnected',
  },
  users: [],
  recentActivity: [],
}

const planClassMap: Record<string, string> = {
  Starter: 'platform-plan-badge-starter',
  Growth: 'platform-plan-badge-growth',
  Enterprise: 'platform-plan-badge-enterprise',
}

export default function PlatformBusinessDetailsPage() {
  const { tenantId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<BusinessDetails>({ ...emptyDetails, tenantId })

  const loadDetails = useCallback(async (signal?: AbortSignal) => {
    if (!tenantId) {
      setError('Missing tenant id.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response: BusinessDetailsResult = await fetchPlatformBusinessDetails(tenantId, signal)
      setDetails(response.data)
    } catch (err) {
      if (signal?.aborted) {
        return
      }

      if (err instanceof PlatformApiError) {
        setError(err.message)
      } else {
        setError('Failed to load business details.')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [tenantId])

  useEffect(() => {
    const controller = new AbortController()
    void loadDetails(controller.signal)
    return () => controller.abort()
  }, [loadDetails])

  const runAction = async (action: () => Promise<void>) => {
    setActionBusy(true)

    try {
      await action()
      notifyBusinessesUpdated()
      await loadDetails()
    } catch (err) {
      if (err instanceof PlatformApiError) {
        setError(err.message)
      } else {
        setError('Action failed. Please try again.')
      }
    } finally {
      setActionBusy(false)
    }
  }

  const pageTitle = useMemo(() => details.businessName || `Business ${tenantId}`, [details.businessName, tenantId])
  const lifecycleActions = useMemo(() => getBusinessDetailsLifecycleActions(details), [details])
  const state = location.state as { returnTo?: string } | null
  const backPath = state?.returnTo || (
    location.pathname.includes('/platform/pending-approvals/')
      ? '/platform/pending-approvals'
      : '/platform/businesses'
  )

  if (error && !loading) {
    return <ErrorState title="Could not load business details" description={error} onRetry={loadDetails} />
  }

  return (
    <div className="platform-page">
      <header className="platform-page-header platform-details-header">
        <div className="space-y-3">
          <button type="button" className="platform-button-secondary" onClick={() => navigate(backPath)}>
            Back
          </button>

          <div>
            <h2 className="platform-page-title">{pageTitle}</h2>
            <div className="platform-details-meta">
              <div className="platform-details-meta-item">
                <span className="platform-detail-label">Status</span>
                <div>
                  {details.businessStatus && details.businessStatus !== 'Deleted' ? (
                    <BusinessStatusBadge status={details.businessStatus} />
                  ) : details.businessStatus === 'Deleted' ? (
                    <span className="platform-badge platform-badge-expired">Deleted</span>
                  ) : (
                    <span className="platform-detail-value">-</span>
                  )}
                </div>
              </div>

              <div className="platform-details-meta-item">
                <span className="platform-detail-label">Plan</span>
                <div>
                  {details.plan ? (
                    <span className={`platform-badge ${planClassMap[details.plan]}`}>{details.plan}</span>
                  ) : (
                    <span className="platform-detail-value">-</span>
                  )}
                </div>
              </div>

              <div className="platform-details-meta-item">
                <span className="platform-detail-label">Created Date</span>
                <span className="platform-detail-value">{formatDate(details.createdAt)}</span>
              </div>

              <div className="platform-details-meta-item">
                <span className="platform-detail-label">Last Login</span>
                <span className="platform-detail-value">{formatDate(details.lastLoginAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="platform-details-layout">
        <div className="platform-details-main">
          <BusinessInfoCard details={details} />
          <SubscriptionCard details={details} />
          <PlatformStatusCard details={details} />
          <ServicesCard details={details} />
          <UsersTable users={details.users} />
          <ActivityTimeline items={details.recentActivity} />
        </div>

        <div className="platform-details-side">
          <ActionPanel
            busy={loading || actionBusy}
            canApprove={lifecycleActions.canApprove}
            canSuspend={lifecycleActions.canSuspend}
            canActivate={lifecycleActions.canActivate}
            canExtendTrial={lifecycleActions.canExtendTrial}
            onApprove={() => runAction(() => approveBusiness(tenantId))}
            onSuspend={() => runAction(() => suspendBusiness(tenantId))}
            onActivate={() => runAction(() => activateBusiness(tenantId))}
            onExtendTrial={() => runAction(() => extendBusinessTrial(tenantId, 14))}
          />
        </div>
      </div>
    </div>
  )
}
