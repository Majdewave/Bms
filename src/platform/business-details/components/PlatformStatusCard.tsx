import type { BusinessDetails } from '@/platform/business-details/types'
import { formatBoolean } from '@/platform/business-details/components/detailFormatters'
import BusinessStatusBadge from '@/platform/businesses/components/BusinessStatusBadge'

interface PlatformStatusCardProps {
  details: BusinessDetails
}

export default function PlatformStatusCard({ details }: PlatformStatusCardProps) {
  const mappedStatus = details.businessStatus === 'Deleted' ? 'Expired' : details.businessStatus

  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Platform Status</h3>
      </header>

      <div className="platform-detail-grid">
        <div>
          <p className="platform-detail-label">Business Status</p>
          <div className="mt-1">
            {mappedStatus ? (
              <BusinessStatusBadge status={mappedStatus} />
            ) : (
              <p className="platform-detail-value">-</p>
            )}
          </div>
        </div>

        <div>
          <p className="platform-detail-label">Approved</p>
          <p className="platform-detail-value">{formatBoolean(details.approved)}</p>
        </div>

        <div>
          <p className="platform-detail-label">Suspended</p>
          <p className="platform-detail-value">{formatBoolean(details.suspended)}</p>
        </div>

        <div>
          <p className="platform-detail-label">Deleted</p>
          <p className="platform-detail-value">{formatBoolean(details.deleted)}</p>
        </div>
      </div>
    </section>
  )
}
