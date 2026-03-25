import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as apiClient from '@/api/apiClient'

export interface Features {
  reportsEnabled: boolean
  invoicesEnabled: boolean
  prescriptionsEnabled: boolean
}

interface FeatureContextType {
  features: Features | null
  reload: () => void
}

const defaultFeatures: Features = {
  reportsEnabled: true,
  invoicesEnabled: true,
  prescriptionsEnabled: true,
}

const FeatureContext = createContext<FeatureContextType>({
  features: defaultFeatures,
  reload: () => {},
})

export const useFeatures = () => useContext(FeatureContext)

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Features | null>(null)

  const load = useCallback(() => {
    apiClient
      .get<Features>('/api/features')
      .then(setFeatures)
      .catch(() => setFeatures(defaultFeatures))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <FeatureContext.Provider value={{ features, reload: load }}>
      {children}
    </FeatureContext.Provider>
  )
}
