import { get, put, post, del } from './apiClient'

export interface BusinessSettings {
  id: string
  name: string
  subdomain: string
  logoUrl: string | null
  plan: string
  subscriptionStatus: string
  createdAt: string
  defaultVatRate: number
  currency: string
  invoicePrefix: string
  nextInvoiceNumber: number
  businessStampUrl: string | null
}

// Get current tenant/business settings
export const getBusinessSettings = async (): Promise<BusinessSettings> => {
  return get<BusinessSettings>('/api/tenant')
}

export const uploadBusinessStamp = async (
  file: File
): Promise<BusinessSettings> => {
  const formData = new FormData();
  formData.append("file", file);

  return post<BusinessSettings>(
    "/api/tenant/stamp",
    formData,
    true
  );
};

// ✅ FIXED: Update business settings (send full object, not only name)
export const updateBusinessSettings = async (
  data: { name: string; logoUrl?: string | null; businessStampUrl?: string | null; phone?: string; whatsApp?: string; defaultVatRate?: number; currency?: string; invoicePrefix?: string; nextInvoiceNumber?: number }
): Promise<BusinessSettings> => {
  return put<BusinessSettings>('/api/tenant', data)
}


export const deleteBusinessStamp = async (): Promise<void> => {
  await del('/api/tenant/stamp')
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