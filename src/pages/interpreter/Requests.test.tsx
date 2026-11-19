// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { InterpreterRequestListItem } from '@/api/interpreterPortal'

const mocks = vi.hoisted(() => ({
  getInterpretationRequests: vi.fn(),
}))

vi.mock('@/api/interpreterPortal', async importOriginal => ({
  ...(await importOriginal<typeof import('@/api/interpreterPortal')>()),
  getInterpretationRequests: mocks.getInterpretationRequests,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Interpreter' } }),
}))

import i18n from '@/i18n'
import InterpreterRequests from './Requests'

const localDateIso = (dayOffset: number) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + dayOffset)
  return date.toISOString()
}

const requests: InterpreterRequestListItem[] = [
  {
    id: 'request-dx',
    imagingOrderId: 'order-dx',
    imagingStudyId: 'study-dx',
    accessionNumber: 'DX-1001',
    modality: 'DX',
    clientId: 'client-1',
    clientDisplayName: 'Gabi Cohen',
    status: 'Pending',
    requestedAt: localDateIso(0),
    startedAt: null,
    completedAt: null,
  },
  {
    id: 'request-dr',
    imagingOrderId: 'order-dr',
    imagingStudyId: 'study-dr',
    accessionNumber: 'DR-2002',
    modality: 'DR',
    clientId: 'client-2',
    clientDisplayName: 'Gabi Levi',
    status: 'InProgress',
    requestedAt: localDateIso(-3),
    startedAt: null,
    completedAt: null,
  },
  {
    id: 'request-cr',
    imagingOrderId: 'order-cr',
    imagingStudyId: 'study-cr',
    accessionNumber: 'CR-3003',
    modality: 'CR',
    clientId: 'client-3',
    clientDisplayName: 'Alex Cohen',
    status: 'Completed',
    requestedAt: localDateIso(-5),
    startedAt: null,
    completedAt: null,
  },
  {
    id: 'request-us',
    imagingOrderId: 'order-us',
    imagingStudyId: 'study-us',
    accessionNumber: 'US-4004',
    modality: 'US',
    clientId: 'client-4',
    clientDisplayName: 'Mira Cohen',
    status: 'Pending',
    requestedAt: localDateIso(-40),
    startedAt: null,
    completedAt: null,
  },
  {
    id: 'request-ct',
    imagingOrderId: 'order-ct',
    imagingStudyId: 'study-ct',
    accessionNumber: 'CT-5005',
    modality: 'CT',
    clientId: 'client-5',
    clientDisplayName: 'Pat Davis',
    status: 'Pending',
    requestedAt: localDateIso(0),
    startedAt: null,
    completedAt: null,
  },
]

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="current-path">{location.pathname}</output>
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CurrentPath />
      <InterpreterRequests />
    </MemoryRouter>,
  )
}

describe('Interpreter interpretation queue', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    mocks.getInterpretationRequests.mockResolvedValue(requests)
  })

  afterEach(cleanup)

  it('numbers the currently displayed results and preserves opening and the assigned-list API call', async () => {
    renderPage()

    const cards = await screen.findAllByTestId('interpreter-request-card')
    expect(cards).toHaveLength(5)
    expect(screen.getByText('Found 5 examinations')).toBeInTheDocument()
    expect(screen.getByLabelText('Result 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Result 5')).toBeInTheDocument()
    expect(mocks.getInterpretationRequests).toHaveBeenCalledOnce()

    fireEvent.click(within(cards[0]).getByText('Gabi Cohen'))
    expect(screen.getByTestId('current-path')).toHaveTextContent('/interpreter/requests/request-dx')
  })

  it('filters X-Ray family and Ultrasound, updating count and numbering', async () => {
    renderPage()
    await screen.findAllByTestId('interpreter-request-card')

    fireEvent.change(screen.getByLabelText('Examination type'), { target: { value: 'xray' } })
    let cards = screen.getAllByTestId('interpreter-request-card')
    expect(cards).toHaveLength(3)
    expect(screen.getByText('Found 3 examinations')).toBeInTheDocument()
    expect(screen.getByLabelText('Result 3')).toBeInTheDocument()
    expect(screen.queryByLabelText('Result 4')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Examination type'), { target: { value: 'ultrasound' } })
    cards = screen.getAllByTestId('interpreter-request-card')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByText('US')).toBeInTheDocument()
  })

  it('filters by displayed requested date and combines search, modality, and custom dates', async () => {
    renderPage()
    await screen.findAllByTestId('interpreter-request-card')

    fireEvent.change(screen.getByLabelText('Date period'), { target: { value: 'today' } })
    expect(screen.getAllByTestId('interpreter-request-card')).toHaveLength(2)

    fireEvent.change(screen.getByPlaceholderText('Search by patient name or examination number...'), {
      target: { value: '  gAbI ' },
    })
    fireEvent.change(screen.getByLabelText('Examination type'), { target: { value: 'xray' } })
    fireEvent.change(screen.getByLabelText('Date period'), { target: { value: 'custom' } })

    await waitFor(() => expect(screen.getAllByTestId('interpreter-request-card')).toHaveLength(1))
    expect(screen.getByText('Gabi Cohen')).toBeInTheDocument()
    expect(screen.getByText('Found 1 examinations')).toBeInTheDocument()
    expect(screen.getByLabelText('Result 1')).toBeInTheDocument()
  })

  it('searches partial patient/accession text and clear-search restores matches', async () => {
    renderPage()
    await screen.findAllByTestId('interpreter-request-card')

    const search = screen.getByPlaceholderText('Search by patient name or examination number...')
    fireEvent.change(search, { target: { value: ' gabi ' } })
    expect(screen.getAllByTestId('interpreter-request-card')).toHaveLength(2)

    fireEvent.change(search, { target: { value: '002' } })
    const accessionMatch = screen.getAllByTestId('interpreter-request-card')
    expect(accessionMatch).toHaveLength(1)
    expect(accessionMatch[0]).toHaveTextContent('DR-2002')

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getAllByTestId('interpreter-request-card')).toHaveLength(5)
  })

  it('shows an empty state for unmatched search and resets all filters', async () => {
    renderPage()
    await screen.findAllByTestId('interpreter-request-card')

    fireEvent.change(screen.getByPlaceholderText('Search by patient name or examination number...'), {
      target: { value: 'no-such-exam' },
    })
    expect(await screen.findByText('No examinations match the selected filters.')).toBeInTheDocument()
    expect(screen.getByText('Found 0 examinations')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByTestId('interpreter-request-card')).toHaveLength(5)
    expect(screen.getByText('Found 5 examinations')).toBeInTheDocument()
  })

  it('supports RTL layout and keeps search full-width on narrow screens', async () => {
    await i18n.changeLanguage('he')
    renderPage()

    const main = await screen.findByRole('main')
    expect(main).toHaveAttribute('dir', 'rtl')
    expect(screen.getByPlaceholderText('חיפוש לפי שם או מספר בדיקה...')).toHaveClass('w-full')
    expect(screen.getByLabelText('סוג בדיקה')).toBeInTheDocument()
  })
})
