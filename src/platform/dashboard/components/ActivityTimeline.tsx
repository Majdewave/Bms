import type { PlatformDashboardActivityItem } from '@/platform/dashboard/types'
import EmptyState from '@/platform/components/ui/EmptyState'

interface ActivityTimelineProps {
  items: PlatformDashboardActivityItem[]
  loading: boolean
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

export default function ActivityTimeline({ items, loading }: ActivityTimelineProps) {
  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Recent Platform Activity</h3>
      </header>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : items.length === 0 ? (
        <EmptyState title="No platform activity available" description="Activity events will appear here as operations occur." />
      ) : (
        <div className="platform-activity-list">
          {items.map((item) => (
            <article key={item.id} className="platform-activity-item">
              <div className="platform-activity-marker" aria-hidden="true" />
              <div>
                <h4 className="platform-detail-value">{item.title}</h4>
                <p className="platform-page-subtitle">{item.description}</p>
                <p className="platform-detail-meta">
                  {formatDateTime(item.timestamp)} • {item.source}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
