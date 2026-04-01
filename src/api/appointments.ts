import { get, post, put, del } from './apiClient'

export type AppointmentStatus =
  | 'scheduled'
  | 'waiting'
  | 'inprogress'
  | 'completed'
  | 'cancelled'
  | 'noshow';

export interface Appointment {
  id: string
  clientId: string
  clientName: string
  clientEmail: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes?: string
  createdAt: string
  createdByUserId: string
  isDocumented: boolean
}

// Keep mock data for backwards compatibility (will be removed from components)
const mockAppointments_DEPRECATED: any[] = [
  {
    id: '1',
      clientId: 'c1',
      clientName: 'Sarah Johnson',
      clientEmail: 'sarah.j@example.com',
    title: 'Quarterly Review',
    service: 'Consulting',
    date: '2024-02-15',
    time: '10:00 AM',
    staff: 'Sarah Johnson',
    status: 'scheduled',
    duration: '60 mins',
  },
  {
    id: '2',
      clientId: 'c2',
      clientName: 'Mike Chen',
      clientEmail: 'mike.c@example.com',
    title: 'Project Kickoff',
    service: 'Project Management',
    date: '2024-02-16',
    time: '2:00 PM',
    staff: 'Mike Chen',
    status: 'scheduled',
    duration: '90 mins',
  },
  {
    id: '3',
      clientId: 'c3',
      clientName: 'Emma Wilson',
      clientEmail: 'emma.w@example.com',
    title: 'Strategy Session',
    service: 'Strategy',
    date: '2024-02-20',
    time: '11:00 AM',
    staff: 'Emma Wilson',
    status: 'scheduled',
    duration: '60 mins',
  },
  {
    id: '4',
      clientId: 'c4',
      clientName: 'David Martinez',
      clientEmail: 'david.m@example.com',
    title: 'Budget Review',
    service: 'Financial Planning',
    date: '2024-02-25',
    time: '3:30 PM',
    staff: 'David Martinez',
    status: 'scheduled',
    duration: '45 mins',
  },
  {
    id: '5',
      clientId: 'c3',
      clientName: 'Emma Wilson',
      clientEmail: 'emma.w@example.com',
    title: 'Follow-up Call',
    service: 'Support',
    date: '2024-02-10',
    time: '3:30 PM',
    staff: 'Emma Wilson',
    status: 'completed',
    duration: '30 mins',
  },
  {
    id: '6',
      clientId: 'c1',
      clientName: 'Sarah Johnson',
      clientEmail: 'sarah.j@example.com',
    title: 'Initial Consultation',
    service: 'Consulting',
    date: '2024-02-01',
    time: '9:00 AM',
    staff: 'John Smith',
    status: 'completed',
    duration: '60 mins',
  },
]

export const getAppointments = async (clientId?: string): Promise<Appointment[]> => {
  const url = clientId ? `/api/appointments?clientId=${clientId}` : '/api/appointments'
  return get<Appointment[]>(url)
}

// These can be implemented with query parameters on getAppointments if needed
export const getUpcomingAppointments = async (): Promise<Appointment[]> => {
  return get<Appointment[]>('/api/appointments?upcoming=true')
}

export const getPastAppointments = async (): Promise<Appointment[]> => {
  return get<Appointment[]>('/api/appointments?past=true')
}

export const createAppointment = async (appointment: {
  clientId: string
  startTime: string
  endTime: string
  notes?: string
}): Promise<Appointment> => {
  return post<Appointment>('/api/appointments', appointment)
}

export const updateAppointment = async (
  id: string,
  appointment: Partial<{
    clientId: string
    startTime: string
    endTime: string
    status: string
    notes?: string
    isDocumented?: boolean 
  }>
): Promise<Appointment> => {
  return put<Appointment>(`/api/appointments/${id}`, appointment)
}

export const cancelAppointment = async (id: string): Promise<Appointment> => {
  return put<Appointment>(`/api/appointments/${id}`, { status: 'cancelled' })
}

export const deleteAppointment = async (id: string): Promise<void> => {
  return del<void>(`/api/appointments/${id}`)
}

export interface AppointmentClient {
  id: string
  fullName: string
  email: string
}

export const getClientsForAppointment = async (): Promise<AppointmentClient[]> => {
  return get<AppointmentClient[]>('/api/clients')
}
