import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, PageHeader, Card, CardHeader, CardContent, Badge } from '@/components'
import { clientsService } from '@/api'
import type { Client, ClientDetails } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Calendar,
  X,
  FileText,
  FolderOpen,
  MessageSquare,
  MapPin,
  DollarSign,
  Trash2,
  Users,
  MoreVertical,
} from 'lucide-react'

export default function AdminClients() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    internalNote: '',
    dateOfBirth: '',
  })
  const [editClientData, setEditClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    internalNote: '',
    dateOfBirth: '',
  })
  const [savingClient, setSavingClient] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadClients = async () => {
    try {
      const data = await clientsService.getClients()
      setClients(data)
    } catch (error) {
      console.error('Failed to load clients:', error)
    } finally {
      setLoading(false)
    }
  }

  // Removed loadClientDetails - now navigating to full profile page instead

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedClient) return

    setSavingNote(true)
    try {
      const note = await clientsService.addClientNote(selectedClient.id, newNote)
      // Update selected client with new note
      const updatedNotes = [note, ...selectedClient.notes]
      setSelectedClient({
        ...selectedClient,
        notes: updatedNotes,
      })
      setNewNote('')
    } catch (error) {
      console.error('Failed to add note:', error)
      alert('Failed to add note. Please try again.')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedClient) return
    if (!window.confirm(t('admin.clients.confirmDeleteNote'))) return

    setDeletingNoteId(noteId)
    try {
      await clientsService.deleteClientNote(selectedClient.id, noteId)
      // Remove note from list
      const updatedNotes = selectedClient.notes.filter(note => note.id !== noteId)
      setSelectedClient({
        ...selectedClient,
        notes: updatedNotes,
      })
    } catch (error) {
      console.error('Failed to delete note:', error)
      alert('Failed to delete note. Please try again.')
    } finally {
      setDeletingNoteId(null)
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingClient(true)
    try {
      const clientPayload = {
        fullName: newClientData.name,
        email: newClientData.email,
        phone: newClientData.phone
      }
      console.log('[handleAddClient] Sending payload:', clientPayload)
      
      // Call backend API to create client
      const response = await clientsService.createClient(clientPayload)
      console.log('[handleAddClient] Response received:', response)
      
      // Ensure response is valid before adding to state
      if (response && response.id) {
        // Add created client to state
        setClients(prevClients => [response, ...prevClients])
        
        // Close modal and reset form
        setShowAddModal(false)
        setNewClientData({
          name: '',
          email: '',
          phone: '',
          address: '',
          internalNote: '',
          dateOfBirth: '',
        })
        alert(t('admin.clients.createSuccess'))
      } else {
        console.error('[handleAddClient] Invalid response structure:', response)
        alert(t('admin.clients.createError'))
      }
    } catch (error) {
      console.error('Failed to add client:', error)
      alert(t('admin.clients.createError'))
    } finally {
      setSavingClient(false)
    }
  }

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClientId) return
    
    setSavingClient(true)
    try {
      console.log('Updating client:', editingClientId, editClientData)
      
      const payload = {
        fullName: editClientData.name.trim(),
        email: editClientData.email?.trim() || undefined,
        phone: editClientData.phone?.trim() || undefined,
        address: editClientData.address?.trim() || undefined,
        internalNote: editClientData.internalNote?.trim() || undefined,
        isActive: true,
      }
      
      console.log('Update payload:', JSON.stringify(payload, null, 2))
      
      // Call actual API
      const updatedClient = await clientsService.updateClient(editingClientId, payload)
      
      console.log('Client updated:', updatedClient)
      
      // Update clients list with response from server
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === editingClientId
            ? updatedClient
            : client
        )
      )
      
      // Update selected client details if viewing
      if (selectedClient && selectedClient.id === editingClientId) {
        setSelectedClient({
          ...selectedClient,
          ...updatedClient,
        })
      }
      
      // Close modal
      setShowEditModal(false)
      setEditingClientId(null)
      setEditClientData({
        name: '',
        email: '',
        phone: '',
        address: '',
        internalNote: '',
        dateOfBirth: '',
      })
    } catch (error) {
      console.error('Failed to update client:', error)
      alert(t('admin.clients.updateError') || 'Failed to update client')
    } finally {
      setSavingClient(false)
    }
  }

  const openEditModal = (client: Client) => {
    setEditingClientId(client.id)
    setEditClientData({
      name: client.fullName,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      internalNote: client.internalNote || '',
      dateOfBirth: '',
    })
    setShowEditModal(true)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm(t('admin.clients.confirmDelete'))) return

    try {
      console.log('Deleting client with ID:', clientId)
      console.log('Request URL:', `/api/clients/${clientId}`)
      
      await clientsService.deleteClient(clientId)
      
      // Remove from list
      setClients(prevClients => prevClients.filter(c => c.id !== clientId))
      if (selectedClient?.id === clientId) {
        setSelectedClient(null)
      }
      
      console.log('Client deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete client:', error)
      const errorMessage = error?.message || error?.response?.data?.message || t('admin.clients.deleteError')
      alert(errorMessage)
    }
  }


