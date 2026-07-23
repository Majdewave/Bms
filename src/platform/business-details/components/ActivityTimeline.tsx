import type { ActivityItem } from '@/platform/business-details/types'
import { formatDateTime } from '@/platform/business-details/components/detailFormatters'
import EmptyState from '@/platform/components/ui/EmptyState'

interface ActivityTimelineProps {
  items: ActivityItem[]
}

export default function ActivityTimeline({ items }: ActivityTimelineProps) {
  return (
    <section className="platform-card platform-section-card">
      <header className="platform-section-header">
        <h3 className="platform-section-title">Recent Activity</h3>
      </header>

      {!items.length ? (
        <EmptyState
          title="Activity timeline is not available yet"
          description="Recent activity data will appear once the activity endpoint is implemented."
        />
      ) : (
        <div className="platform-activity-list">
          {items.map((item) => (
            <article key={item.id} className="platform-activity-item">
              <div className="platform-activity-marker" aria-hidden="true" />
              <div>
                <h4 className="platform-detail-value">{item.title}</h4>
                <p className="platform-page-subtitle">{item.description}</p>
                <p className="platform-detail-meta">{formatDateTime(item.timestamp)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
