// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  language: 'en',
  useTenant: vi.fn(),
  usePlatformConfig: vi.fn(),
  changePlan: vi.fn(),
  createCheckoutSession: vi.fn(),
  createBillingPortal: vi.fn(),
}))

vi.mock('@/hooks/useTenant', () => ({ useTenant: mocks.useTenant }))
vi.mock('@/hooks/usePlatformConfig', () => ({ usePlatformConfig: mocks.usePlatformConfig }))
vi.mock('@/services/billingService', () => ({
  PlanType: { Trial: 0, Basic: 1, Pro: 2, Enterprise: 3 },
  changePlan: mocks.changePlan,
  createCheckoutSession: mocks.createCheckoutSession,
  createBillingPortal: mocks.createBillingPortal,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { date?: string }) => {
      const clinicFeatureTranslations: Record<string, Record<string, string>> = {
        en: {
          clientAppointments: 'Client & Appointment Management', invoicesDocuments: 'Invoices & Documents', prescriptions: 'Prescriptions', staffManagement: 'Staff Management', reports: 'Reports',
          everythingBasic: 'Everything in BASIC', advancedClinicTools: 'Advanced Clinic Tools', advancedReports: 'Advanced Reports', moreComingSoon: 'More features coming soon',
          everythingPro: 'Everything in PRO', medicalImaging: 'Medical Imaging / DICOM', dentalModule: 'Dental Module', advancedClinicCapabilities: 'Advanced Clinic Capabilities', prioritySupport: 'Priority Support',
        },
        he: {
          clientAppointments: 'ניהול לקוחות ותורים', invoicesDocuments: 'חשבוניות ומסמכים', prescriptions: 'מרשמים', staffManagement: 'ניהול צוות', reports: 'דוחות',
          everythingBasic: 'כל מה שכלול ב-BASIC', advancedClinicTools: 'כלים מתקדמים לניהול המרפאה', advancedReports: 'דוחות מתקדמים', moreComingSoon: 'יכולות נוספות בקרוב',
          everythingPro: 'כל מה שכלול ב-PRO', medicalImaging: 'דימות רפואי / DICOM', dentalModule: 'מודול רפואת שיניים', advancedClinicCapabilities: 'יכולות מתקדמות למרפאה', prioritySupport: 'תמיכה בעדיפות',
        },
        ar: {
          clientAppointments: 'إدارة العملاء والمواعيد', invoicesDocuments: 'الفواتير والمستندات', prescriptions: 'الوصفات الطبية', staffManagement: 'إدارة الطاقم', reports: 'التقارير',
          everythingBasic: 'كل ما يتضمنه BASIC', advancedClinicTools: 'أدوات متقدمة لإدارة العيادة', advancedReports: 'تقارير متقدمة', moreComingSoon: 'ميزات إضافية قريبًا',
          everythingPro: 'كل ما يتضمنه PRO', medicalImaging: 'التصوير الطبي / DICOM', dentalModule: 'وحدة طب الأسنان', advancedClinicCapabilities: 'قدرات متقدمة للعيادة', prioritySupport: 'دعم ذو أولوية',
        },
      }
      const featurePrefix = 'billing.clinicPlans.features.'
      if (key.startsWith(featurePrefix)) {
        return clinicFeatureTranslations[mocks.language][key.slice(featurePrefix.length)] ?? key
      }
      const messages: Record<string, string> = {
        'billing.clinicPlans.title': 'Clinic subscription plans',
        'billing.clinicPlans.basic': 'BASIC',
        'billing.clinicPlans.pro': 'PRO',
        'billing.clinicPlans.enterprise': 'ENTERPRISE',
        'billing.clinicPlans.perMonth': '/ month',
        'billing.clinicPlans.available': mocks.language === 'he' ? 'מוכן לרכישה' : mocks.language === 'ar' ? 'جاهز للشراء' : 'Ready to purchase',
        'billing.clinicPlans.comingSoon': 'Coming Soon',
        'billing.clinicPlans.currentPlan': mocks.language === 'he' ? 'המסלול הנוכחי' : mocks.language === 'ar' ? 'الخطة الحالية' : 'Current Plan',
        'billing.clinicPlans.planActive': mocks.language === 'he' ? 'המנוי פעיל' : mocks.language === 'ar' ? 'الخطة نشطة' : 'PLAN ACTIVE',
        'billing.clinicPlans.legacyPro': 'Legacy Pro subscription',
        'billing.clinicPlans.scheduled': 'Scheduled',
        'billing.clinicPlans.effectiveDate': `Effective: ${options?.date ?? ''}`,
        'billing.clinicPlans.switchToBasic': 'Switch to Basic',
        'billing.clinicPlans.changeToEnterprise': 'Change to Enterprise',
        'billing.clinicPlans.prorationWarning': 'Stripe may charge a prorated amount.',
        'billing.clinicPlans.changeComplete': 'Plan updated.',
        'billing.clinicPlans.changeScheduled': 'Plan change scheduled.',
        'billing.clinicPlans.changeFailed': 'Plan change failed.',
        'billing.activeTitle': 'Pro Plan Active',
        'billing.loading': 'Loading',
        'billing.loadError': 'Could not load billing',
      }
      return messages[key] ?? key
    },
    i18n: { language: mocks.language },
  }),
}))

