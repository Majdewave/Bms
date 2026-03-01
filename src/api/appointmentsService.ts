// Mock Appointments Service
export interface Appointment {
  id: string
  title: string
  service: string
  date: string
  time: string
  attendee: string
  staff: string
  status: 'scheduled' | 'completed' | 'cancelled'
  description?: string
  duration?: string
}

class AppointmentsService {
  async getAppointments(): Promise<Appointment[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: '1',
            title: 'Quarterly Review',
            service: 'Consulting',
            date: '2024-02-15',
            time: '10:00 AM',
            attendee: 'Sarah Johnson',
            staff: 'Sarah Johnson',
            status: 'scheduled',
            duration: '60 mins',
          },
          {
            id: '2',
            title: 'Project Kickoff',
            service: 'Project Management',
            date: '2024-02-16',
            time: '2:00 PM',
            attendee: 'Mike Chen',
            staff: 'Mike Chen',
            status: 'scheduled',
            duration: '90 mins',
          },
          {
            id: '3',
            title: 'Strategy Session',
            service: 'Strategy',
            date: '2024-02-20',
            time: '11:00 AM',
            attendee: 'Emma Wilson',
            staff: 'Emma Wilson',
            status: 'scheduled',
            duration: '60 mins',
          },
          {
            id: '4',
            title: 'Budget Review',
            service: 'Financial Planning',
            date: '2024-02-25',
            time: '3:30 PM',
            attendee: 'David Martinez',
            staff: 'David Martinez',
            status: 'scheduled',
            duration: '45 mins',
          },
          {
            id: '5',
            title: 'Follow-up Call',
            service: 'Support',
            date: '2024-02-10',
            time: '3:30 PM',
            attendee: 'Emma Wilson',
            staff: 'Emma Wilson',
            status: 'completed',
            duration: '30 mins',
          },
          {
            id: '6',
            title: 'Initial Consultation',
            service: 'Consulting',
            date: '2024-02-01',
            time: '9:00 AM',
            attendee: 'John Smith',
            staff: 'John Smith',
            status: 'completed',
            duration: '60 mins',
          },
          {
            id: '7',
            title: 'Training Session',
            service: 'Training',
            date: '2024-01-28',
            time: '2:00 PM',
            attendee: 'Lisa Anderson',
            staff: 'Lisa Anderson',
            status: 'completed',
            duration: '120 mins',
          },
          {
            id: '8',
            title: 'Product Demo',
            service: 'Product',
            date: '2024-01-15',
            time: '10:00 AM',
            attendee: 'Robert Taylor',
            staff: 'Robert Taylor',
            status: 'completed',
            duration: '45 mins',
          },
          {
            id: '9',
            title: 'Rescheduled Meeting',
            service: 'Consulting',
            date: '2024-01-10',
            time: '1:00 PM',
            attendee: 'Sarah Johnson',
            staff: 'Sarah Johnson',
            status: 'cancelled',
            duration: '60 mins',
          },
        ])
      }, 500)
    })
  }

  async getUpcomingAppointments(): Promise<Appointment[]> {
    const all = await this.getAppointments()
    const today = new Date('2024-02-14') // Mock current date
    return all.filter((apt) => new Date(apt.date) >= today && apt.status === 'scheduled')
  }

  async getPastAppointments(): Promise<Appointment[]> {
    const all = await this.getAppointments()
    const today = new Date('2024-02-14') // Mock current date
    return all.filter((apt) => new Date(apt.date) < today || apt.status !== 'scheduled')
  }

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          ...appointment,
        })
      }, 500)
    })
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id,
          title: appointment.title || '',
          service: appointment.service || '',
          date: appointment.date || '',
          time: appointment.time || '',
          attendee: appointment.attendee || '',
          staff: appointment.staff || '',
          status: appointment.status || 'scheduled',
          duration: appointment.duration,
        })
      }, 500)
    })
  }

  async deleteAppointment(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500)
    })
  }
}

export const appointmentsService = new AppointmentsService()
