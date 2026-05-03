import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import * as apiClient from '@/api/apiClient'
import { useAuth } from '@/contexts/AuthContext'

export interface Features {
  reportsEnabled: boolean
  invoicesEnabled: boolean
  prescriptionsEnabled: boolean
  drugsEnabled: boolean
  beforeAfterPhotosEnabled: boolean
  visitSummariesEnabled: boolean
}

interface FeatureContextType {
  features: Features | null
  reload: () => void
}

const FeatureContext = createContext<FeatureContextType>({
  features: null,
  reload: () => {},
})

export const useFeatures = () => useContext(FeatureContext)

const areFeaturesEqual = (a: Features | null, b: Features) => {
  if (!a) return false
  return (
    a.reportsEnabled === b.reportsEnabled &&
    a.invoicesEnabled === b.invoicesEnabled &&
    a.prescriptionsEnabled === b.prescriptionsEnabled &&
    a.drugsEnabled === b.drugsEnabled &&
    a.beforeAfterPhotosEnabled === b.beforeAfterPhotosEnabled &&
    a.visitSummariesEnabled === b.visitSummariesEnabled
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

        setFeatures((prev) => (areFeaturesEqual(prev, data) ? prev : data))

        loadedForUserIdRef.current = user.id
      } catch (error) {
        console.error('FEATURES LOAD ERROR:', error)

        setFeatures(null)
      }
    },
    [loading, user]
  )

  useEffect(() => {
    if (loading) return

    if (!user) {
      loadedForUserIdRef.current = null
      setFeatures(null)
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