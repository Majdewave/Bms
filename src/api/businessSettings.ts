import { get, put, post } from './apiClient'

export interface BusinessSettings {
  id: string
  name: string
  subdomain: string
  logoUrl: string | null
  plan: string
  subscriptionStatus: string
  createdAt: string
}

// Get current tenant/business settings
export const getBusinessSettings = async (): Promise<BusinessSettings> => {
  return get<BusinessSettings>('/api/tenant')
}

// ✅ FIXED: Update business settings (send full object, not only name)
export const updateBusinessSettings = async (
  data: { name: string; logoUrl?: string | null }
): Promise<BusinessSettings> => {
  return put<BusinessSettings>('/api/tenant', data)
}

// Upload tenant logo
export const uploadTenantLogo = async (
  file: File
): Promise<BusinessSettings> => {
  const formData = new FormData()
  formData.append('file', file)

  return post<BusinessSettings>(
    '/api/tenant/logo',
    formData,
    true
  )
}