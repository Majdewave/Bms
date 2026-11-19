import type { InterpreterRequestListItem } from '@/api/interpreterPortal'

export type InterpreterModalityFilter = 'all' | 'xray' | 'ultrasound' | 'other'
export type InterpreterDateFilter = 'all' | 'today' | 'thisMonth' | 'custom'

export interface InterpreterRequestFilters {
  modality: InterpreterModalityFilter
  date: InterpreterDateFilter
  search: string
  from: string
  to: string
}

const xrayModalities = new Set(['DX', 'DR', 'CR'])

const modalityFamily = (modality: string): Exclude<InterpreterModalityFilter, 'all'> => {
  const normalized = modality.trim().toUpperCase()
  if (xrayModalities.has(normalized)) return 'xray'
  if (normalized === 'US') return 'ultrasound'
  return 'other'
}

const localDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const hasOtherInterpreterModalities = (requests: InterpreterRequestListItem[]) =>
  requests.some(request => modalityFamily(request.modality) === 'other')

export const filterInterpreterRequests = (
  requests: InterpreterRequestListItem[],
  filters: InterpreterRequestFilters,
  now: Date = new Date(),
  locale = 'en',
) => {
  const search = filters.search.trim().toLocaleLowerCase(locale)
  const validCustomRange = filters.date !== 'custom' ||
    (Boolean(filters.from) && Boolean(filters.to) && filters.from <= filters.to)
  const todayKey = localDateKey(now)

  return requests.filter(request => {
    if (filters.modality !== 'all' && modalityFamily(request.modality) !== filters.modality) {
      return false
    }

    if (search) {
      const searchableText = `${request.clientDisplayName} ${request.accessionNumber}`
        .toLocaleLowerCase(locale)
      if (!searchableText.includes(search)) return false
    }

    if (filters.date === 'all') return true
    if (!validCustomRange) return false

    const requestedAt = new Date(request.requestedAt)
    if (Number.isNaN(requestedAt.getTime())) return false
    const requestedDateKey = localDateKey(requestedAt)

    if (filters.date === 'today') return requestedDateKey === todayKey
    if (filters.date === 'thisMonth') {
      return requestedAt.getFullYear() === now.getFullYear() &&
        requestedAt.getMonth() === now.getMonth()
    }

    return requestedDateKey >= filters.from && requestedDateKey <= filters.to
  })
}
