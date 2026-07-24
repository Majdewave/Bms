import * as apiClient from '@/api/apiClient'
import * as signalR from '@microsoft/signalr'
import { getApiBaseUrl } from '@/lib/apiBaseUrl'

const BASE_URL = getApiBaseUrl()

export enum QueueDisplayTheme {
  Default = 0,
  Light = 1,
  Dark = 2,
  Blue = 3,
}

export enum QueueDisplayPrivacyMode {
  FullName = 0,
  FirstNameOnly = 1,
  QueueNumberOnly = 2,
}

export interface QueueDisplayPatient {
  appointmentId: string
  queueNumber: number | null
  displayName: string
  status: string
}

export interface QueueDisplayData {
  businessName: string
  logoUrl: string | null
  theme: QueueDisplayTheme
  privacyMode: QueueDisplayPrivacyMode
  advertisementImageUrl: string | null
  waitingCount: number
  current: QueueDisplayPatient | null
  next: QueueDisplayPatient | null
  lastUpdatedUtc: string
  version: string
  generatedAtUtc: string
}

export interface QueueDisplaySettings {
  publicToken: string
  privacyMode: QueueDisplayPrivacyMode
  theme: QueueDisplayTheme
  logoOverrideUrl: string | null
  advertisementImageUrl: string | null
}

export interface QueueDisplayAccessLink {
  publicToken: string
}

export interface UpdateQueueDisplaySettingsRequest {
  privacyMode: QueueDisplayPrivacyMode
  theme: QueueDisplayTheme
  logoOverrideUrl?: string | null
  advertisementImageUrl?: string | null
}

export const queueDisplayApi = {
  getSettings: () => apiClient.get<QueueDisplaySettings>('/api/queue-display/settings'),
  getAccessLink: () => apiClient.get<QueueDisplayAccessLink>('/api/queue-display/access-link'),
  updateSettings: (payload: UpdateQueueDisplaySettingsRequest) =>
    apiClient.put<QueueDisplaySettings>('/api/queue-display/settings', payload),
  regenerateToken: () => apiClient.post<QueueDisplaySettings>('/api/queue-display/settings/regenerate-token'),
  uploadLogoOverride: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<QueueDisplaySettings>('/api/queue-display/settings/logo-override', formData, true)
  },
  deleteLogoOverride: () => apiClient.del<QueueDisplaySettings>('/api/queue-display/settings/logo-override'),
  uploadAdvertisementImage: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<QueueDisplaySettings>('/api/queue-display/settings/advertisement-image', formData, true)
  },
  deleteAdvertisementImage: () => apiClient.del<QueueDisplaySettings>('/api/queue-display/settings/advertisement-image'),
  getPublicDisplay: async (token: string, departmentId?: string) => {
    const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : ''
    const response = await fetch(`${BASE_URL}/api/queue-display/public/${encodeURIComponent(token)}${query}`)
    if (!response.ok) {
      throw new Error('Unable to load queue display')
    }

    return (await response.json()) as QueueDisplayData
  },
  createPublicConnection: (displayToken: string) =>
    new signalR.HubConnectionBuilder()
      .withUrl(`${BASE_URL}/hubs/queue-display?displayToken=${encodeURIComponent(displayToken)}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build(),
}
