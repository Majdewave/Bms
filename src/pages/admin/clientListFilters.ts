import type { Client, HealthFundCode } from '@/api/clients'

export type HealthFundFilter = 'all' | 'none' | HealthFundCode

type ClientListFilters = {
  searchQuery: string
  healthFund: HealthFundFilter
  showNotDocumentedOnly: boolean
  isBusiness: boolean
}

export function filterClients(clients: Client[], filters: ClientListFilters): Client[] {
  const { searchQuery, healthFund, showNotDocumentedOnly, isBusiness } = filters

  return clients.filter((client) => {
    if (!isBusiness && showNotDocumentedOnly && !client.isNotDocumented) return false

    if (healthFund === 'none') {
      if (client.healthFund && client.healthFund.trim().length > 0) return false
    } else if (healthFund !== 'all' && client.healthFund !== healthFund) {
      return false
    }

    if (!searchQuery) return true

    const query = searchQuery.toLowerCase().trim()
    const idQuery = searchQuery.replace(/\D/g, '')
    const nationalId =
      'nationalId' in client && typeof client.nationalId === 'string' ? client.nationalId : undefined
    const clientIdNumber = (client.idNumber ?? nationalId ?? '').replace(/\D/g, '')

    return (
      client.fullName?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      (!isBusiness && idQuery.length > 0 && clientIdNumber.includes(idQuery))
    )
  })
}
