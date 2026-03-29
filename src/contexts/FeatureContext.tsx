import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import * as apiClient from '@/api/apiClient'
import { useAuth } from '@/contexts/AuthContext'

export interface Features {
  reportsEnabled: boolean
  invoicesEnabled: boolean
  prescriptionsEnabled: boolean
  drugsEnabled: boolean
}

interface FeatureContextType {
  features: Features | null
  reload: () => void
}

const defaultFeatures: Features = {
  reportsEnabled: true,
  invoicesEnabled: true,
  prescriptionsEnabled: true,
  drugsEnabled: false,
}

const FeatureContext = createContext<FeatureContextType>({
  features: defaultFeatures,
  reload: () => {},
})

export const useFeatures = () => useContext(FeatureContext)

const areFeaturesEqual = (a: Features | null, b: Features) => {
  if (!a) return false
  return (
    a.reportsEnabled === b.reportsEnabled &&
    a.invoicesEnabled === b.invoicesEnabled &&
    a.prescriptionsEnabled === b.prescriptionsEnabled &&
    a.drugsEnabled === b.drugsEnabled
  )
}
export function FeatureProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [features, setFeatures] = useState<Features | null>(null)
  const loadedForUserIdRef = useRef<string | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (loading || !user) return

      if (!force && loadedForUserIdRef.current === user.id) {
        return
      }

      try {
     const data = await apiClient.get<Features>('/api/features')

      const safeData: Features = {
        reportsEnabled: data.reportsEnabled ?? true,
        invoicesEnabled: data.invoicesEnabled ?? true,
        prescriptionsEnabled: data.prescriptionsEnabled ?? true,
        drugsEnabled: data.drugsEnabled ?? false,
      }

      setFeatures((prev) => (areFeaturesEqual(prev, safeData) ? prev : safeData))
      } catch (error) {
        const status = error instanceof apiClient.ApiError ? error.status : undefined
        if (status === 401) {
          setFeatures((prev) => (areFeaturesEqual(prev, defaultFeatures) ? prev : defaultFeatures))
          loadedForUserIdRef.current = user.id
          return
        }

        setFeatures((prev) => (areFeaturesEqual(prev, defaultFeatures) ? prev : defaultFeatures))
      }

      loadedForUserIdRef.current = user.id
    },
    [loading, user]
  )

  useEffect(() => {
    if (loading) return

    if (!user) {
      loadedForUserIdRef.current = null
      setFeatures((prev) => (areFeaturesEqual(prev, defaultFeatures) ? prev : defaultFeatures))
      return
    }

    void load()
  }, [loading, user, load])

  const reload = useCallback(() => {
    void load(true)
  }, [load])

  const value = useMemo(
    () => ({ features, reload }),
    [features, reload]
  )

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  )
}
