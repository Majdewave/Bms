import { delNoContent, get, getBlob, post, put } from './apiClient'

export interface InterpreterProfile {
  id: string
  email: string
  fullName: string
  phone: string | null
  licenseNumber: string | null
  hasStamp: boolean
}

export interface UpdateInterpreterProfileRequest {
  fullName: string
  phone: string | null
  licenseNumber: string | null
}

export function getInterpreterProfile() {
  return get<InterpreterProfile>('/api/interpreter/profile')
}

export function updateInterpreterProfile(request: UpdateInterpreterProfileRequest) {
  return put<InterpreterProfile>('/api/interpreter/profile', request)
}

export function uploadInterpreterStamp(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return post<InterpreterProfile>('/api/interpreter/profile/stamp', formData, true)
}

export function getInterpreterStamp() {
  return getBlob('/api/interpreter/profile/stamp')
}

export function deleteInterpreterStamp() {
  return delNoContent('/api/interpreter/profile/stamp')
}
