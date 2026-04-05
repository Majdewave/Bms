import * as apiClient from './apiClient'

export interface ClientPhoto {
  id: string
  clientId: string
  beforeImageUrl: string
  afterImageUrl: string
  createdAt?: string
}

export const clientPhotosService = {
  async getPhotos(clientId: string): Promise<ClientPhoto[]> {
    return apiClient.get<ClientPhoto[]>(`/api/client-photos/client/${clientId}`)
  },

  async uploadPhotos(formData: FormData): Promise<ClientPhoto> {
    return apiClient.post<ClientPhoto>('/api/client-photos', formData, true)
  },

  async deleteBefore(id: string): Promise<void> {
    await apiClient.del<void>(`/api/client-photos/${id}/before`)
  },

  async deleteAfter(id: string): Promise<void> {
    await apiClient.del<void>(`/api/client-photos/${id}/after`)
  },

  async deleteAll(id: string): Promise<void> {
    await apiClient.del<void>(`/api/client-photos/${id}`)
  },
}
