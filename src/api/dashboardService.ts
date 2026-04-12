// Mock Dashboard Service
export interface DashboardStats {
  activeUsers: number
  totalInvoices: number
  appointments: number
  revenue: number
}

export interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
  type: string
}

export interface NextAppointment {
  id: string
  title: string
  date: string
  time: string
  attendee: string
  status: string
}

export interface OutstandingBalance {
  amount: number
  currency: string
  dueDate: string
  invoiceCount: number
}

export interface LastInvoice {
  id: string
  number: string
  amount: number
  date: string
  status: 'paid' | 'pending' | 'overdue'
}

export interface LastFile {
  id: string
  name: string
  size: string
  uploadedDate: string
  type: string
}

export interface UsageCounter {
  current: number
  limit: number
  percentage: number
}

export interface TrialInfo {
  isActive: boolean
  endsAt: string | null
  daysRemaining: number
  hoursRemaining: number
  isExpired: boolean
}

export interface PlanData {
  tenant: {
    name: string
    plan: string
    billingCycle: string
    subscriptionStatus: string
    trialEndsAt: string | null
  }
  trial: TrialInfo
  usage: {
    users: UsageCounter
    messages: UsageCounter
  }
  features: {
    customBranding: boolean
    emailAutomation: boolean
    priority: string
    support: string
  }
  pricing: Record<string, unknown>
  upgrade: Record<string, unknown> | null
}

export interface BillingStatus {
  plan: string
  billingCycle: string
  subscriptionStatus: string
  trialEndsAt: string | null
  daysRemaining: number
  userLimit: number
  messageLimit: number
  isSuspended: boolean
  stripeCustomerId: string | null
  features: {
    maxUsers: number
    maxMessages: number
    customBranding: boolean
    emailAutomation: boolean
    priority: string
    support: string
  }
}

export interface UpgradeRequest {
  planType: number // 1 = Basic, 2 = Pro
  billingCycle: number // 0 = Monthly, 1 = Yearly
}

export interface UpgradeResponse {
  url: string // Stripe checkout URL
}

class DashboardService {
  async getPlanData(): Promise<PlanData> {
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (response.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/'
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch plan data: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Plan data response:', data)
    return data
  }

  async getBillingStatus(): Promise<BillingStatus> {
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    })

    if (response.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/'
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch billing status: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Billing status response:', data)
    return data
  }

  async upgrade(planType: number, billingCycle: number): Promise<UpgradeResponse> {
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        planType,
        billingCycle,
      }),
    })

    if (response.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/'
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      throw new Error(`Failed to initiate upgrade: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Upgrade response:', data)
    return data
  }
}

export const dashboardService = new DashboardService()
