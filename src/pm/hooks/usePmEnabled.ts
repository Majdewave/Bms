import { useEffect, useState } from 'react'
import * as apiClient from '@/api/apiClient'
import { useAuth } from '@/contexts/AuthContext'

// PM (Project Management) Phase 2 - isolated, fail-closed feature flag read.
// Any loading/error/missing state resolves to `false` so the existing ClientProfile is always the safe default.
export function usePmEnabled() {
  const { user, loading: authLoading } = useAuth()
  const [pmEnabled, setPmEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (authLoading) {
      return
    }

    if (!user) {
      setPmEnabled(false)
      setLoading(false)
      return
    }

    setLoading(true)

    apiClient
      .get<{ pmEnabled?: boolean }>('/api/features/pm-status')
      .then((data) => {
        if (cancelled) return
        setPmEnabled(data?.pmEnabled === true)
      })
      .catch((error) => {
        console.error('PM status check failed:', error)
        if (cancelled) return
        setPmEnabled(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  return { pmEnabled, loading: authLoading || loading }
}
