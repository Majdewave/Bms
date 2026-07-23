import type { BusinessDetails } from '@/platform/business-details/types'
import { formatDate, formatText } from '@/platform/business-details/components/detailFormatters'

interface BusinessInfoCardProps {
  details: BusinessDetails
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="platform-detail-label">{label}</p>
      <p className="platform-detail-value">{value}</p>
    </div>
  )
}

export default function BusinessInfoCard({ details }: BusinessInfoCardProps) {
  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Business Information</h3>
      </header>

      <div className="platform-detail-grid">
        <Field label="Business Name" value={formatText(details.businessName)} />
        <Field label="Legal Name" value={formatText(details.legalName)} />
        <Field label="Subdomain" value={formatText(details.subdomain)} />
        <Field label="Business Type" value={formatText(details.businessType)} />
        <Field label="Registration Date" value={formatDate(details.registrationDate)} />
        <Field label="Owner Name" value={formatText(details.ownerName)} />
        <Field label="Owner Email" value={formatText(details.ownerEmail)} />
        <Field label="Owner Phone" value={formatText(details.ownerPhone)} />
      </div>
    </section>
  )
}
