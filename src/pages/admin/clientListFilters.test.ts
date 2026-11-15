import { describe, expect, it } from 'vitest'
import type { Client } from '@/api/clients'
import { filterClients } from './clientListFilters'

const clients: Client[] = [
  { id: 'clalit', fullName: 'Noa Cohen', email: 'noa@example.com', isActive: true, createdAt: '', healthFund: 'Clalit' },
  { id: 'maccabi', fullName: 'Avi Levi', email: 'avi@example.com', isActive: true, createdAt: '', healthFund: 'Maccabi' },
  { id: 'meuhedet', fullName: 'Maya Cohen', email: 'maya@example.com', isActive: true, createdAt: '', healthFund: 'Meuhedet' },
  { id: 'leumit', fullName: 'Dan Levi', email: 'dan@example.com', isActive: true, createdAt: '', healthFund: 'Leumit' },
  { id: 'other', fullName: 'Noa Other', isActive: true, createdAt: '', healthFund: 'Other', healthFundOther: 'Local fund' },
  { id: 'other-no-detail', fullName: 'Other Fund', isActive: true, createdAt: '', healthFund: 'Other' },
  { id: 'none-null', fullName: 'Noa None', isActive: true, createdAt: '', healthFund: null },
  { id: 'none-empty', fullName: 'Empty Fund', isActive: true, createdAt: '', healthFund: '' as Client['healthFund'] },
]

const filters = {
  searchQuery: '',
  healthFund: 'all' as const,
  showNotDocumentedOnly: false,
  isBusiness: false,
}

describe('client list Health Fund filtering', () => {
  it.each(['Clalit', 'Maccabi', 'Meuhedet', 'Leumit'] as const)(
    'filters by the stored %s code',
    (healthFund) => {
      expect(filterClients(clients, { ...filters, healthFund }).map((client) => client.id)).toEqual([healthFund.toLowerCase()])
    },
  )

  it('filters Other by its code regardless of the free-text detail', () => {
    expect(filterClients(clients, { ...filters, healthFund: 'Other' }).map((client) => client.id)).toEqual([
      'other',
      'other-no-detail',
    ])
  })

  it('matches null and empty Health Fund values for No Health Fund', () => {
    expect(filterClients(clients, { ...filters, healthFund: 'none' }).map((client) => client.id)).toEqual([
      'none-null',
      'none-empty',
    ])
  })

  it('returns all clients for All Health Funds', () => {
    expect(filterClients(clients, filters)).toHaveLength(clients.length)
  })

  it('combines Health Fund with the existing text search', () => {
    expect(filterClients(clients, { ...filters, healthFund: 'Clalit', searchQuery: 'NOA' }).map((client) => client.id)).toEqual([
      'clalit',
    ])
    expect(filterClients(clients, { ...filters, healthFund: 'Clalit', searchQuery: 'avi' })).toEqual([])
  })

  it('preserves existing search behavior when no Health Fund filter is selected', () => {
    expect(filterClients(clients, { ...filters, searchQuery: 'cohen' }).map((client) => client.id)).toEqual([
      'clalit',
      'meuhedet',
    ])
  })
})
