import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { get } from '@/api/apiClient'
import { useAuth } from '@/contexts/AuthContext'
import { normalizeProductType } from '@/types/product'
import type { TenantProductType } from '@/types/product'

export interface Tenant {
  productType?: string | null
  plan?: string | null
  subscriptionStatus?: string | null
  trialEndsAt?: string | null
  subscriptionEndsAt?: string | null
  businessName?: string | null
  name?: string
  legalBusinessName?: string | null
  businessRegistrationNumber?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  whatsApp?: string | null
  logoUrl?: string | null
  businessStampUrl?: string | null
  defaultVatRate?: number | null
  defaultWithholdingTaxRate?: number | null
  currency?: 'ILS' | 'USD' | 'EUR' | string | null
  defaultPaymentMethod?: string | null
  defaultInstallments?: number | null
  defaultInvoiceStatus?: string | null
  invoicePrefix?: string | null
  nextInvoiceNumber?: number | null
  quotePrefix?: string | null
  nextQuoteNumber?: number | null
  autoDeleteNotDocumentedAfterDays?: number | null
  enableAutoDeleteNotDocumented?: boolean | null
}

interface TenantContextType {
  tenant: Tenant | null
  setTenant: React.Dispatch<React.SetStateAction<Tenant | null>>
  refreshTenant: () => Promise<void>
  productType: TenantProductType
  // False until the first tenant lookup after login has finished (success or failure).
  productResolved: boolean
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
  const [productResolved, setProductResolved] = useState(false)
  // Kept separate from `tenant` because settings screens replace `tenant` with payloads that carry no productType.
  const [productType, setProductType] = useState<TenantProductType>('legacy')

  const refreshTenant = useCallback(async () => {
    if (!isAuthenticated) {
      setTenant(null)
      return
    }

    try {
      const tenantData = await get<Tenant>('/api/tenant/me')
      setTenant(tenantData)
      setProductType(normalizeProductType(tenantData?.productType))
    } catch (error) {
      console.error('Failed to load tenant branding:', error)
    } finally {
      setProductResolved(true)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!user) {
      setTenant(null)
      setProductType('legacy')
      setProductResolved(false)
      return
    }

    refreshTenant()
  }, [user, refreshTenant])

  const value = useMemo(
    () => ({
      tenant,
      setTenant,
      refreshTenant,
      productType,
      productResolved,
    }),
    [tenant, refreshTenant, productType, productResolved],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}