const handleToggleClientStatus = async (
  clientId: string,
  currentStatus: 'active' | 'inactive'
) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  const confirmKey =
    newStatus === 'inactive'
      ? 'admin.clients.confirmDeactivate'
      : 'admin.clients.confirmActivate'

  if (!window.confirm(t(confirmKey))) return

  try {
    const existingClient = clients.find(c => c.id === clientId)
    if (!existingClient) return

    const payload = {
      fullName: existingClient.fullName,
      email: existingClient.email,
      phone: existingClient.phone,
      address: existingClient.address,
      internalNote: existingClient.internalNote,
      isActive: newStatus === 'active'
    }

    await clientsService.updateClient(clientId, payload)

    // ✅ עדכון ידני כי אין response
    setClients(prev =>
      prev.map(c =>
        c.id === clientId
          ? { ...c, status: newStatus, isActive: newStatus === 'active' }
          : c
      )
    )

    if (selectedClient?.id === clientId) {
      setSelectedClient({
        ...selectedClient,
        status: newStatus,
        isActive: newStatus === 'active'
      })
    }

  } catch (error) {
    console.error('Failed to update client status:', error)
    alert(t('admin.clients.statusUpdateError'))
  }
}




  const handleSendLoginLink = async (_clientId: string, clientEmail: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      alert(t('admin.clients.loginLinkSent', { email: clientEmail }))
    } catch (error) {
      console.error('Failed to send login link:', error)
      alert(t('admin.clients.loginLinkError'))
    }
  }

