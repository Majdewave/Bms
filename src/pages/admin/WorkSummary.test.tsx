// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({
  getWorkSummaryOverview: vi.fn(),
  getInterpreterRates: vi.fn(),
  getTechnicianRates: vi.fn(),
  getStaffHours: vi.fn(),
  getInterpreterWork: vi.fn(),
  getTechnicianWork: vi.fn(),
  correctStaffSession: vi.fn(),
  setInterpreterRate: vi.fn(),
  setTechnicianRate: vi.fn(),
  deactivateInterpreterRate: vi.fn(),
  deactivateTechnicianRate: vi.fn(),
}))

vi.mock('@/api/workSummary', () => mocks)
vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({ productType: 'clinic' }),
}))

import i18n from '@/i18n'
import WorkSummaryPage from './WorkSummary'

const overview = {
  fromUtc: '2026-03-08T00:00:00.000Z',
  toUtc: '2026-03-09T00:00:00.000Z',
  memberCount: 3,
  workingDays: 1,
  completedSessions: 1,
  totalWorkedMinutes: 120,
  totalInterpretations: 1,
  interpretationsWithRate: 0,
  interpretationsWithoutRate: 1,
  payableByCurrency: [],
  members: [
    {
      userId: 'staff-1',
      fullName: 'Alex Staff',
      role: 'Staff',
      workingDays: 1,
      completedSessions: 1,
      totalWorkedMinutes: 120,
      isClockedIn: true,
      clockInAt: '2026-03-08T09:30:00Z',
      totalInterpretations: null,
      interpretationsWithRate: null,
      interpretationsWithoutRate: null,
      xRayCount: null,
      usCount: null,
      payableByCurrency: [],
    },
    {
      userId: 'interpreter-1',
      fullName: 'Taylor Interpreter',
      role: 'Interpreter',
      workingDays: null,
      completedSessions: null,
      totalWorkedMinutes: null,
      isClockedIn: null,
      clockInAt: null,
      totalInterpretations: 1,
      interpretationsWithRate: 0,
      interpretationsWithoutRate: 1,
      xRayCount: 0,
      usCount: 1,
      payableByCurrency: [],
    },
    {
      userId: 'technician-1',
      fullName: 'Jordan Technician',
      role: 'Technician',
      workingDays: null,
      completedSessions: null,
      totalWorkedMinutes: null,
      isClockedIn: null,
      clockInAt: null,
      totalInterpretations: null,
      interpretationsWithRate: null,
      interpretationsWithoutRate: null,
      xRayCount: 1,
      usCount: 1,
      payableByCurrency: [{ currency: 'ILS', amount: 20 }],
      totalExaminations: 2,
      examinationsWithRate: 1,
      examinationsWithoutRate: 1,
    },
  ],
}

const staffHours = {
  staffUserId: 'staff-1',
  fromUtc: overview.fromUtc,
  toUtc: overview.toUtc,
  sessions: [{
    sessionId: 'session-1',
    sessionDate: '2026-03-08',
    clockInAt: '2026-03-08T09:00:00Z',
    clockOutAt: '2026-03-08T11:00:00Z',
    workedMinutesInRange: 120,
  }],
  completedSessions: 1,
  workingDays: 1,
  totalWorkedMinutes: 120,
}

const interpreterWork = {
  interpreterUserId: 'interpreter-1',
  fromUtc: overview.fromUtc,
  toUtc: overview.toUtc,
  items: [{
    id: 'item-1',
    interpretationRequestId: 'request-1',
    imagingOrderId: 'order-1',
    imagingStudyId: 'study-1',
    completedAt: '2026-03-08T13:00:00Z',
    accessionNumber: 'NOT-DISPLAYED',
    originalModality: 'US',
    payrollModality: 'US',
    rateAmount: null,
    currency: 'ILS',
  }],
  totalInterpretations: 1,
  interpretationsWithRate: 0,
  interpretationsWithoutRate: 1,
  countsByPayrollModality: [{ payrollModality: 'US', count: 1 }],
  payableByCurrency: [],
}

const activeRate = {
  id: 'rate-1',
  interpreterUserId: 'interpreter-1',
  interpreterName: 'Taylor Interpreter',
  modality: 'XRay',
  amount: 25,
  currency: 'ILS',
  isActive: true,
  createdAt: overview.fromUtc,
  updatedAt: overview.fromUtc,
}

const technicianWork = {
  technicianUserId: 'technician-1',
  fromUtc: overview.fromUtc,
  toUtc: overview.toUtc,
  items: [{
    id: 'technician-item-1',
    imagingOrderId: 'order-1',
    imagingStudyId: 'study-1',
    performedAt: '2026-03-08T13:00:00Z',
    accessionNumber: 'NOT-DISPLAYED',
    originalModality: 'DX',
    payrollModality: 'XRay',
    rateAmount: 20,
    currency: 'ILS',
  }],
  totalExaminations: 2,
  examinationsWithRate: 1,
  examinationsWithoutRate: 1,
  countsByPayrollModality: [
    { payrollModality: 'XRay', count: 1 },
    { payrollModality: 'US', count: 1 },
  ],
  payableByCurrency: [{ currency: 'ILS', amount: 20 }],
}

const activeTechnicianRate = {
  id: 'technician-rate-1',
  technicianUserId: 'technician-1',
  technicianName: 'Jordan Technician',
  modality: 'XRay',
  amount: 20,
  currency: 'ILS',
  isActive: true,
  createdAt: overview.fromUtc,
  updatedAt: overview.fromUtc,
}

