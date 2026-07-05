import { del, get, post, put } from './apiClient'

export interface Department {
  id: string
  tenantId: string
  name: string
  description?: string | null
  color?: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
}

export interface CreateDepartmentRequest {
  name: string
  description?: string | null
  color?: string | null
  displayOrder?: number
}

export interface UpdateDepartmentRequest {
  name: string
  description?: string | null
  color?: string | null
  displayOrder: number
  isActive: boolean
}

export const departmentService = {
  async getDepartments(): Promise<Department[]> {
    return get<Department[]>('/api/departments')
  },

  async getDepartment(id: string): Promise<Department> {
    return get<Department>(`/api/departments/${id}`)
  },

  async createDepartment(data: CreateDepartmentRequest): Promise<Department> {
    return post<Department>('/api/departments', data)
  },

  async updateDepartment(id: string, data: UpdateDepartmentRequest): Promise<Department> {
    return put<Department>(`/api/departments/${id}`, data)
  },

  async deleteDepartment(id: string): Promise<void> {
    return del<void>(`/api/departments/${id}`)
  },
}