// Resolved product state as returned by GET /api/tenant/me. The backend is authoritative.
export type TenantProductType = 'legacy' | 'clinic' | 'business'

// Anything missing or unrecognised stays on the existing (legacy) experience; only an explicit 'business' enters Business mode.
export const normalizeProductType = (value: unknown): TenantProductType => {
  if (typeof value !== 'string') return 'legacy'
  const normalized = value.trim().toLowerCase()
  return normalized === 'business' || normalized === 'clinic' ? normalized : 'legacy'
}
