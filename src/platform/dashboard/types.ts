export type HealthStatus = 'Healthy' | 'Warning' | 'Offline'

export interface PlatformDashboardStatistics {
  total: number
  pending: number
  active: number
  trial: number
  suspended: number
}

export interface PlatformTrialExpiringItem {
  tenantId: string
  businessName: string
  ownerName: string | null
  trialEndsAt: string
  daysRemaining: number
}

export interface PlatformRecentRegistrationItem {
  tenantId: string
  businessName: string
  ownerName: string | null
  createdAt: string
  status: string
}

export interface PlatformDashboardActivityItem {
  id: string
  title: string
  description: string
  timestamp: string
  source: string
}

export interface PlatformHealthItem {
  status: HealthStatus
  message: string
}

export interface PlatformHealth {
  api: PlatformHealthItem
  database: PlatformHealthItem
  storage: PlatformHealthItem
  email: PlatformHealthItem
  whatsApp: PlatformHealthItem
  stripe: PlatformHealthItem
}

export interface PlatformDashboardData {
  statistics: PlatformDashboardStatistics
  upcomingTrials: PlatformTrialExpiringItem[]
  recentRegistrations: PlatformRecentRegistrationItem[]
  recentActivity: PlatformDashboardActivityItem[]
  platformHealth: PlatformHealth
}
