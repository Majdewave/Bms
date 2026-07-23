import { Activity, Building2, Clock3, PauseCircle, PlayCircle } from 'lucide-react'
import BusinessStatCard from '@/platform/businesses/components/BusinessStatCard'
import type { PlatformDashboardStatistics } from '@/platform/dashboard/types'

interface DashboardStatsGridProps {
  statistics: PlatformDashboardStatistics
  loading: boolean
}

export default function DashboardStatsGrid({ statistics, loading }: DashboardStatsGridProps) {
  return (
    <section className="platform-stats-grid">
      <BusinessStatCard
        label="Total Businesses"
        value={statistics.total}
        icon={<Building2 className="h-4 w-4" />}
        loading={loading}
      />
      <BusinessStatCard
        label="Pending Approvals"
        value={statistics.pending}
        icon={<Clock3 className="h-4 w-4" />}
        loading={loading}
      />
      <BusinessStatCard
        label="Active Businesses"
        value={statistics.active}
        icon={<PlayCircle className="h-4 w-4" />}
        loading={loading}
      />
      <BusinessStatCard
        label="Trial Businesses"
        value={statistics.trial}
        icon={<Activity className="h-4 w-4" />}
        loading={loading}
      />
      <BusinessStatCard
        label="Suspended Businesses"
        value={statistics.suspended}
        icon={<PauseCircle className="h-4 w-4" />}
        loading={loading}
      />
    </section>
  )
}
