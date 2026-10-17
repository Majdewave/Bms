// Mirrors the Phase 8A BusinessDashboardResponse DTO (camelCase JSON).
export interface BusinessBillingContact {
  name: string
  roleTitle: string | null
  phone: string | null
  whatsApp: string | null
  email: string | null
}

export interface BusinessNextBilling {
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  milestoneId: string
  milestoneTitle: string
  amount: number
  // Date-only value serialised as UTC midnight; format it with timeZone 'UTC'.
  dueDate: string
  isOverdue: boolean
  billingContact: BusinessBillingContact | null
}

export interface BusinessDashboard {
  currency: string
  projectCount: number
  // Before VAT.
  projectValue: number
  invoiceFinancialsAvailable: boolean
  // Null when the caller lacks invoice access; never render null as 0.
  invoiced: number | null
  paid: number | null
  outstanding: number | null
  // Plan-based (open billing milestones), before VAT.
  notYetInvoiced: number
  nextBilling: BusinessNextBilling | null
}
