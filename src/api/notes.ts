import { get, post, put, del } from './apiClient'

export interface Note {
  id: string
  clientId: string
  content: string
  createdByUserId: string
  createdBy: string
  createdAt: string
}

export const getClientNotes = async (clientId: string): Promise<Note[]> => {
  return get<Note[]>(`/api/clients/${clientId}/notes`)
}

export const createNote = async (note: {
  clientId: string
  content: string
}): Promise<Note> => {
  return post<Note>('/api/notes', note)
}

export const updateNote = async (
  id: string,
  note: {
    content: string
  }
): Promise<Note> => {
  return put<Note>(`/api/notes/${id}`, note)
}

export const deleteNote = async (id: string): Promise<void> => {
  return del<void>(`/api/notes/${id}`)
}
