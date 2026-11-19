export type WorkSummaryPeriod = 'today' | 'thisMonth' | 'custom'

export interface UtcDateRange {
  fromUtc: string
  toUtc: string
}

const localMidnight = (year: number, month: number, day: number) =>
  new Date(year, month, day, 0, 0, 0, 0)

const toUtcRange = (start: Date, endExclusive: Date): UtcDateRange => ({
  fromUtc: start.toISOString(),
  toUtc: endExclusive.toISOString(),
})

const parseLocalDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = localMidnight(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date
}

export const getWorkSummaryRange = (
  period: WorkSummaryPeriod,
  now: Date = new Date(),
  customFrom?: string,
  customTo?: string,
): UtcDateRange | null => {
  if (period === 'today') {
    return toUtcRange(
      localMidnight(now.getFullYear(), now.getMonth(), now.getDate()),
      localMidnight(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    )
  }

  if (period === 'thisMonth') {
    return toUtcRange(
      localMidnight(now.getFullYear(), now.getMonth(), 1),
      localMidnight(now.getFullYear(), now.getMonth() + 1, 1),
    )
  }

  if (!customFrom || !customTo) return null
  const start = parseLocalDate(customFrom)
  const inclusiveEnd = parseLocalDate(customTo)
  if (!start || !inclusiveEnd || start > inclusiveEnd) return null

  return toUtcRange(
    start,
    localMidnight(inclusiveEnd.getFullYear(), inclusiveEnd.getMonth(), inclusiveEnd.getDate() + 1),
  )
}
