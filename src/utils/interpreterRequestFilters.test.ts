import { describe, expect, it } from 'vitest'
import type { InterpreterRequestListItem } from '@/api/interpreterPortal'
import {
  filterInterpreterRequests,
  hasOtherInterpreterModalities,
  type InterpreterRequestFilters,
} from './interpreterRequestFilters'

const request = (
  id: string,
  modality: string,
  requestedAt: string,
  clientDisplayName = 'Patient',
  accessionNumber = `ACC-${id}`,
): InterpreterRequestListItem => ({
  id,
  imagingOrderId: `order-${id}`,
  imagingStudyId: `study-${id}`,
  accessionNumber,
  modality,
  clientId: `client-${id}`,
  clientDisplayName,
  status: 'Pending',
  requestedAt,
  startedAt: null,
  completedAt: null,
})

const localIso = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).toISOString()

const defaults: InterpreterRequestFilters = {
  modality: 'all',
  date: 'all',
  search: '',
  from: '',
  to: '',
}

describe('interpreter request filters', () => {
  const now = new Date(2026, 2, 15, 12)
  const requests = [
    request('dx', 'DX', localIso(2026, 3, 10), 'Gabi Cohen', 'DX-1001'),
    request('dr', 'DR', localIso(2026, 3, 15), 'Gabi Levi', 'DR-2002'),
    request('cr', 'CR', localIso(2026, 3, 20), 'Alex Cohen', 'CR-3003'),
    request('us', 'US', localIso(2026, 3, 15), 'Mira Cohen', 'US-4004'),
    request('ct', 'CT', localIso(2026, 2, 28), 'Pat Davis', 'CT-5005'),
  ]

  it('groups DX, DR, and CR as X-Ray while retaining other modalities', () => {
    expect(filterInterpreterRequests(requests, { ...defaults, modality: 'xray' }, now)
      .map(item => item.modality)).toEqual(['DX', 'DR', 'CR'])
    expect(filterInterpreterRequests(requests, { ...defaults, modality: 'ultrasound' }, now)
      .map(item => item.modality)).toEqual(['US'])
    expect(hasOtherInterpreterModalities(requests)).toBe(true)
    expect(filterInterpreterRequests(requests, { ...defaults, modality: 'other' }, now)
      .map(item => item.modality)).toEqual(['CT'])
  })

  it('filters today, this month, and inclusive custom local dates using requestedAt', () => {
    expect(filterInterpreterRequests(requests, { ...defaults, date: 'today' }, now)
      .map(item => item.id)).toEqual(['dr', 'us'])
    expect(filterInterpreterRequests(requests, { ...defaults, date: 'thisMonth' }, now)
      .map(item => item.id)).toEqual(['dx', 'dr', 'cr', 'us'])
    expect(filterInterpreterRequests(requests, {
      ...defaults,
      date: 'custom',
      from: '2026-03-10',
      to: '2026-03-15',
    }, now).map(item => item.id)).toEqual(['dx', 'dr', 'us'])
  })

  it('rejects invalid custom ranges', () => {
    expect(filterInterpreterRequests(requests, {
      ...defaults,
      date: 'custom',
      from: '2026-03-16',
      to: '2026-03-15',
    }, now)).toEqual([])
  })

  it('trims and partially matches patient names case-insensitively and accession numbers', () => {
    expect(filterInterpreterRequests(requests, { ...defaults, search: '  gAbI ' }, now)
      .map(item => item.id)).toEqual(['dx', 'dr'])
    expect(filterInterpreterRequests(requests, { ...defaults, search: '100' }, now)
      .map(item => item.id)).toEqual(['dx'])
  })

  it('combines search, modality, and date filters', () => {
    expect(filterInterpreterRequests(requests, {
      ...defaults,
      modality: 'xray',
      date: 'custom',
      from: '2026-03-15',
      to: '2026-03-15',
      search: 'gabi',
    }, now).map(item => item.id)).toEqual(['dr'])
  })
})
