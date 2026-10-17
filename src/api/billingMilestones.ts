import { del, get, post, put } from './apiClient'
import type { BillingMilestone, BillingMilestoneRequest } from '@/types/pm'

export const getBillingMilestones = (projectId: string) =>
  get<BillingMilestone[]>(`/api/projects/${projectId}/billing-milestones`)

export const getBillingMilestone = (id: string) =>
  get<BillingMilestone>(`/api/billing-milestones/${id}`)

export const createBillingMilestone = (projectId: string, data: BillingMilestoneRequest) =>
  post<BillingMilestone>(`/api/projects/${projectId}/billing-milestones`, data)

export const updateBillingMilestone = (id: string, data: BillingMilestoneRequest) =>
  put<BillingMilestone>(`/api/billing-milestones/${id}`, data)

export const deleteBillingMilestone = (id: string) =>
  del<void>(`/api/billing-milestones/${id}`)

export const linkBillingMilestoneInvoice = (id: string, invoiceId: string) =>
  post<BillingMilestone>(`/api/billing-milestones/${id}/link-invoice`, { invoiceId })