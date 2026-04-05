import * as apiClient from './apiClient'

export interface ConsentTemplate {
  id: string
  serviceId: string
  content: string
  createdAt?: string
  updatedAt?: string
}

export interface SignedConsent {
  id: string
  templateId: string
  clientId: string
  serviceId?: string | null
  appointmentId?: string | null
  consentContent: string
  signedAt: string
  clientSignatureUrl?: string | null
  doctorSignatureUrl?: string | null
  serviceName?: string | null
  templateName?: string | null
}

export interface SignConsentPayload {
  templateId: string
  clientId: string
  appointmentId?: string
  serviceId?: string
  consentContent: string
  clientSignatureBase64: string
}

export const consentsApi = {
async createTemplate(data: {name: string, serviceId: string, content: string}) {
    return apiClient.post<ConsentTemplate>('/api/consents/templates', data)
   },

  async getTemplateByService(serviceId: string) {
    return apiClient.get<ConsentTemplate | null>(`/api/consents/templates/service/${serviceId}`)
  },

  async signConsent(payload: SignConsentPayload) {
    return apiClient.post<SignedConsent>('/api/consents/sign', payload)
  },

  async getSignedByClient(clientId: string) {
    return apiClient.get<SignedConsent[]>(`/api/consents/client/${clientId}`)
  },

  async getById(consentId: string) {
    return apiClient.get<SignedConsent>(`/api/consents/${consentId}`)
  },

  async downloadPdf(consentId: string) {
    return apiClient.getBlob(`/api/consents/${consentId}/pdf`)
  },
}
