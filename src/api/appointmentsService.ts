import { get, post, put, del } from './apiClient'

export interface Appointment {
  id: string
  clientId: string
  startTime: string
  endTime: string
  notes?: string | null
  serviceId?: string | null
  staffId?: string | null
  staffName?: string | null
  status: string
}

export const appointmentsService = {
  async getAppointments(): Promise<Appointment[]> {
    return await get<Appointment[]>('/api/appointments')
  },

  async createAppointment(payload: {
    clientId: string
    startTime: string
    endTime: string
    notes?: string | null
    serviceId?: string | null
    staffId?: string | null
  }): Promise<Appointment> {
    return await post<Appointment>('/api/appointments', payload)
  },

  async updateAppointment(
    id: string,
    payload: {
      startTime: string
      endTime: string
      status: string
      notes?: string | null
      staffId?: string | null
      serviceId?: string | null
    }
  ): Promise<void> {
    return await put<void>(`/api/appointments/${id}`, payload)
  },

  async deleteAppointment(id: string): Promise<void> {
    return await del<void>(`/api/appointments/${id}`)
  },
}