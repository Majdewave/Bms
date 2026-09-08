import * as apiClient from './apiClient'

// Department-scoped feature check, distinct from the user-aggregate DepartmentFeatureContext.
export const getDepartmentFeatureEnabled = async (
  featureKey: string,
  departmentId?: string | null
): Promise<boolean> => {
  const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : ''
  const result = await apiClient.get<{ enabled: boolean }>(
    `/api/features/effective/${featureKey}${query}`
  )
  return Boolean(result?.enabled)
}
