import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { isBusinessPath, pmClientPath } from './utils/pmPaths'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CalendarRange, FolderKanban } from 'lucide-react'
import { Container } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatures } from '@/contexts/FeatureContext'
import { usePmEnabled } from './hooks/usePmEnabled'
import { getProject } from '@/api/projects'
import { getProjectPaymentSummary } from '@/api/payments'
import type { Project } from '@/types/pm'
import PmBillingPlan from './components/PmBillingPlan'
import PaymentTotalsCards from './components/PaymentTotalsCards'
import type { PaymentTotals } from '@/api/payments'

export default function ProjectBillingPlanPage() {
  const { clientId, projectId } = useParams<{ clientId: string; projectId: string }>()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const { hasPermission } = useAuth()
  const { features } = useFeatures()
  const { pmEnabled, loading: pmLoading } = usePmEnabled()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentTotals, setPaymentTotals] = useState<PaymentTotals | null>(null)
  const [paymentTotalsLoading, setPaymentTotalsLoading] = useState(false)
  const [paymentTotalsFailed, setPaymentTotalsFailed] = useState(false)
  const isRtl = i18n.language === 'he' || i18n.language === 'ar'
  const canManageProjects = hasPermission('manage_projects')
  const canViewPayments = hasPermission('manage_invoices') && features?.invoicesEnabled === true

  useEffect(() => {
    if (!projectId || !clientId || !canManageProjects || !pmEnabled) return
    let cancelled = false
    setLoading(true)
    getProject(projectId)
      .then((data) => {
        if (!cancelled && data.clientId === clientId) setProject(data)
      })
      .catch((error) => console.error('Failed to load project billing plan:', error))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId, clientId, canManageProjects, pmEnabled])

  useEffect(() => {
    if (!project || !canViewPayments) {
      setPaymentTotals(null)
      setPaymentTotalsFailed(false)
      return
    }
    let cancelled = false
    setPaymentTotalsLoading(true)
    setPaymentTotalsFailed(false)
    getProjectPaymentSummary(project.id).then((totals) => {
      if (!cancelled) setPaymentTotals(totals)
    }).catch((error) => {
      console.error('Failed to load project payment totals:', error)
      if (!cancelled) setPaymentTotalsFailed(true)
    }).finally(() => {
      if (!cancelled) setPaymentTotalsLoading(false)
    })
    return () => { cancelled = true }
  }, [project, canViewPayments])

  if (pmLoading || loading) {
    return <div className="p-10 text-center text-slate-500">{t('common.loading')}</div>
  }

  if (!pmEnabled || !canManageProjects || !project) {
    return <div className="p-10 text-center text-slate-500">{t('pm.featureUnavailable')}</div>
  }

  const backPath = isBusinessPath(pathname) ? pmClientPath('/business', clientId ?? '') : `/admin/clients/${clientId}`

  return (
    <Container maxWidth="xl">
      <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-6 pb-10">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <button type="button" onClick={() => navigate(backPath)} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" />{t('pm.backToClientProjects')}
            </button>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><FolderKanban className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-slate-500">{project.clientName}</p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h1>
                <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{t(`pm.status.${project.status}`)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500"><CalendarRange className="h-4 w-4" />{t('pm.billingPlan')}</div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('pm.billingPlan')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('pm.billingPlanSubtitle')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <PmBillingPlan project={project} canManage fullPage />
        </div>

        <PaymentTotalsCards totals={paymentTotals} loading={paymentTotalsLoading} unavailable={!canViewPayments || paymentTotalsFailed} />
      </div>
    </Container>
  )
}
