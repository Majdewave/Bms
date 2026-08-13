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

export interface QueueDisplayAdvertisementImage {
  id: string
  imageUrl: string
  displayOrder: number
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
  advertisementImages: QueueDisplayAdvertisementImage[]
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
  advertisementImages: QueueDisplayAdvertisementImage[]
}

export interface QueueDisplayAccessLink {
  publicToken: string
}

export interface UpdateQueueDisplaySettingsRequest {
  privacyMode: QueueDisplayPrivacyMode
  theme: QueueDisplayTheme
  logoOverrideUrl?: string | null
}

export type UploadProgress = {
  loaded: number
  total: number | null
  percent: number
}

const uploadWithProgress = <T>(
  endpoint: string,
  files: File[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<T> => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}${endpoint}`)
    xhr.withCredentials = true

    const language = localStorage.getItem('language') || 'en'
    xhr.setRequestHeader('Accept-Language', language)

    const token = localStorage.getItem('token')
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        onProgress?.({
          loaded: event.loaded,
          total: null,
          percent: 0,
        })
        return
      }

      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent,
      })
    }

    xhr.onload = () => {
      const responseText = xhr.responseText

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(responseText) as T)
        } catch {
          resolve({} as T)
        }
        return
      }

      let message = `Request failed with status ${xhr.status}`
      if (responseText) {
        try {
          const parsed = JSON.parse(responseText)
          message = parsed?.message || parsed?.error || message
        } catch {
          message = responseText
        }
      }

      reject(new Error(message))
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new Error('Upload aborted'))

    xhr.send(formData)
  })
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
  uploadAdvertisementImages: async (files: File[]) => {
    return uploadWithProgress<QueueDisplaySettings>('/api/queue-display/settings/advertisement-images', files)
  },
  uploadAdvertisementImagesWithProgress: async (
    files: File[],
    onProgress: (progress: UploadProgress) => void,
  ) => {
    return uploadWithProgress<QueueDisplaySettings>('/api/queue-display/settings/advertisement-images', files, onProgress)
  },
  deleteAdvertisementImage: (imageId: string) =>
    apiClient.del<QueueDisplaySettings>(`/api/queue-display/settings/advertisement-images/${encodeURIComponent(imageId)}`),
  clearAdvertisementImages: () => apiClient.del<QueueDisplaySettings>('/api/queue-display/settings/advertisement-image'),
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
