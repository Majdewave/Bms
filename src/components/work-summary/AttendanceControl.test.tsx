// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  getCurrentAttendance: vi.fn(),
  clockIn: vi.fn(),
  clockOut: vi.fn(),
}))

vi.mock('@/api/workSummary', () => mocks)

import i18n from '@/i18n'
import AttendanceControl from './AttendanceControl'

describe('AttendanceControl', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it('loads status and updates it after clock-in and clock-out', async () => {
    mocks.getCurrentAttendance
      .mockResolvedValueOnce({
        isClockedIn: false,
        openSessionId: null,
        clockInAt: null,
        elapsedMinutes: null,
      })
      .mockResolvedValueOnce({
        isClockedIn: true,
        openSessionId: 'session-1',
        clockInAt: '2026-03-08T09:00:00Z',
        elapsedMinutes: 60,
      })
      .mockResolvedValueOnce({
        isClockedIn: false,
        openSessionId: null,
        clockInAt: null,
        elapsedMinutes: null,
      })
    mocks.clockIn.mockResolvedValue({})
    mocks.clockOut.mockResolvedValue({})
    render(<AttendanceControl />)

    fireEvent.click(await screen.findByRole('button', { name: 'Clock in' }))
    await waitFor(() => expect(mocks.clockIn).toHaveBeenCalledOnce())
    expect(await screen.findByText(/Clocked in since/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clock out' }))
    await waitFor(() => expect(mocks.clockOut).toHaveBeenCalledOnce())
    expect(await screen.findByText('Not clocked in')).toBeInTheDocument()
  })

  it('shows a clear error when an attendance update fails', async () => {
    mocks.getCurrentAttendance.mockResolvedValue({
      isClockedIn: false,
      openSessionId: null,
      clockInAt: null,
      elapsedMinutes: null,
    })
    mocks.clockIn.mockRejectedValue(new Error('request failed'))
    render(<AttendanceControl />)

    fireEvent.click(await screen.findByRole('button', { name: 'Clock in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update attendance')
  })
})
