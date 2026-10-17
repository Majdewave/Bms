import { usePmEnabled } from '@/pm/hooks/usePmEnabled'
import ProjectClientWorkspace from '@/pm/ProjectClientWorkspace'
import { useTenant } from '@/contexts/TenantContext'
import ClientProfile from './ClientProfile'

// PM Phase 2 - thin routing switch. Existing ClientProfile is untouched and remains the default.
// Fails closed to ClientProfile on missing state or any feature-check error.
export default function ClientProfileEntry() {
  const { pmEnabled, loading } = usePmEnabled()
  const { productType, productResolved } = useTenant()

  if (loading || !productResolved) {
    return <div className="p-10 text-center text-slate-500">…</div>
  }

  // Product boundary: Clinic always uses its medical profile; preserve the PM feature behavior for Legacy and Business.
  const useProjectWorkspace = (productType === 'legacy' || productType === 'business') && pmEnabled === true
  return useProjectWorkspace ? <ProjectClientWorkspace /> : <ClientProfile />
}
