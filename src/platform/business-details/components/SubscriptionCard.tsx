import type { BusinessDetails } from '@/platform/business-details/types'
import { formatDate, formatText } from '@/platform/business-details/components/detailFormatters'

interface SubscriptionCardProps {
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

export default function SubscriptionCard({ details }: SubscriptionCardProps) {
  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Subscription</h3>
      </header>

      <div className="platform-detail-grid">
        <Field label="Current Plan" value={formatText(details.plan)} />
        <Field label="Trial Status" value={formatText(details.trialStatus)} />
        <Field label="Trial Ends" value={formatDate(details.trialEndsAt)} />
        <Field label="Subscription Status" value={formatText(details.subscriptionStatus)} />
        <Field label="Subscription Start" value={formatDate(details.subscriptionStart)} />
        <Field label="Subscription End" value={formatDate(details.subscriptionEnd)} />
        <Field label="Renewal Date" value={formatDate(details.renewalDate)} />
      </div>
    </section>
  )
}
