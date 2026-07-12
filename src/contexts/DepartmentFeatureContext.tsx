import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as apiClient from '@/api/apiClient'
import { useAuth } from '@/contexts/AuthContext'

export interface DepartmentFeatures {
  quotesEnabled: boolean
  prescriptionsEnabled: boolean
  drugsEnabled: boolean
  consentFormsEnabled: boolean
  visitSummariesEnabled: boolean
  beforeAfterPhotosEnabled: boolean
  teamChatEnabled: boolean
}

interface DepartmentFeatureContextType {
  departmentFeatures: DepartmentFeatures | null
  reload: () => void
}

const DepartmentFeatureContext = createContext<DepartmentFeatureContextType>({
  departmentFeatures: null,
  reload: () => {},
})

export const useDepartmentFeatures = () => useContext(DepartmentFeatureContext)

const areDepartmentFeaturesEqual = (
  a: DepartmentFeatures | null,
  b: DepartmentFeatures
) => {
  if (!a) return false
  return (
    a.quotesEnabled === b.quotesEnabled &&
    a.prescriptionsEnabled === b.prescriptionsEnabled &&
    a.drugsEnabled === b.drugsEnabled &&
    a.consentFormsEnabled === b.consentFormsEnabled &&
    a.visitSummariesEnabled === b.visitSummariesEnabled &&
    a.beforeAfterPhotosEnabled === b.beforeAfterPhotosEnabled &&
    a.teamChatEnabled === b.teamChatEnabled
  )
}

export function DepartmentFeatureProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [departmentFeatures, setDepartmentFeatures] = useState<DepartmentFeatures | null>(null)
  const loadedForUserIdRef = useRef<string | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (loading || !user) return

      if (!force && loadedForUserIdRef.current === user.id) {
        return
      }

      try {
        const data = await apiClient.get<DepartmentFeatures>('/api/features/effective')
        setDepartmentFeatures((prev) => (areDepartmentFeaturesEqual(prev, data) ? prev : data))
        loadedForUserIdRef.current = user.id
      } catch (error) {
        console.error('DEPARTMENT FEATURES LOAD ERROR:', error)
        setDepartmentFeatures(null)
      }
    },
    [loading, user]
  )

  useEffect(() => {
    if (loading) return

    if (!user) {
      loadedForUserIdRef.current = null
      setDepartmentFeatures(null)
      return
    }

    void load()
  }, [loading, user, load])

  const reload = useCallback(() => {
    void load(true)
  }, [load])

  const value = useMemo(
    () => ({ departmentFeatures, reload }),
    [departmentFeatures, reload]
  )

  return (
    <DepartmentFeatureContext.Provider value={value}>
      {children}
    </DepartmentFeatureContext.Provider>
  )
}