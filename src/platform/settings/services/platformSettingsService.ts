import { platformRequest } from '@/platform/services/platformApiClient'
import { get } from '@/api/apiClient'

export interface PlatformSettings {
  id: string
  supportEmail: string
  supportPhone: string | null
  websiteUrl: string | null
  defaultTrialDays: number
  trialReminderDays: number
  allowRegistrations: boolean
  requireManualApproval: boolean
  enableBilling: boolean
  enableHelpCenter: boolean
  whatsappEnabled: boolean
  proMonthlyPrice: number
  proAnnualPrice: number
  proDescription: string
  proEnabled: boolean
  proDisplayOrder: number
  updatedAt: string
}

export type UpdatePlatformSettingsPayload = Omit<PlatformSettings, 'id' | 'updatedAt'>

export async function fetchPlatformSettings(signal?: AbortSignal): Promise<PlatformSettings> {
  return platformRequest<PlatformSettings>('/api/platform/settings', { method: 'GET', signal })
}

export async function fetchPublicPlatformSettings(_signal?: AbortSignal): Promise<PlatformSettings> {
  return get<PlatformSettings>('/api/platform/settings/public')
}

export async function updatePlatformSettings(payload: UpdatePlatformSettingsPayload): Promise<PlatformSettings> {
  return platformRequest<PlatformSettings>('/api/platform/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}