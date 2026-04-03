import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { get } from '@/api/apiClient'
import { useAuth } from '@/contexts/AuthContext'

export interface Tenant {
  name?: string
  phone?: string | null
  whatsApp?: string | null
  logoUrl?: string | null
  autoDeleteNotDocumentedAfterDays?: number | null
  enableAutoDeleteNotDocumented?: boolean | null
}

interface TenantContextType {
  tenant: Tenant | null
  setTenant: React.Dispatch<React.SetStateAction<Tenant | null>>
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

interface TenantProviderProps {
  children: ReactNode
}

export const TenantProvider = ({ children }: TenantProviderProps) => {
  const { user, isAuthenticated } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)

  const refreshTenant = useCallback(async () => {
    if (!isAuthenticated) {
      setTenant(null)
      return
    }

    try {
      const tenantData = await get<Tenant>('/api/tenant/me')
      setTenant(tenantData)
    } catch (error) {
      console.error('Failed to load tenant branding:', error)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!user) {
      setTenant(null)
      return
    }

    refreshTenant()
  }, [user, refreshTenant])

  const value = useMemo(
    () => ({
      tenant,
      setTenant,
      refreshTenant,
    }),
    [tenant, refreshTenant],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}