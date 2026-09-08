import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useFeatures } from '@/contexts/FeatureContext'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'
import type { Features } from '@/contexts/FeatureContext'
import type { DepartmentFeatures } from '@/contexts/DepartmentFeatureContext'

interface FeatureBasedRouteProps {
  children: ReactNode
  feature: keyof Features
  departmentFeature?: keyof DepartmentFeatures
  redirectTo?: string
}

export const FeatureBasedRoute = ({
  children,
  feature,
  departmentFeature,
  redirectTo = '/admin/dashboard',
}: FeatureBasedRouteProps) => {
  const { features } = useFeatures()
  const { departmentFeatures } = useDepartmentFeatures()

  if (!features?.[feature]) {
    return <Navigate to={redirectTo} replace />
  }

  if (departmentFeature && !departmentFeatures?.[departmentFeature]) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}