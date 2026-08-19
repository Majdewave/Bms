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
  SOPInstanceUID: string
  SOPClassUID: string
  InstanceNumber?: number | null
  FileSizeBytes?: number | null
  StorageStatus: string
  ReceivedAt: string
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
  Id: string
  ImagingOrderId?: string | null
  AccessionNumber: string
  StudyInstanceUID: string
  Modality: string
  Status: string
  ReceivedAt: string
  StorageStatus: string
  CreatedAt: string
  Series: ImagingSeriesDetail[]
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
