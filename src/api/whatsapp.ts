export interface WhatsAppCapabilities {
  canSendText: boolean
  canSendTemplate: boolean
  canSendDocuments: boolean
  canReceiveMessages: boolean
  canReceiveStatus: boolean
  canManageTemplates: boolean
}

import { get, post } from './apiClient'

export interface WhatsAppStatus {
  connectionStatus: 'Disconnected' | 'Connecting' | 'Connected' | 'Error' | 'TokenExpired'
  connected: boolean
  businessName: string | null
  phoneNumber: string | null
  capabilities: WhatsAppCapabilities
  connectedSince: string | null
  webhookVerified: boolean
  webhookVerifiedAt: string | null
  graphApiVersion: string | null
  lastError: string | null
  lastErrorAt: string | null
  messagesThisMonth: number
  templatesCount: number
  conversationsCount: number
  lastActivity: string | null
}

export interface WhatsAppConnectInitResponse {
  appId: string
  embeddedSignupConfigId: string
  graphApiVersion: string
}

export interface WhatsAppEmbeddedSignupCompleteRequest {
  authorizationCode: string
}

export interface WhatsAppDiagnosticsCheck {
  name: string
  success: boolean
  message: string
  durationMs: number
}

export interface WhatsAppConnectionDiagnostics {
  isHealthy: boolean
  connectionStatus: 'Disconnected' | 'Connecting' | 'Connected' | 'Error' | 'TokenExpired'
  graphApiVersion: string | null
  businessName: string | null
  businessAccountId: string | null
  phoneNumber: string | null
  phoneNumberId: string | null
  webhookVerified: boolean
  accessTokenValid: boolean
  businessFound: boolean
  phoneFound: boolean
  configurationValid: boolean
  lastWebhookReceivedAt: string | null
  lastError: string | null
  checks: WhatsAppDiagnosticsCheck[]
}

export const whatsappService = {
  async getStatus(): Promise<WhatsAppStatus> {
    return get<WhatsAppStatus>('/api/whatsapp/status')
  },

  async connect(): Promise<WhatsAppConnectInitResponse> {
    return post<WhatsAppConnectInitResponse>('/api/whatsapp/connect', {})
  },

  async completeEmbeddedSignup(payload: WhatsAppEmbeddedSignupCompleteRequest): Promise<void> {
    return post<void>('/api/whatsapp/complete', payload)
  },

  async disconnect(): Promise<void> {
    return post<void>('/api/whatsapp/disconnect', {})
  },

  async testConnection(): Promise<WhatsAppConnectionDiagnostics> {
    return get<WhatsAppConnectionDiagnostics>('/api/whatsapp/test-connection')
  },
}
