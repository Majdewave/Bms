import { get } from '@/api/apiClient'
import { normalizeProductType } from '@/types/product'
import type { TenantProductType } from '@/types/product'

// Post-login lookup used to pick the Admin landing route without a dashboard flash. Any failure resolves to legacy.
export const fetchTenantProduct = async (): Promise<TenantProductType> => {
  try {
    const tenant = await get<{ productType?: unknown }>('/api/tenant/me')
    return normalizeProductType(tenant?.productType)
  } catch {
    return 'legacy'
  }
}

// Existing per-role landing routes (unchanged from the Login redirect).
export const getRoleLandingPath = (role: string | undefined): string => {
  switch (role) {
    case 'admin': return '/admin/dashboard'
    case 'staff': return '/staff/dashboard'
    case 'client': return '/client/dashboard'
    case 'interpreter': return '/interpreter/requests'
    default: return '/login'
  }
}

// ProductType comes from the tenant, never from user role. Unknown products retain legacy routing.
export const getProductRoleLandingPath = (productType: TenantProductType, role: string | undefined): string => {
  if (productType === 'business' && (role === 'admin' || role === 'staff')) {
    return '/business/dashboard'
  }
  return getRoleLandingPath(role)
}
