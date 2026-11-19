// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  role: 'admin',
  productType: 'clinic',
  getStaffMembers: vi.fn(),
  getDepartments: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { role: mocks.role },
    hasPermission: () => true,
  }),
}))
vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({ productType: mocks.productType }),
}))
vi.mock('@/api/staff', () => ({
  staffService: { getStaffMembers: mocks.getStaffMembers },
}))
vi.mock('@/api/departmentService', () => ({
  departmentService: { getDepartments: mocks.getDepartments },
}))
vi.mock('@/components/work-summary/AttendanceControl', () => ({
  default: () => <div data-testid="attendance-control">Attendance control</div>,
}))

import i18n from '@/i18n'
import AdminStaff from './Staff'

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

describe('Staff Management Work Summary entry', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mocks.role = 'admin'
    mocks.productType = 'clinic'
    mocks.getStaffMembers.mockResolvedValue([])
    mocks.getDepartments.mockResolvedValue([])
    await i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it.each([
    ['clinic', '/admin/work-summary'],
    ['business', '/business/work-summary'],
  ])('opens the manager summary for %s tenants', async (productType, expectedPath) => {
    mocks.productType = productType
    render(
      <MemoryRouter>
        <AdminStaff />
        <CurrentPath />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Work Summary' }))
    expect(screen.getByTestId('current-path')).toHaveTextContent(expectedPath)
  })

  it('shows self attendance to Business staff without exposing manager summary navigation', async () => {
    mocks.role = 'staff'
    mocks.productType = 'business'
    render(
      <MemoryRouter>
        <AdminStaff />
        <CurrentPath />
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('attendance-control')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Work Summary' })).not.toBeInTheDocument()
  })

  it.each([
    ['en', 'Technician'],
    ['he', 'טכנאי'],
    ['ar', 'فني تصوير طبي'],
  ])('offers the localized Technician role in Staff Management for %s', async (language, label) => {
    await i18n.changeLanguage(language)
    render(
      <MemoryRouter>
        <AdminStaff />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: i18n.t('admin.staff.addNew') }))
    expect(await screen.findByRole('option', { name: label })).toBeInTheDocument()
  })
})
