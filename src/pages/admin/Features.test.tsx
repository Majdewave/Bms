// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  reloadFeatures: vi.fn(),
  reloadDepartmentFeatures: vi.fn(),
  isMedicalImagingEntitled: vi.fn(),
}))

vi.mock('@/api/apiClient', () => ({
  get: mocks.get,
  put: mocks.put,
}))
vi.mock('@/api/medicalImagingEntitlement', () => ({
  isMedicalImagingEntitled: mocks.isMedicalImagingEntitled,
}))
vi.mock('@/contexts/FeatureContext', () => ({
  useFeatures: () => ({ reload: mocks.reloadFeatures }),
}))
vi.mock('@/contexts/DepartmentFeatureContext', () => ({
  useDepartmentFeatures: () => ({ reload: mocks.reloadDepartmentFeatures }),
}))

import i18n from '@/i18n'
import AdminFeatures from './Features'

const featureSettings = {
  reportsEnabled: true,
  invoicesEnabled: true,
  quotesEnabled: false,
  prescriptionsEnabled: false,
  drugsEnabled: false,
  beforeAfterPhotosEnabled: true,
  visitSummariesEnabled: false,
  teamChatEnabled: false,
  queueDisplayEnabled: false,
  whatsAppEnabled: false,
  notDocumentedEnabled: false,
  medicalImagingEnabled: true,
}

describe('Medical Imaging feature toggle entitlement', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    mocks.get.mockResolvedValue(featureSettings)
    mocks.isMedicalImagingEntitled.mockResolvedValue(false)
  })

  afterEach(cleanup)

  it('disables the toggle and masks a stale enabled flag for an unentitled plan', async () => {
    render(<AdminFeatures />)

    expect(await screen.findByText('Medical Imaging is available on active Trial and Enterprise plans.')).toBeInTheDocument()
    const switches = await screen.findAllByRole('switch')
    expect(switches[switches.length - 1]).toBeDisabled()
    expect(switches[switches.length - 1]).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps the existing toggle available for an entitled plan', async () => {
    mocks.isMedicalImagingEntitled.mockResolvedValue(true)
    render(<AdminFeatures />)

    const switches = await screen.findAllByRole('switch')
    expect(switches[switches.length - 1]).toBeEnabled()
    expect(switches[switches.length - 1]).toHaveAttribute('aria-checked', 'true')
  })
})
