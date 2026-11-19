import { get } from './apiClient'

export interface AppointmentStaffOption {
  id: string
  fullName: string
  email: string
  departmentIds: string[]
}

export interface AppointmentTechnicianOption {
  id: string
  fullName: string
  email: string
}

export const appointmentStaffService = {
  async getStaffOptions(): Promise<AppointmentStaffOption[]> {
    return get<AppointmentStaffOption[]>('/api/appointments/staff-options')
  },

  async getTechnicianOptions(): Promise<AppointmentTechnicianOption[]> {
    return get<AppointmentTechnicianOption[]>('/api/appointments/technician-options')
  },
}