import BillingPage from './admin/BillingPage'
import ClinicSubscriptionPlans from '@/components/ClinicSubscriptionPlans'

describe('active Clinic Billing plan management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.language = 'en'
    mocks.useTenant.mockReturnValue({
      tenant: {
        id: 'tenant-clinic',
        productType: 'clinic',
        plan: 'Pro',
        subscriptionStatus: 'Active',
        scheduledPlan: null,
        scheduledPlanChangeAt: null,
        isSuspended: false,
      },
      daysLeft: 0,
      loading: false,
      error: null,
    })
    mocks.usePlatformConfig.mockReturnValue({ config: { defaultTrialDays: 14, proMonthlyPrice: 46, proAnnualPrice: 460 } })
  })

  afterEach(cleanup)

  it('renders Basic, legacy Pro, and Enterprise management cards for an active Clinic', () => {
    render(<BillingPage />)

    expect(screen.getByRole('region', { name: 'Clinic subscription plans' })).toBeInTheDocument()
    expect(screen.queryByText('Pro Plan Active')).not.toBeInTheDocument()
    expect(screen.getByText('PRO PLAN ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('Current Plan')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'BASIC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PRO' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ENTERPRISE' })).toBeInTheDocument()
    for (const feature of [
      'Client & Appointment Management', 'Invoices & Documents', 'Prescriptions', 'Staff Management', 'Reports',
      'Everything in BASIC', 'Advanced Clinic Tools', 'Advanced Reports', 'More features coming soon',
      'Everything in PRO', 'Medical Imaging / DICOM', 'Dental Module', 'Advanced Clinic Capabilities', 'Priority Support',
    ]) {
      expect(screen.getByText(feature)).toBeInTheDocument()
    }
    expect(screen.getByText('€86')).toBeInTheDocument()
    expect(screen.getByText('€315')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coming Soon' })).toBeDisabled()
    expect(screen.getAllByText('Coming Soon').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Switch to Basic' })).toBeEnabled()
    expect(screen.queryByText('Stripe may charge a prorated amount.')).not.toBeInTheDocument()
  })

  it('keeps plan names English uppercase while localizing the banner label', () => {
    mocks.language = 'he'
    render(<BillingPage />)

    expect(screen.getByText('PRO המנוי פעיל')).toBeInTheDocument()
    expect(screen.getByText('המסלול הנוכחי')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'BASIC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PRO' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ENTERPRISE' })).toBeInTheDocument()
    expect(screen.getByText('ניהול לקוחות ותורים')).toBeInTheDocument()
    expect(screen.getByText('כל מה שכלול ב-BASIC')).toBeInTheDocument()
  })

  it('localizes Arabic Clinic features and uses RTL direction while keeping plan names uppercase', () => {
    mocks.language = 'ar'
    render(<BillingPage />)

    expect(screen.getByRole('region', { name: 'Clinic subscription plans' })).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('PRO الخطة نشطة')).toBeInTheDocument()
    expect(screen.getByText('الخطة الحالية')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'BASIC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PRO' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ENTERPRISE' })).toBeInTheDocument()
    for (const feature of [
      'إدارة العملاء والمواعيد', 'الفواتير والمستندات', 'الوصفات الطبية', 'إدارة الطاقم', 'التقارير',
      'كل ما يتضمنه BASIC', 'أدوات متقدمة لإدارة العيادة', 'تقارير متقدمة', 'ميزات إضافية قريبًا',
      'كل ما يتضمنه PRO', 'التصوير الطبي / DICOM', 'وحدة طب الأسنان', 'قدرات متقدمة للعيادة', 'دعم ذو أولوية',
    ]) {
      expect(screen.getByText(feature)).toBeInTheDocument()
    }
  })

  it('renders translated features and uppercase plan names on Clinic checkout cards, with Pro disabled', () => {
    const onChoosePlan = vi.fn()
    render(<ClinicSubscriptionPlans isLoading={false} onChoosePlan={onChoosePlan} />)

    expect(screen.getByRole('heading', { name: 'BASIC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'PRO' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ENTERPRISE' })).toBeInTheDocument()
    expect(screen.getAllByText('Ready to purchase').length).toBe(2)
    expect(screen.getByText('Client & Appointment Management')).toBeInTheDocument()
    expect(screen.getByText('Everything in BASIC')).toBeInTheDocument()
    expect(screen.getByText('Everything in PRO')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coming Soon' })).toBeDisabled()
    expect(screen.getByRole('region', { name: 'Clinic subscription plans' })).toHaveAttribute('dir', 'ltr')
    expect(onChoosePlan).not.toHaveBeenCalled()
  })

  it('warns Basic tenants about proration before an immediate Enterprise upgrade', async () => {
    mocks.useTenant.mockReturnValue({
      tenant: {
        id: 'tenant-clinic',
        productType: 'clinic',
        plan: 'Basic',
        subscriptionStatus: 'Active',
        scheduledPlan: null,
        scheduledPlanChangeAt: null,
        isSuspended: false,
      },
      daysLeft: 0,
      loading: false,
      error: null,
    })
    mocks.changePlan.mockResolvedValue({ type: 'upgrade', newPlan: 'Enterprise', effectiveImmediately: true })
    render(<BillingPage />)

    expect(screen.getByText('Stripe may charge a prorated amount.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Change to Enterprise' }))

    await waitFor(() => expect(mocks.changePlan).toHaveBeenCalledWith(3, 'Monthly'))
    expect(await screen.findByText('Plan updated.')).toBeInTheDocument()
    expect(screen.getByText('Current Plan', { selector: 'p' }).parentElement?.textContent).toContain('ENTERPRISE')
  })

  it('shows the API-scheduled Basic change date and keeps legacy Pro as the active plan', async () => {
    const scheduledDate = '2026-12-17T08:30:00Z'
    mocks.changePlan.mockResolvedValue({
      type: 'downgrade',
      currentPlan: 'Pro',
      scheduledPlan: 'Basic',
      scheduledDate,
      effectiveImmediately: false,
      message: 'Downgrade scheduled by API.',
    })
    render(<BillingPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Basic' }))

    await waitFor(() => expect(mocks.changePlan).toHaveBeenCalledWith(1, 'Monthly'))
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled()
    expect(mocks.createBillingPortal).not.toHaveBeenCalled()
    expect(await screen.findByText('Plan change scheduled.')).toBeInTheDocument()

    const effectiveDateText = new Date(scheduledDate).toLocaleDateString('en')
    const scheduledStatus = screen.getAllByRole('status').find((element) =>
      element.textContent?.includes(`Effective: ${effectiveDateText}`),
    )
    expect(scheduledStatus).toBeDefined()
    expect(scheduledStatus?.textContent).toContain('Scheduled: BASIC')

    const currentPlanLabel = screen.getByText('Current Plan', { selector: 'p' })
    expect(currentPlanLabel.parentElement?.textContent).toContain('PRO')
  })
})
