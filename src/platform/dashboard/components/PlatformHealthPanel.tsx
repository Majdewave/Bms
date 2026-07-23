import type { HealthStatus, PlatformHealth } from '@/platform/dashboard/types'

interface PlatformHealthPanelProps {
  health: PlatformHealth
  loading: boolean
}

const healthClassMap: Record<HealthStatus, string> = {
  Healthy: 'platform-health-badge-healthy',
  Warning: 'platform-health-badge-warning',
  Offline: 'platform-health-badge-offline',
}

function HealthCard({ label, status, message }: { label: string; status: HealthStatus; message: string }) {
  return (
    <article className="platform-health-card">
      <div className="platform-health-top">
        <p className="platform-detail-value">{label}</p>
        <span className={`platform-badge ${healthClassMap[status]}`}>{status}</span>
      </div>
      <p className="platform-detail-meta">{message}</p>
    </article>
  )
}

export default function PlatformHealthPanel({ health, loading }: PlatformHealthPanelProps) {
  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Platform Health</h3>
      </header>

      {loading ? (
        <div className="skeleton h-32 w-full" />
      ) : (
        <div className="platform-health-grid">
          <HealthCard label="API" status={health.api.status} message={health.api.message} />
          <HealthCard label="Database" status={health.database.status} message={health.database.message} />
          <HealthCard label="Storage" status={health.storage.status} message={health.storage.message} />
          <HealthCard label="Email" status={health.email.status} message={health.email.message} />
          <HealthCard label="WhatsApp" status={health.whatsApp.status} message={health.whatsApp.message} />
          <HealthCard label="Stripe" status={health.stripe.status} message={health.stripe.message} />
        </div>
      )}
    </section>
  )
}
