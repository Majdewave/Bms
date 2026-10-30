import type { ProjectStatus } from '@/types/pm'

export type ProjectEndWarning =
  | { tone: 'yellow' | 'red'; daysRemaining: number }
  | { tone: 'overdue'; daysOverdue: number }

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3])
    ? date
    : null
}

function shiftMonthsClamped(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12)
  const month = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)))
}

export function getProjectEndWarning(
  endDateValue: string | null | undefined,
  status: ProjectStatus | string,
  now = new Date(),
): ProjectEndWarning | null {
  if (status !== 'Active' && status !== 'OnHold') return null
  const endDate = parseDateOnly(endDateValue)
  if (!endDate) return null

  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const daysRemaining = Math.round((endDate.getTime() - today.getTime()) / 86_400_000)
  if (daysRemaining < 0) return { tone: 'overdue', daysOverdue: Math.abs(daysRemaining) }

  const oneMonthBefore = shiftMonthsClamped(endDate, -1)
  const twoMonthsBefore = shiftMonthsClamped(endDate, -2)
  if (today.getTime() >= oneMonthBefore.getTime()) return { tone: 'red', daysRemaining }
  if (today.getTime() >= twoMonthsBefore.getTime()) return { tone: 'yellow', daysRemaining }
  return null
}

export function parseProjectEndDate(value: string): Date | null {
  return parseDateOnly(value)
}