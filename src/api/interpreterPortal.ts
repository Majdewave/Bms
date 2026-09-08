import type { ImagingAnnotation } from './imaging'
import * as apiClient from './apiClient'

export type InterpretationRequestStatus =
  | 'Pending'
  | 'InProgress'
  | 'Completed'

export interface InterpreterRequestListItem {
  id: string
  imagingOrderId: string
  imagingStudyId: string
  accessionNumber: string
  modality: string
  clientId: string
  clientDisplayName: string
  status: InterpretationRequestStatus
  requestedAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface InterpreterReferralMetadata {
  id: string
  fileName: string
  contentType: string
  fileSize: number
}

export interface InterpreterInstance {
  id: string
  sopInstanceUID: string
  sopClassUID: string
  instanceNumber: number | null
  fileSizeBytes: number | null
}

export interface InterpreterSeries {
  id: string
  seriesInstanceUID: string
  modality: string
  seriesNumber: number | null
  seriesDescription: string | null
  instances: InterpreterInstance[]
}

export interface InterpreterReport {
  id: string
  content: string
  createdAt: string
  updatedAt: string | null
}

export interface InterpreterCase {
  requestId: string
  status: InterpretationRequestStatus
  requestedAt: string
  startedAt: string | null
  completedAt: string | null

  clientId: string
  clientDisplayName: string

  imagingOrderId: string
  accessionNumber: string
  modality: string
  scheduledStartTime: string
  referringDoctorName: string | null

  imagingStudyId: string
  studyInstanceUID: string
  studyStatus: string
  receivedAt: string

  referral: InterpreterReferralMetadata | null
  series: InterpreterSeries[]
  report: InterpreterReport | null
  hasFinalPdf: boolean
}

export function getInterpretationRequests() {
  return apiClient.get<InterpreterRequestListItem[]>(
    '/api/interpreter/interpretation-requests'
  )
}

export function getInterpretationCase(requestId: string) {
  return apiClient.get<InterpreterCase>(
    `/api/interpreter/interpretation-requests/${requestId}/case`
  )
}

export function getReferral(requestId: string) {
  return apiClient.getBlob(
    `/api/interpreter/interpretation-requests/${requestId}/referral`
  )
}

export function getInterpretationPdf(requestId: string, download = false) {
  return apiClient.getBlob(
    `/api/interpreter/interpretation-requests/${requestId}/report/pdf${download ? '?download=true' : ''}`
  )
}

export function getInstanceFile(
  requestId: string,
  instanceId: string
) {
  return apiClient.getBlob(
    `/api/interpreter/interpretation-requests/${requestId}/instances/${instanceId}/file`
  )
}

export function getInstanceAnnotations(
  requestId: string,
  instanceId: string,
  frameNumber?: number
) {
  const query = frameNumber === undefined ? '' : `?frameNumber=${frameNumber}`
  return apiClient.get<ImagingAnnotation[]>(
    `/api/interpreter/interpretation-requests/${requestId}/instances/${instanceId}/annotations${query}`
  )
}
export function saveInterpretationReport(
  requestId: string,
  content: string
) {
  return apiClient.put<InterpreterReport>(
    `/api/interpreter/interpretation-requests/${requestId}/report`,
    { content }
  )
}

export function completeInterpretation(requestId: string) {
  return apiClient.post<{
    requestId: string
    status: InterpretationRequestStatus
    startedAt: string | null
    completedAt: string
  }>(
    `/api/interpreter/interpretation-requests/${requestId}/complete`,
    {}
  )
}

