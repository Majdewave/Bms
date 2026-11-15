// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  language: 'en',
  navigate: vi.fn(),
  tenant: {
    id: 'tenant-1',
    plan: 'Basic',
    subscriptionStatus: 'Active',
    subscriptionEndsAt: undefined as string | undefined,
    isSuspended: false,
  },
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({ tenant: mocks.tenant, daysLeft: 0 }),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { plan: string }) => {
      const templates: Record<string, string> = {
        en: '{{plan}} Plan Active',
        he: 'מסלול {{plan}} פעיל',
        ar: 'خطة {{plan}} مفعّلة',
      }
      return key === 'billing.activePlan'
        ? templates[mocks.language].replace('{{plan}}', values?.plan ?? '')
        : key
    },
    i18n: { language: mocks.language },
  }),
}))

import BillingBanner from './BillingBanner'

describe('BillingBanner', () => {
  beforeEach(() => {
    mocks.language = 'en'
    mocks.tenant.plan = 'Basic'
    mocks.tenant.subscriptionStatus = 'Active'
    mocks.tenant.subscriptionEndsAt = undefined
  })

  it('renders the current Basic plan instead of the stale Pro title', () => {
    render(<BillingBanner />)

    expect(screen.getByText('✅ Basic Plan Active')).toBeInTheDocument()
    expect(screen.queryByText(/Pro Plan Active/)).not.toBeInTheDocument()
  })

  it('renders other plan names dynamically', () => {
    mocks.tenant.plan = 'Enterprise'

    render(<BillingBanner />)

    expect(screen.getByText('✅ Enterprise Plan Active')).toBeInTheDocument()
  })

  it('localizes the current plan in Hebrew and Arabic', () => {
    mocks.language = 'he'
    const hebrew = render(<BillingBanner />)
    expect(screen.getByText('✅ מסלול BASIC פעיל')).toBeInTheDocument()

    hebrew.unmount()
    mocks.language = 'ar'
    render(<BillingBanner />)
    expect(screen.getByText('✅ خطة BASIC مفعّلة')).toBeInTheDocument()
  })
})