const filteredClients = (clients ?? [])
  .filter((client): client is Client => !!client)
  .filter((client) =>
    (client.fullName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const { user } = useAuth()
  const isStaffView = user?.role === 'staff'

  return (
    <Container>
      {isStaffView && (
        <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">{t('staff.clients.viewTitle')}</h3>
          </div>
          <p className="text-sm text-blue-700">{t('staff.clients.viewDescription')}</p>
        </div>
      )}
      <PageHeader
        title={t('admin.clients.title')}
        description={t('admin.clients.subtitle')}
        action={
          hasPermission('manage_clients') && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('admin.clients.add')}
            </button>
          )
        }
      />

      <Card>
        <CardHeader title={t('admin.clients.directoryTitle')} />
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('admin.clients.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input ps-10"
              />
            </div>
            <button className="btn btn-secondary btn-md">
              <Filter className="w-4 h-4" />
              {t('admin.clients.filter')}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchQuery ? t('admin.clients.noSearchResults') : t('admin.clients.noClients')}
              </h3>
              {!searchQuery && isStaffView && (
                <div className="max-w-md mx-auto mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-900 mb-2">
                    {t('staff.clients.emptyState.title')}
                  </p>
                  <p className="text-xs text-blue-700">
                    {t('staff.clients.emptyState.description')}
                  </p>
                </div>
              )}
              {searchQuery && (
                <p className="text-sm text-slate-500 mt-2">
                  {t('admin.clients.tryDifferentSearch')}
                </p>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto lg:overflow-x-visible">
              <table className="w-full text-sm lg:text-base">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start py-3 px-2 lg:px-4 font-semibold text-slate-900 text-xs lg:text-sm">
                      {t('admin.clients.table.client')}
                    </th>
                    <th className="text-left py-3 px-2 lg:px-4 font-semibold text-slate-900 text-xs lg:text-sm">
                      {t('admin.clients.table.contact')}
                    </th>
                    <th className="text-left py-3 px-2 lg:px-4 font-semibold text-slate-900 text-xs lg:text-sm">
                      {t('common.status')}
                    </th>
                    <th className="hidden md:table-cell text-start py-3 px-2 lg:px-4 font-semibold text-slate-900 text-xs lg:text-sm">
                      {t('admin.clients.table.appointments')}
                    </th>
                    <th className="hidden lg:table-cell text-start py-3 px-2 lg:px-4 font-semibold text-slate-900 text-xs lg:text-sm">
                      {t('admin.clients.table.lastVisit')}
                    </th>
                    <th className="text-start py-3 px-2 lg:px-4 font-semibold text-slate-900 text-xs lg:text-sm">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="cursor-pointer hover:bg-slate-50 transition"
                      onClick={() => navigate(`/admin/clients/${client.id}`)}
                      dir={document.dir}
                    >
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white text-xs lg:text-sm font-semibold">
                            {(client.fullName || '?')
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs lg:text-sm">{client.fullName || 'Unnamed'}</p>
                            <p className="text-xs text-slate-500 hidden sm:block">{t('admin.clients.id')}: {client.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs lg:text-sm text-slate-600">
                            <Mail className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs lg:text-sm text-slate-600">
                            <Phone className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 lg:py-4 px-2 lg:px-4">
                        <Badge variant={(client.status ?? 'active') === 'active' ? 'success' : 'slate'}>
                          {t(`admin.clients.status.${client.status ?? 'active'}`)}
                        </Badge>
                      </td>
                      <td className="hidden md:table-cell py-3 lg:py-4 px-2 lg:px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-xs lg:text-sm font-medium text-slate-900">
                            {client.appointmentsCount}
                          </span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell py-3 lg:py-4 px-2 lg:px-4">
                        <span className="text-xs lg:text-sm text-slate-600">{formatDate(client.lastVisit)}</span>
                      </td>
                      <td className="py-3 lg:py-4 px-1 lg:px-4">
                        {!hasPermission('manage_clients') ? (
                          <div className="group relative inline-flex">
                            <button
                              disabled
                              className="px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm font-semibold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed opacity-50"
                            >
                              {t('common.actions')}
                            </button>
                            <div className="absolute bottom-full end-0 mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal">
                              {t('admin.clients.noPermission')}
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === client.id ? null : client.id);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title={t('common.actions')}
                            >
                              <MoreVertical className="w-4 h-4 lg:w-5 lg:h-5" />
                            </button>
                            {openDropdownId === client.id && (
                              <div className="absolute end-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/clients/${client.id}`);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-start px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                  <FileText className="w-4 h-4" />
                                  {t('admin.clients.view')}
                                </button>
                                {/* Edit option removed: editing is now inline in ClientProfile */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendLoginLink(client.id, client.email);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-start px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                  <Phone className="w-4 h-4" />
                                  {t('admin.clients.link')}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleClientStatus(client.id, client.status);
                                    setOpenDropdownId(null);
                                  }}
                                  className={`w-full text-start px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                                    client.status === 'active'
                                      ? 'text-orange-600 hover:bg-orange-50'
                                      : 'text-green-600 hover:bg-green-50'
                                  }`}
                                >
                                  {client.status === 'active' ? '🚫' : '✓'}
                                  {client.status === 'active'
                                    ? t('admin.clients.deactivate')
                                    : t('admin.clients.activate')}
                                </button>
                                <div className="border-t border-slate-200"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClient(client.id);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full text-start px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('admin.clients.deleteButton')}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Details Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                  {(selectedClient.fullName || '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedClient.fullName || 'Unnamed'}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant={(selectedClient.status ?? 'active') === 'active' ? 'success' : 'slate'}>
                      {t(`admin.clients.status.${selectedClient.status ?? 'active'}`)}
                    </Badge>
                    {selectedClient.joinDate && (
                      <span className="text-sm text-slate-500">
                        {t('admin.clients.memberSince', { date: formatDate(selectedClient.joinDate) })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasPermission('manage_clients') && (
                  <button
                    onClick={() => {
                      const client = clients.find(c => c.id === selectedClient.id)
                      if (client) openEditModal(client)
                    }}
                    className="px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    {t('admin.clients.edit')}
                  </button>
                )}
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                    <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-medium">{t('common.email')}</p>
                        <p className="text-sm text-slate-900 mt-1">{selectedClient.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">{t('common.phone')}</p>
                        <p className="text-sm text-slate-900 mt-1">{selectedClient.phone}</p>
                      </div>
                    </div>
                    {selectedClient.address && (
                      <div className="col-span-2 flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500 font-medium">{t('common.address')}</p>
                          <p className="text-sm text-slate-900 mt-1">{selectedClient.address}</p>
                        </div>
                      </div>
                    )}
                    {selectedClient.internalNote && (
                      <div className="col-span-2 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-xs text-amber-700 font-medium">{t('admin.clients.form.internalNote')}</p>
                          <p className="text-sm text-slate-900 mt-1">{selectedClient.internalNote}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Appointments */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-slate-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{t('admin.clients.sections.appointments')}</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedClient.appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-sm font-semibold text-slate-900">
                                {formatDate(apt.date)}
                              </p>
                              <p className="text-xs text-slate-500">{apt.time}</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{apt.service}</p>
                              <p className="text-xs text-slate-500">{t('admin.clients.withStaff', { staff: apt.staff })}</p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              apt.status === 'completed'
                                ? 'success'
                                : apt.status === 'scheduled'
                                ? 'primary'
                                : 'slate'
                            }
                          >
                            {t(`appointments.status.${apt.status}`)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invoices */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-slate-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{t('admin.clients.sections.invoices')}</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedClient.invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {invoice.number}
                            </p>
                            <p className="text-xs text-slate-500">{formatDate(invoice.date)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(invoice.amount)}
                            </p>
                            <Badge
                              variant={
                                invoice.status === 'paid'
                                  ? 'success'
                                  : invoice.status === 'pending'
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {t(`admin.clients.invoiceStatus.${invoice.status}`)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Files */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FolderOpen className="w-5 h-5 text-slate-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{t('admin.clients.sections.files')}</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedClient.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded border border-slate-200">
                              <FileText className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                              <p className="text-xs text-slate-500">
                                {file.size} • {formatDate(file.uploadedDate)}
                              </p>
                            </div>
                          </div>
                          <button className="btn btn-sm btn-ghost">{t('admin.clients.download')}</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-5 h-5 text-slate-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{t('admin.clients.sections.notes')}</h3>
                    </div>

                    {/* Add Note */}
                    <div className="mb-4">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder={t('admin.clients.notes.placeholder')}
                        className="input w-full h-24 resize-none"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || savingNote}
                        className="btn btn-primary btn-sm mt-2"
                      >
                        {savingNote ? t('common.saving') : t('admin.clients.notes.add')}
                      </button>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {selectedClient.notes && selectedClient.notes.length > 0 ? (
                        selectedClient.notes.map((note) => (
                          <div key={note.id} className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm text-slate-900">{note.content}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                  <span className="font-medium">{note.createdBy}</span>
                                  <span>•</span>
                                  <span>{formatDateTime(note.createdAt)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={deletingNoteId === note.id}
                                className="ms-2 p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title={t('admin.clients.deleteNote')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 italic">{t('common.noResults')}</p>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowAddModal(false)}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{t('admin.clients.addNew')}</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddClient}>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientData.name}
                      onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder={t('admin.clients.form.namePlaceholder')}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.email')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder={t('admin.clients.form.emailPlaceholder')}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.phone')} *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder={t('admin.clients.form.phonePlaceholder')}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.dateOfBirth')}
                    </label>
                    <input
                      type="date"
                      value={newClientData.dateOfBirth}
                      onChange={(e) => setNewClientData({ ...newClientData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.address')}
                    </label>
                    <textarea
                      value={newClientData.address}
                      onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                      placeholder={t('admin.clients.form.addressPlaceholder')}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={savingClient}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingClient ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {t('common.saving')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {t('admin.clients.form.submit')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowEditModal(false)}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{t('admin.clients.editClient')}</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleEditClient}>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={editClientData.name}
                      onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder={t('admin.clients.form.namePlaceholder')}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.email')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={editClientData.email}
                      onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder={t('admin.clients.form.emailPlaceholder')}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.phone')} *
                    </label>
                    <input
                      type="tel"
                      required
                      value={editClientData.phone}
                      onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder={t('admin.clients.form.phonePlaceholder')}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.dateOfBirth')}
                    </label>
                    <input
                      type="date"
                      value={editClientData.dateOfBirth}
                      onChange={(e) => setEditClientData({ ...editClientData, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.address')}
                    </label>
                    <textarea
                      value={editClientData.address}
                      onChange={(e) => setEditClientData({ ...editClientData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                      placeholder={t('admin.clients.form.addressPlaceholder')}
                    />
                  </div>

                  {/* Internal Note */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t('admin.clients.form.internalNote')}
                    </label>
                    <textarea
                      value={editClientData.internalNote}
                      onChange={(e) => setEditClientData({ ...editClientData, internalNote: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                      placeholder={t('admin.clients.form.internalNotePlaceholder')}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={savingClient}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingClient ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {t('common.saving')}
                      </>
                    ) : (
                      <>
                        {t('admin.clients.form.update')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
