// PM (Project Management) foundation API - Phase 1A.
// Isolated module: not imported by any existing page/component yet.
import { get, post, put, del } from './apiClient'
import type { ClientContact, CreateClientContactRequest, UpdateClientContactRequest } from '@/types/pm'

export const getClientContacts = async (clientId: string): Promise<ClientContact[]> => {
  return get<ClientContact[]>(`/api/clients/${clientId}/contacts`)
}

export const getClientContact = async (id: string): Promise<ClientContact> => {
  return get<ClientContact>(`/api/client-contacts/${id}`)
}

export const createClientContact = async (clientId: string, data: CreateClientContactRequest): Promise<ClientContact> => {
  return post<ClientContact>(`/api/clients/${clientId}/contacts`, data)
}

export const updateClientContact = async (id: string, data: UpdateClientContactRequest): Promise<ClientContact> => {
  return put<ClientContact>(`/api/client-contacts/${id}`, data)
}

export const deleteClientContact = async (id: string): Promise<void> => {
  return del(`/api/client-contacts/${id}`)
}
