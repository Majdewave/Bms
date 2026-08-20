import * as apiClient from './apiClient'

export interface ImagingStudySummary {
  id: string
  imagingOrderId?: string | null
  accessionNumber: string
  studyInstanceUID: string
  modality: string
  status: string
  receivedAt: string
  storageStatus: string
  createdAt: string
}

export interface ImagingInstanceDetail {
  id: string
  sopInstanceUID: string
  sopClassUID: string
  instanceNumber?: number | null
  fileSizeBytes?: number | null
  storageStatus: string
  modality?: string | null
  receivedAt: string
}

export interface ImagingSeriesDetail {
  id: string
  seriesInstanceUID: string
  modality: string
  seriesNumber?: number | null
  seriesDescription?: string | null
  createdAt: string
  instances: ImagingInstanceDetail[]
}

export interface ImagingStudyHierarchy {
  id: string
  imagingOrderId?: string | null
  accessionNumber: string
  studyInstanceUID: string
  modality: string
  status: string
  receivedAt: string
  storageStatus: string
  createdAt: string
  series: ImagingSeriesDetail[]
}

export const getClientImagingStudies = async (clientId: string): Promise<ImagingStudySummary[]> => {
  return apiClient.get<ImagingStudySummary[]>(`/api/clients/${clientId}/imaging/studies`)
}

export const getStudyHierarchy = async (studyId: string): Promise<ImagingStudyHierarchy> => {
  return apiClient.get<ImagingStudyHierarchy>(`/api/imaging/studies/${studyId}`)
}

export const getInstanceFileBlob = async (instanceId: string): Promise<Blob> => {
  const response = await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:5146'}/api/imaging/instances/${instanceId}/file`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      'Accept-Language': localStorage.getItem('language') || 'en',
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Failed to load imaging file')
  }

  return response.blob()
}
