import { get, post, put, del } from './apiClient'

export interface Client {
  id: string
  fullName: string
  email?: string
  phone?: string
  address?: string
  internalNote?: string
  isActive: boolean
  createdAt: string
  status?: string
  joinDate?: string
  lastVisit?: string
  appointmentsCount?: number
}

export interface ClientAppointment {
  id: string
  status: string
  date?: string
  startTime?: string
  title?: string
  service?: string
  staff?: string
  notes?: string
}

export interface ClientInvoice {
  id: string
  amount: number
  status: string
  date: string
}

export interface ClientFile {
  id: string
  name: string
  size: string
  uploadedDate: string
}

export interface ClientDetails extends Client {
  appointments?: ClientAppointment[]
  invoices?: ClientInvoice[]
  files?: ClientFile[]
  notes?: ClientNote[]
}

const mockClients_DEPRECATED: any[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 555-0101',
    status: 'active',
    appointmentsCount: 5,
    lastVisit: '2024-02-01',
    joinDate: '2023-06-15',
    address: '123 Main St, New York, NY 10001',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1 555-0102',
    status: 'active',
    appointmentsCount: 8,
    lastVisit: '2024-02-03',
    joinDate: '2023-08-20',
    address: '456 Oak Ave, Brooklyn, NY 11201',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '+1 555-0103',
    status: 'inactive',
    appointments: 2,
    lastVisit: '2024-01-15',
    joinDate: '2023-12-01',
    address: '789 Pine Rd, Queens, NY 11354',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    phone: '+1 555-0104',
    status: 'active',
    appointmentsCount: 2,
    lastVisit: '2024-02-04',
    joinDate: '2023-03-10',
    address: '321 Elm St, Manhattan, NY 10002',
  },
]

export const getClients = async (): Promise<Client[]> => {
  return get<Client[]>('/api/clients')
}

export const getClientDetails = async (clientId: string): Promise<ClientDetails> => {
  return get<ClientDetails>(`/api/clients/${clientId}`)
}

export const createClient = async (client: {
  fullName: string
  email?: string
  phone?: string
  address?: string
  internalNote?: string
}): Promise<Client> => {
  return post<Client>('/api/clients', client)
}

export const updateClient = async (
  id: string,
  client: Partial<{
    fullName: string
    email?: string
    phone?: string
    address?: string
    internalNote?: string
    isActive: boolean
  }>
): Promise<Client> => {
  return put<Client>(`/api/clients/${id}`, client)
}

export const deleteClient = async (id: string): Promise<void> => {
  return del<void>(`/api/clients/${id}`)
}

// Note: These legacy methods are deprecated, use notes.ts API instead
export interface ClientNote {
  id: string
  content: string
  createdBy: string
  createdById: string
  createdAt: string
}

export const addClientNote = async (
  clientId: string,
  content: string
): Promise<ClientNote> => {
  // Use notes.ts API instead
  const { createNote } = await import('./notes')
  return createNote({ clientId, content })
}

export const updateClientNote = async (
  _clientId: string,
  noteId: string,
  content: string
): Promise<ClientNote> => {
  // Use notes.ts API instead
  const { updateNote } = await import('./notes')
  return updateNote(noteId, { content })
}

export const deleteClientNote = async (
  _clientId: string,
  noteId: string
): Promise<void> => {
  // Use notes.ts API instead
  const { deleteNote } = await import('./notes')
  return deleteNote(noteId)
}
