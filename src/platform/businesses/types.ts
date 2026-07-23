export type BusinessStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Trial' | 'Active' | 'Suspended' | 'Expired'

export type SubmittedDocumentStatus = 'Uploaded' | 'Missing' | 'Verified' | 'Rejected'

export interface SubmittedDocuments {
  businessLicense: SubmittedDocumentStatus
  identityDocument: SubmittedDocumentStatus
  proofOfAddress: SubmittedDocumentStatus
  taxRegistration: SubmittedDocumentStatus
}

export type BusinessPlan = 'Starter' | 'Growth' | 'Enterprise'

export interface BusinessRecord {
  id: string
  name: string
  ownerName: string
  email: string
  phone: string
  businessType: string | null
  status: BusinessStatus
  approvalStatus: BusinessStatus
  plan: BusinessPlan
  trialEndsAt: string | null
  createdAt: string
  lastLoginAt: string | null
  submittedDocuments: SubmittedDocuments
}

export type TrialFilter = 'all' | 'on_trial' | 'expired' | 'not_on_trial'
export type SortOption = 'newest' | 'oldest' | 'name'
