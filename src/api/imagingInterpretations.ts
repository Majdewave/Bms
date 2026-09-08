import * as apiClient from './apiClient'

export type InterpretationRequestStatus =
  | 'Pending'
  | 'InProgress'
  | 'Completed'

export interface InterpretationRequest {
  id: string
  imagingOrderId: string
  imagingStudyId: string
  assignedInterpreterId: string
  assignedInterpreterName: string
  report?: {
    id: string
    content: string
    createdAt: string
    updatedAt: string | null
  } | null
  status: InterpretationRequestStatus
  requestedAt: string
  requestedByUserId: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string | null
  hasFinalPdf: boolean
}

export interface CreateInterpretationRequest {
  assignedInterpreterId: string
  imagingStudyId: string
}

export function createInterpretationRequest(
  imagingOrderId: string,
  request: CreateInterpretationRequest
) {
  return apiClient.post<InterpretationRequest>(
    `/api/imaging/orders/${imagingOrderId}/interpretation-request`,
    request
  )
}

export function getInterpretationRequest(imagingOrderId: string) {
  return apiClient.get<InterpretationRequest>(
    `/api/imaging/orders/${imagingOrderId}/interpretation-request`
  )
}

export function getClinicInterpretationPdf(requestId: string, download = false) {
  return apiClient.getBlob(
    `/api/imaging/interpretation-requests/${requestId}/report/pdf${download ? '?download=true' : ''}`
  )
}


export interface ImagingInterpreterOption {
  userId: string
  fullName: string
}

export function getImagingInterpreters() {
  return apiClient.get<ImagingInterpreterOption[]>(
    '/api/imaging/interpreters'
  )
}

