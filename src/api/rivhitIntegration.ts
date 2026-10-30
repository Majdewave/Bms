import { get, put, post, del } from './apiClient'

export type RivhitConnectionStatus = 'notConfigured' | 'disabled' | 'notTested' | 'connected' | 'failed'

export interface RivhitIntegrationState {
  provider: string
  isEnabled: boolean
  isConfigured: boolean
  connectionStatus: RivhitConnectionStatus
  lastConnectionTestAt: string | null
  lastConnectionErrorCode: string | null
  accountingEnabled: boolean
  paymentsAvailable: boolean
}

export interface RivhitTestResult {
  success: boolean
  failureCode: string | null
  state: RivhitIntegrationState
}

const base = '/api/business/integrations/rivhit'

export const getRivhitIntegration = () => get<RivhitIntegrationState>(base)

// apiToken is sent only when the admin typed a new one; omit it to keep the stored credential.
export const updateRivhitIntegration = (body: { isEnabled?: boolean; accountingEnabled?: boolean; apiToken?: string }) =>
  put<RivhitIntegrationState>(base, body)

export const testRivhitConnection = () => post<RivhitTestResult>(`${base}/test`)

export const disconnectRivhit = () => del<RivhitIntegrationState>(`${base}/credential`)
