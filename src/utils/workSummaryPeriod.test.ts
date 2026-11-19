import { describe, expect, it } from 'vitest'
import { getWorkSummaryRange } from './workSummaryPeriod'

describe('getWorkSummaryRange', () => {
  it('uses local calendar midnights for today and the next day', () => {
    const now = new Date(2026, 2, 8, 15, 30)
    const range = getWorkSummaryRange('today', now)

    expect(range).toEqual({
      fromUtc: new Date(2026, 2, 8).toISOString(),
      toUtc: new Date(2026, 2, 9).toISOString(),
    })
  })

  it('uses a half-open local calendar month range', () => {
    const range = getWorkSummaryRange('thisMonth', new Date(2026, 11, 12, 12))

    expect(range).toEqual({
      fromUtc: new Date(2026, 11, 1).toISOString(),
      toUtc: new Date(2027, 0, 1).toISOString(),
    })
  })

  it('includes the custom To date by ending at the following local midnight', () => {
    const range = getWorkSummaryRange('custom', new Date(), '2026-03-08', '2026-03-10')

    expect(range).toEqual({
      fromUtc: new Date(2026, 2, 8).toISOString(),
      toUtc: new Date(2026, 2, 11).toISOString(),
    })
  })

  it('rejects invalid or reversed custom date ranges', () => {
    expect(getWorkSummaryRange('custom', new Date(), '2026-02-30', '2026-03-01')).toBeNull()
    expect(getWorkSummaryRange('custom', new Date(), '2026-03-02', '2026-03-01')).toBeNull()
  })
})
