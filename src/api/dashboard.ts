import { get } from './apiClient'

export interface DashboardStats {
  totalClients: number
  activeClients: number
  upcomingAppointments: number
  todayAppointments: number
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return get<DashboardStats>('/api/dashboard')
}

// Legacy interfaces - kept for backwards compatibility
export interface DashboardData {
  nextAppointment: {
    id: string
    title: string
    date: string
    time: string
    attendee: string
    status: string
  } | null
  outstandingBalance: {
    amount: number
    currency: string
    dueDate: string
    invoiceCount: number
  }
  lastInvoice: {
    id: string
    number: string
    amount: number
    date: string
    status: 'paid' | 'pending' | 'overdue'
  } | null
  lastFile: {
    id: string
    name: string
    size: string
    uploadedDate: string
    type: string
  } | null
}

export interface AdminDashboardStats {
  totalClients: {
    count: number
    change: string
    trend: 'up' | 'down'
  }
  upcomingAppointments: {
    today: number
    thisWeek: number
    total: number
  }
  monthlyRevenue: {
    amount: number
    currency: string
    change: string
    trend: 'up' | 'down'
  }
  unpaidInvoices: {
    count: number
    totalAmount: number
    currency: string
  }
}

export interface RecentActivity {
  id: string
  type: 'appointment' | 'payment' | 'client' | 'invoice'
  title: string
  description: string
  timestamp: string
  user?: string
}

// TODO: Backend endpoints not yet implemented - using mock data temporarily
export const getAdminStats = async (): Promise<any> => {
  const data = await get<any>('/api/dashboard');
  return {
    totalClients: {
      count: data.totalClients ?? 0,
      change: '+0%',
      trend: 'up',
    },
    appointmentsToday: {
      count: data.appointmentsToday ?? 0,
      change: '+0%',
      trend: 'up',
    },
    completedToday: {
      count: data.completedToday ?? 0,
      change: '+0%',
      trend: 'up',
    },
    openTasks: {
      count: data.openTasks ?? 0,
      change: '+0%',
      trend: 'up',
    },
    upcomingAppointmentsList: data.upcomingAppointmentsList ?? []
  };
}

export const getRecentActivity = async (): Promise<RecentActivity[]> => {
  return get<RecentActivity[]>('/api/dashboard/activity');
}
