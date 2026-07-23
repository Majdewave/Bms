import { platformRequest } from '@/platform/services/platformApiClient'
import type { PlatformDashboardData } from '@/platform/dashboard/types'

export async function fetchPlatformDashboard(signal?: AbortSignal): Promise<PlatformDashboardData> {
  return platformRequest<PlatformDashboardData>('/api/platform/dashboard', { method: 'GET', signal })
}
