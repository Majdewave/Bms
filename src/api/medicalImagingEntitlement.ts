import * as apiClient from './apiClient'

export const isMedicalImagingEntitled = async (): Promise<boolean> => {
  const result = await apiClient.get<{ entitled: boolean }>('/api/features/medical-imaging-entitlement')
  return result.entitled === true
}
