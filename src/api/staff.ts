import { get, post, put, del } from './apiClient'

export interface StaffMember {
  id: string
  fullName: string
  email: string
  roleLabel: string
  isActive: boolean
  permissions: string[]
}

export interface CreateStaffRequest {
  FullName: string
  Email: string
  Password: string
  RoleLabel: string
  Permissions: string[]
  VisibleMenuItems?: string[]
}

export interface UpdateStaffRequest {
  FullName: string
  RoleLabel: string
  IsActive: boolean
  Permissions: string[]
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
      RoleLabel: staffMember.roleLabel,
      IsActive: !staffMember.isActive,
      Permissions: staffMember.permissions || [],
    }

    return put<StaffMember>(`/api/staff/${staffMember.id}`, payload)
  },

  async deleteStaffMember(id: string): Promise<void> {
    return del<void>(`/api/staff/${id}`)
  },
}