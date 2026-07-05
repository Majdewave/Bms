import { get, post, put, del } from './apiClient'

export type StaffPermission =
  | 'manage_clients'
  | 'manage_appointments'
  | 'manage_invoices'
  | 'manage_notes'
  | 'manage_files'
  | 'manage_staff'

export type VisibleMenuItem = 'clients' | 'appointments'

export interface StaffMember {
  id: string
  fullName: string
  email: string
  role?: string
  roleLabel: string
  isActive: boolean
  permissions: string[]
  departmentIds: string[]
  useStamp?: boolean
  stampUrl?: string
}

export interface CreateStaffRequest {
  FullName: string
  Email: string
  Password: string
  role?: string
  RoleLabel: string
  Permissions: string[]
  DepartmentIds?: string[]
  VisibleMenuItems?: string[]
  UseStamp?: boolean
  StampUrl?: string
}

export interface UpdateStaffRequest {
  FullName: string
  role?: string
  RoleLabel: string
  UseStamp?: boolean
  StampUrl?: string
  IsActive: boolean
  Permissions: string[]
  DepartmentIds?: string[]
  Password?: string
  Email?: string
}

export const staffService = {
  async getStaffMembers(): Promise<StaffMember[]> {
    return get<StaffMember[]>('/api/staff')
  },

  async getStaffMember(id: string): Promise<StaffMember> {
    return get<StaffMember>(`/api/staff/${id}`)
  },

  async createStaffMember(
    data: CreateStaffRequest
  ): Promise<StaffMember> {
    return post<StaffMember>('/api/staff', data)
  },

  async updateStaffMember(
    id: string,
    data: UpdateStaffRequest
  ): Promise<StaffMember> {
    return put<StaffMember>(`/api/staff/${id}`, data)
  },

  async toggleStaffStatus(
  staffMember: StaffMember
  ): Promise<StaffMember> {
    const payload: UpdateStaffRequest = {
      FullName: staffMember.fullName,
      Email: staffMember.email,
      role: staffMember.role,
      RoleLabel: staffMember.roleLabel,
      IsActive: !staffMember.isActive,
      Permissions: staffMember.permissions || [],
      DepartmentIds: staffMember.departmentIds || [],
    }

    return put<StaffMember>(`/api/staff/${staffMember.id}`, payload)
  },

  async deleteStaffMember(id: string): Promise<void> {
    return del<void>(`/api/staff/${id}`)
  },

  async sendLoginLink(id: string): Promise<void> {
    return post<void>(`/api/staff/${id}/send-login-link`, {})
  },

  async uploadStamp(id: string, file: File): Promise<{ stampUrl: string }> {
    const formData = new FormData()
    formData.append('file', file)

    return post<{ stampUrl: string }>(`/api/staff/${id}/stamp`, formData, true)
  },
}