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

export interface ImagingOrderReferralDocument {
  id: string
  documentType: string
  originalFileName: string
  contentType: string
  fileSize: number
  createdAt: string
}

export interface ImagingOrderReferral {
  imagingOrderId: string
  referringDoctorName?: string | null
  document?: ImagingOrderReferralDocument | null
}

export interface ClientImagingCase {
  id: string
  clientId: string
  appointmentId: string
  serviceId?: string | null
  accessionNumber: string
  modality: string
  status: string
  referringDoctorName?: string | null
  scheduledStartTime: string
  createdAt: string
  referral?: ImagingOrderReferralDocument | null
  study?: ImagingStudySummary | null
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

export interface CanonicalAnnotationGeometry {
  data: Record<string, unknown>
  metadata: {
    FrameOfReferenceUID?: string
    viewPlaneNormal?: number[]
    viewUp?: number[]
  }
}

export interface ImagingAnnotation {
  id: string
  imagingInstanceId: string
  frameNumber: number
  annotationUid: string
  toolName: string
  geometry: CanonicalAnnotationGeometry | string
  label?: string | null
  createdByUserId: string
  createdAt: string
  updatedByUserId?: string | null
  updatedAt?: string | null
}

export interface CreateImagingAnnotationRequest {
  imagingInstanceId: string
  frameNumber: number
  annotationUid: string
  toolName: string
  geometry: CanonicalAnnotationGeometry
  label?: string | null
}

export interface UpdateImagingAnnotationRequest {
  geometry: CanonicalAnnotationGeometry
  label?: string | null
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

export const getClientImagingCases = async (clientId: string): Promise<ClientImagingCase[]> => {
  return apiClient.get<ClientImagingCase[]>(`/api/clients/${clientId}/imaging/cases`)
}

export const getStudyHierarchy = async (studyId: string): Promise<ImagingStudyHierarchy> => {
  return apiClient.get<ImagingStudyHierarchy>(`/api/imaging/studies/${studyId}`)
}

export const uploadImagingOrderReferralDocument = async (
  imagingOrderId: string,
  file: File,
): Promise<ImagingOrderReferralDocument> => {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient.post<ImagingOrderReferralDocument>(
    `/api/imaging/orders/${imagingOrderId}/referral/document`,
    formData,
  )
}

export const getImagingOrderReferral = async (imagingOrderId: string): Promise<ImagingOrderReferral> => {
  return apiClient.get<ImagingOrderReferral>(`/api/imaging/orders/${imagingOrderId}/referral`)
}

export const updateImagingOrderReferral = async (
  imagingOrderId: string,
  referringDoctorName: string | null,
): Promise<ImagingOrderReferral> => {
  return apiClient.put<ImagingOrderReferral>(`/api/imaging/orders/${imagingOrderId}/referral`, {
    referringDoctorName,
  })
}

export const getImagingOrderReferralDocument = async (imagingOrderId: string): Promise<Blob> => {
  return apiClient.getBlob(`/api/imaging/orders/${imagingOrderId}/referral/document`)
}

export const deleteImagingOrderReferralDocument = async (imagingOrderId: string): Promise<void> => {
  await apiClient.delNoContent(`/api/imaging/orders/${imagingOrderId}/referral/document`)
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

export const getImagingAnnotations = async (imagingInstanceId: string, frameNumber: number): Promise<ImagingAnnotation[]> => {
  return apiClient.get<ImagingAnnotation[]>(
    `/api/imaging/instances/${imagingInstanceId}/annotations?frameNumber=${frameNumber}`
  )
}

export const createImagingAnnotation = async (request: CreateImagingAnnotationRequest): Promise<ImagingAnnotation> => {
  return apiClient.post<ImagingAnnotation>('/api/imaging/annotations', request)
}

export const updateImagingAnnotation = async (annotationId: string, request: UpdateImagingAnnotationRequest): Promise<ImagingAnnotation> => {
  return apiClient.put<ImagingAnnotation>(`/api/imaging/annotations/${annotationId}`, request)
}

export const deleteImagingAnnotation = async (annotationId: string): Promise<void> => {
  await apiClient.delNoContent(`/api/imaging/annotations/${annotationId}`)
}
