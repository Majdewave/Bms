import { get, post, put, del } from './apiClient'
import type { AppointmentStatus } from './appointments';


const normalizeStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'scheduled': return 'Scheduled'
    case 'waiting': return 'Waiting'
    case 'inprogress': return 'InProgress'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    case 'noshow': return 'NoShow'
    default: return status
  }
}

export interface Appointment {
  id: string
  clientId: string
  startTime: string
  endTime: string
  notes?: string | null
  serviceId?: string | null
  staffId?: string | null
  staffName?: string | null
  status: AppointmentStatus
  isDocumented: boolean
}

export const appointmentsService = {
  async getAppointments(): Promise<{ forbidden: boolean; data: Appointment[] }> {
    const result = await get<any>('/api/appointments');
    if (result?.forbidden) {
      return { forbidden: true, data: [] };
    }
    return { forbidden: false, data: result };
  },

  markNotDocumented: async (appointment: Appointment) => {
  return await put(`/api/appointments/${appointment.id}`, {
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: normalizeStatus(appointment.status),
    notes: appointment.notes ?? null,
    staffId: appointment.staffId ?? null,
    serviceId: appointment.serviceId ?? null,
    isDocumented: false
  })
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