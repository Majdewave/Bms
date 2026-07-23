import type { ConnectedServiceStatus } from '@/platform/business-details/types'
import type { BusinessDetails } from '@/platform/business-details/types'

interface ServicesCardProps {
  details: BusinessDetails
}

const serviceStatusClassMap: Record<ConnectedServiceStatus, string> = {
  Connected: 'platform-service-badge-connected',
  Disconnected: 'platform-service-badge-disconnected',
  Pending: 'platform-service-badge-pending',
}

function ServiceRow({ label, status }: { label: string; status: ConnectedServiceStatus }) {
  return (
    <div className="platform-service-row">
      <span className="platform-detail-value">{label}</span>
      <span className={`platform-badge ${serviceStatusClassMap[status]}`}>{status}</span>
    </div>
  )
}

export default function ServicesCard({ details }: ServicesCardProps) {
  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Connected Services</h3>
      </header>

      <div className="platform-services-grid">
        <ServiceRow label="Stripe" status={details.services.stripe} />
        <ServiceRow label="WhatsApp" status={details.services.whatsapp} />
        <ServiceRow label="Email" status={details.services.email} />
        <ServiceRow label="Storage" status={details.services.storage} />
      </div>
    </section>
  )
}
