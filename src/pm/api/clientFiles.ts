// PM client-scoped Files wrapper (existing FilesController) plus Phase 7 project-scoped routes (ProjectFilesController).
import { get, post, patch, del, getBlob } from '@/api/apiClient'

export interface ClientFileRecord {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  title?: string | null
  projectId?: string | null
  projectName?: string | null
  uploadedByName?: string | null
}

export const getClientFiles = async (clientId: string): Promise<ClientFileRecord[]> => {
  return get<ClientFileRecord[]>(`/api/clients/${clientId}/files`)
}

export const uploadClientFile = async (clientId: string, file: File): Promise<ClientFileRecord> => {
  const formData = new FormData()
  formData.append('file', file)
  return post<ClientFileRecord>(`/api/clients/${clientId}/files`, formData, true)
}

export const downloadClientFile = async (clientId: string, fileId: string): Promise<Blob> => {
  return getBlob(`/api/clients/${clientId}/files/${fileId}/download`)
}

export const deleteClientFile = async (clientId: string, fileId: string): Promise<void> => {
  return del(`/api/clients/${clientId}/files/${fileId}`)
}

export const getProjectFiles = async (projectId: string): Promise<ClientFileRecord[]> => {
  return get<ClientFileRecord[]>(`/api/projects/${projectId}/files`)
}

export const uploadProjectFile = async (projectId: string, file: File, title?: string): Promise<ClientFileRecord> => {
  const formData = new FormData()
  formData.append('file', file)
  if (title && title.trim()) formData.append('title', title.trim())
  return post<ClientFileRecord>(`/api/projects/${projectId}/files`, formData, true)
}

export const downloadProjectFile = async (projectId: string, fileId: string): Promise<Blob> => {
  return getBlob(`/api/projects/${projectId}/files/${fileId}/download`)
}

export const updateProjectFileTitle = async (projectId: string, fileId: string, title: string): Promise<ClientFileRecord> => {
  return patch<ClientFileRecord>(`/api/projects/${projectId}/files/${fileId}`, { title })
}

export const deleteProjectFile = async (projectId: string, fileId: string): Promise<void> => {
  return del(`/api/projects/${projectId}/files/${fileId}`)
}
