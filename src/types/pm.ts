// PM (Project Management) foundation types - Phase 1A.
// Isolated module: not imported by any existing page/component yet.

export type ProjectStatus = 'Draft' | 'Active' | 'OnHold' | 'Completed' | 'Cancelled'
export type BillingMilestoneStatus = 'Planned' | 'ReadyToInvoice' | 'Invoiced' | 'Cancelled'

export interface Project {
  id: string
  clientId: string
  clientName: string
  name: string
  status: ProjectStatus
  value: number
  startDate?: string | null
  endDate?: string | null
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  clientId: string
  name: string
  status: ProjectStatus
  value: number
  startDate?: string | null
  endDate?: string | null
  description?: string | null
}

export interface UpdateProjectRequest {
  name: string
  status: ProjectStatus
  value: number
  startDate?: string | null
  endDate?: string | null
  description?: string | null
}

export interface BillingMilestone {
  id: string
  projectId: string
  title: string
  description?: string | null
  amount: number
  dueDate?: string | null
  status: BillingMilestoneStatus
  invoiceId?: string | null
  invoiceNumber?: string | null
  createdAt: string
  updatedAt: string
  sortOrder: number
}

export interface BillingMilestoneRequest {
  title: string
  amount: number
  dueDate?: string | null
  description?: string | null
  status: BillingMilestoneStatus
  sortOrder?: number
}

export interface ClientContact {
  id: string
  clientId: string
  name: string
  roleTitle?: string | null
  phone?: string | null
  whatsApp?: string | null
  email?: string | null
  isPrimary: boolean
  isBillingContact: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateClientContactRequest {
  name: string
  roleTitle?: string | null
  phone?: string | null
  whatsApp?: string | null
  email?: string | null
  isPrimary: boolean
  isBillingContact: boolean
}

export interface UpdateClientContactRequest {
  name: string
  roleTitle?: string | null
  phone?: string | null
  whatsApp?: string | null
  email?: string | null
  isPrimary: boolean
  isBillingContact: boolean
}
