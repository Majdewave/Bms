import { get, post, put, del } from './apiClient'


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
  clientName: string
  clientEmail?: string | null
  serviceName?: string | null
  departmentId?: string | null
  departmentName?: string | null
  departmentColor?: string | null
  startTime: string
  endTime: string
  notes?: string | null
  serviceId?: string | null
  staffId?: string | null
  staffName?: string | null
  status: string
  queueNumber?: number | null
  isDocumented: boolean
  hasSignedConsent?: boolean
  imagingOrderId?: string | null
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
    referringDoctorName?: string | null
  }): Promise<Appointment> {
    return await post<Appointment>('/api/appointments', payload)
  },

  async updateAppointment(
    id: string,
    payload: Partial<{
      startTime: string
      endTime: string
      status: string
      notes?: string | null
      staffId?: string | null
      serviceId?: string | null
      isDocumented?: boolean
      queueNumber?: number | null
    }>
  ): Promise<void> {
    return await put<void>(`/api/appointments/${id}`, payload)
  },

  async reorderWaitingQueue(
    items: Array<{ id: string; queueNumber: number }>
  ): Promise<void> {
    await post<void>('/api/appointments/waiting-queue/reorder', { items })
  },

  async deleteAppointment(id: string): Promise<void> {
    return await del<void>(`/api/appointments/${id}`)
  },
}