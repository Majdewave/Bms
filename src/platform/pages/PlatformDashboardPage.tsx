import { useEffect, useState } from 'react'
import ActivityTimeline from '@/platform/dashboard/components/ActivityTimeline'
import DashboardStatsGrid from '@/platform/dashboard/components/DashboardStatsGrid'
import PlatformHealthPanel from '@/platform/dashboard/components/PlatformHealthPanel'
import QuickActionsPanel from '@/platform/dashboard/components/QuickActionsPanel'
import RecentRegistrationsTable from '@/platform/dashboard/components/RecentRegistrationsTable'
import TrialExpiringTable from '@/platform/dashboard/components/TrialExpiringTable'
import { fetchPlatformDashboard } from '@/platform/dashboard/services/platformDashboardService'
import type { PlatformDashboardData } from '@/platform/dashboard/types'
import ErrorState from '@/platform/components/ui/ErrorState'
import { PlatformApiError } from '@/platform/services/platformApiClient'

const emptyDashboard: PlatformDashboardData = {
  statistics: {
    total: 0,
    pending: 0,
    active: 0,
    trial: 0,
    suspended: 0,
  },
  upcomingTrials: [],
  recentRegistrations: [],
  recentActivity: [],
  platformHealth: {
    api: { status: 'Healthy', message: '' },
    database: { status: 'Healthy', message: '' },
    storage: { status: 'Healthy', message: '' },
    email: { status: 'Healthy', message: '' },
    whatsApp: { status: 'Healthy', message: '' },
    stripe: { status: 'Healthy', message: '' },
  },
}

export default function PlatformDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<PlatformDashboardData>(emptyDashboard)

  const loadDashboard = async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchPlatformDashboard(signal)
      setDashboard(data)
    } catch (err) {
      if (signal?.aborted) {
        return
      }

      if (err instanceof PlatformApiError) {
        setError(err.message)
      } else {
        setError('Failed to load dashboard data.')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void loadDashboard(controller.signal)
    return () => controller.abort()
  }, [])

  if (error && !loading) {
    return <ErrorState title="Could not load platform dashboard" description={error} onRetry={loadDashboard} />
  }

  return (
    <div className="platform-page">
      <header className="platform-page-header">
        <div>
          <h2 className="platform-page-title">Platform Dashboard</h2>
          <p className="platform-page-subtitle">Operational overview for the entire Clienta platform.</p>
        </div>
      </header>

      <DashboardStatsGrid statistics={dashboard.statistics} loading={loading} />

      <div className="platform-dashboard-grid">
        <div className="platform-dashboard-main">
          <TrialExpiringTable items={dashboard.upcomingTrials} loading={loading} />
          <RecentRegistrationsTable items={dashboard.recentRegistrations} loading={loading} />
          <ActivityTimeline items={dashboard.recentActivity} loading={loading} />
        </div>

        <div className="platform-dashboard-side">
          <PlatformHealthPanel health={dashboard.platformHealth} loading={loading} />
          <QuickActionsPanel pendingApprovals={dashboard.statistics.pending} />
        </div>
      </div>
    </div>
  )
}
