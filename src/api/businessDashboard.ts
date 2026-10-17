import { get } from './apiClient'
import type { BusinessDashboard } from '@/types/businessDashboard'

export class BusinessDashboardUnavailableError extends Error {
  constructor() {
    super('Business dashboard unavailable')
    this.name = 'BusinessDashboardUnavailableError'
  }
}

// apiClient resolves 403 responses as `{ forbidden: true }` instead of throwing, so map that to a typed error here.
export const getBusinessDashboard = async (): Promise<BusinessDashboard> => {
  const result = await get<BusinessDashboard & { forbidden?: boolean }>('/api/business/dashboard')
  if (result && (result as { forbidden?: boolean }).forbidden === true) throw new BusinessDashboardUnavailableError()
  return result
}