const renderPage = () => render(
  <MemoryRouter>
    <WorkSummaryPage />
  </MemoryRouter>,
)

describe('Work Summary manager page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    mocks.getWorkSummaryOverview.mockResolvedValue(overview)
    mocks.getInterpreterRates.mockResolvedValue([])
    mocks.getTechnicianRates.mockResolvedValue([activeTechnicianRate])
    mocks.getStaffHours.mockResolvedValue(staffHours)
    mocks.getInterpreterWork.mockResolvedValue(interpreterWork)
    mocks.getTechnicianWork.mockResolvedValue(technicianWork)
    mocks.correctStaffSession.mockResolvedValue({})
    mocks.setInterpreterRate.mockResolvedValue(activeRate)
    mocks.setTechnicianRate.mockResolvedValue(activeTechnicianRate)
    mocks.deactivateInterpreterRate.mockResolvedValue(undefined)
    mocks.deactivateTechnicianRate.mockResolvedValue(undefined)
  })

  afterEach(cleanup)

  it('loads team totals and shows current open attendance without adding it to completed hours', async () => {
    renderPage()

    expect(await screen.findAllByText('Alex Staff')).not.toHaveLength(0)
    expect(screen.getAllByText('2 h 0 min').length).toBeGreaterThan(0)
    expect(screen.getByText(/Clocked in ·/)).toBeInTheDocument()
    expect(mocks.getWorkSummaryOverview).toHaveBeenCalledOnce()
    expect(mocks.getInterpreterRates).toHaveBeenCalledOnce()
  })

  it('lets a manager correct a completed session with a required reason', async () => {
    renderPage()
    fireEvent.click((await screen.findAllByTestId('work-summary-member-row'))[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Correct' }))

    fireEvent.change(screen.getByLabelText('Clock in'), { target: { value: '2026-03-08T09:15' } })
    fireEvent.change(screen.getByLabelText('Clock out'), { target: { value: '2026-03-08T11:15' } })
    fireEvent.change(screen.getByLabelText('Correction reason'), { target: { value: 'Approved adjustment' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }))

    await waitFor(() => expect(mocks.correctStaffSession).toHaveBeenCalledWith(
      'staff-1',
      'session-1',
      new Date('2026-03-08T09:15').toISOString(),
      new Date('2026-03-08T11:15').toISOString(),
      'Approved adjustment',
    ))
  })

  it('lets the entire desktop staff row and mobile card select the member', async () => {
    renderPage()

    const row = (await screen.findAllByTestId('work-summary-member-row'))[0]
    fireEvent.click(row)
    expect(await screen.findByRole('region', { name: 'Member details' })).toBeInTheDocument()

    const card = (await screen.findAllByTestId('work-summary-member-card'))[1]
    fireEvent.click(within(card).getByText('Taylor Interpreter'))
    expect(await screen.findByText('Completed interpretation work')).toBeInTheDocument()
  })

  it('shows missing historical rates as not configured and allows future rate management', async () => {
    renderPage()
    fireEvent.click((await screen.findAllByTestId('work-summary-member-card'))[1])

    expect(await screen.findByText('Completed interpretation work')).toBeInTheDocument()
    expect(screen.getAllByText('Not configured').length).toBeGreaterThan(0)
    expect(screen.queryByText(/\$0\.00/)).not.toBeInTheDocument()
    expect(screen.queryByText('NOT-DISPLAYED')).not.toBeInTheDocument()

    const amounts = screen.getAllByLabelText('Amount per interpretation')
    fireEvent.change(amounts[0], { target: { value: '25' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save rate' })[0])

    await waitFor(() => expect(mocks.setInterpreterRate).toHaveBeenCalledWith('interpreter-1', 'XRay', 25))
    expect(await screen.findByText('Rate saved for future completed work.')).toBeInTheDocument()
  })

  it('shows technician examination/payable metrics and manages per-examination rates', async () => {
    renderPage()
    fireEvent.click((await screen.findAllByTestId('work-summary-member-card'))[2])

    expect(await screen.findByRole('heading', { name: 'Completed examinations' })).toBeInTheDocument()
    expect(screen.getByText('Technician rates per examination')).toBeInTheDocument()
    expect(screen.getByText('examinations have no configured rate.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Payable totals' })).getByText('₪20.00')).toBeInTheDocument()
    expect(screen.queryByText('NOT-DISPLAYED')).not.toBeInTheDocument()

    const amounts = screen.getAllByLabelText('Rate per examination')
    fireEvent.change(amounts[0], { target: { value: '25' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save rate' })[0])

    await waitFor(() => expect(mocks.setTechnicianRate).toHaveBeenCalledWith(
      'technician-1',
      'XRay',
      25,
    ))
  })

  it.each([
    ['he', 'סיכום עבודה', 'rtl'],
    ['ar', 'ملخص العمل', 'rtl'],
    ['en', 'Work Summary', 'ltr'],
  ])('localizes the page and direction for %s', async (language, title, direction) => {
    await i18n.changeLanguage(language)
    renderPage()

    const main = await screen.findByRole('main')
    expect(main).toHaveAttribute('dir', direction)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  })

  it('uses the medical interpreter role terminology in Hebrew', async () => {
    await i18n.changeLanguage('he')
    renderPage()

    expect(await screen.findAllByText('מפענח')).not.toHaveLength(0)
    expect(screen.queryByText('מתורגמן')).not.toBeInTheDocument()
  })
})
