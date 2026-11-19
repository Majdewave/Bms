// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  getServices: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  isMedicalImagingEntitled: vi.fn(),
}))

vi.mock('@/api/servicesService', () => ({
  servicesService: {
    getServices: mocks.getServices,
    create: mocks.create,
    update: mocks.update,
    delete: mocks.remove,
  },
}))
vi.mock('@/api/medicalImagingEntitlement', () => ({
  isMedicalImagingEntitled: mocks.isMedicalImagingEntitled,
}))
vi.mock('@/components', () => ({
  ConsentTemplateModal: () => null,
}))

import i18n from '@/i18n'
import ServicesSection from './ServicesSection'

describe('Business Services Medical Imaging entitlement', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    mocks.getServices.mockResolvedValue([])
    mocks.isMedicalImagingEntitled.mockResolvedValue(false)
  })

  afterEach(cleanup)

  it('disables assigning an imaging modality when the plan is not entitled', async () => {
    render(
      <ServicesSection
        isAdmin
        departments={[{
          id: 'department-1',
          tenantId: 'tenant-1',
          name: 'Imaging',
          color: '#123456',
          displayOrder: 0,
          isActive: true,
          createdAt: '2026-01-01T00:00:00Z',
        }]}
      />,
    )

    expect(await screen.findByText('Medical Imaging is available on active Trial and Enterprise plans.')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
