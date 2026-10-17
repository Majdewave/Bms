// PM (Project Management) foundation API - Phase 1A.
// Isolated module: not imported by any existing page/component yet.
import { get, post, put, del } from './apiClient'
import type { Project, CreateProjectRequest, UpdateProjectRequest } from '@/types/pm'

export const getProjects = async (): Promise<Project[]> => {
  return get<Project[]>('/api/projects')
}

export const getProject = async (id: string): Promise<Project> => {
  return get<Project>(`/api/projects/${id}`)
}

export const getProjectsByClient = async (clientId: string): Promise<Project[]> => {
  return get<Project[]>(`/api/clients/${clientId}/projects`)
}

export const createProject = async (data: CreateProjectRequest): Promise<Project> => {
  return post<Project>('/api/projects', data)
}

export const updateProject = async (id: string, data: UpdateProjectRequest): Promise<Project> => {
  return put<Project>(`/api/projects/${id}`, data)
}

export const deleteProject = async (id: string): Promise<void> => {
  return del(`/api/projects/${id}`)
}
