import type { BusinessPlan, BusinessStatus } from '@/platform/businesses/types'

export type ConnectedServiceStatus = 'Connected' | 'Disconnected' | 'Pending'

export type PlatformBusinessLifecycleStatus = BusinessStatus | 'Deleted'

export interface ConnectedServices {
  stripe: ConnectedServiceStatus
  whatsapp: ConnectedServiceStatus
  email: ConnectedServiceStatus
  storage: ConnectedServiceStatus
}

export interface TenantUserRecord {
  id: string
  name: string
  email: string
  role: string
  lastLoginAt: string | null
  status: 'Active' | 'Inactive' | 'Pending'
}

export interface ActivityItem {
  id: string
  title: string
  description: string
  timestamp: string
}

export interface BusinessDetails {
  tenantId: string
  businessName: string | null
  legalName: string | null
  subdomain: string | null
  businessType: string | null
  registrationDate: string | null
  ownerName: string | null
  ownerEmail: string | null
  ownerPhone: string | null

  plan: BusinessPlan | null
  trialStatus: string | null
  trialEndsAt: string | null
  subscriptionStatus: string | null
  subscriptionStart: string | null
  subscriptionEnd: string | null
  renewalDate: string | null

  businessStatus: PlatformBusinessLifecycleStatus | null
  approved: boolean | null
  suspended: boolean | null
  deleted: boolean | null

  createdAt: string | null
  lastLoginAt: string | null

  services: ConnectedServices
  users: TenantUserRecord[]
  recentActivity: ActivityItem[]
}

export interface BusinessDetailsResult {
  data: BusinessDetails
}
