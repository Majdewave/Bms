import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Card, CardHeader, CardContent, Badge } from '@/components'
import CreateClientModal from '@/components/CreateClientModal'
import { clientsService } from '@/api'
import type { Client } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Filter, Plus, Mail, Phone, Users, Edit, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'

export default function Clients() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()

  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNotDocumentedOnly, setShowNotDocumentedOnly] = useState(false)

  const canView =
    hasPermission?.('view_clients') ||
    hasPermission?.('manage_clients')

  useEffect(() => {
    if (!canView) {
      setError('You do not have permission to view clients.')
      setLoading(false)
      return
    }

    setLoading(true)

    clientsService
      .getClients()
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data ?? []
        setClients(data)
      })
      .catch((err: any) => {
        setError(err?.message ?? 'Failed to load clients')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [canView])

  const safeClients = Array.isArray(clients) ? clients : []

  const notDocumentedCount = safeClients.filter(c => c.isNotDocumented).length

  const normalizeDigits = (value?: string) => (value ?? '').replace(/\D/g, '')

  const filteredClients = safeClients.filter((client) => {
    if (showNotDocumentedOnly && !client.isNotDocumented) return false

    if (!searchQuery) return true

    const q = searchQuery.toLowerCase().trim()
    const idQuery = normalizeDigits(searchQuery)
    const clientIdNumber = normalizeDigits(client.idNumber ?? (client as any).nationalId)

    return (
      client.fullName?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q) ||
      client.phone?.toLowerCase().includes(q) ||
      (idQuery.length > 0 && clientIdNumber.includes(idQuery))
    )
  })

  function getInitials(name?: string | null) {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  function formatDate(dateString?: string | null) {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  if (!canView) {
    return (
      <div className="text-red-500">
        You do not have permission to view clients.
      </div>
    )
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  if (error) {
    return <div className="text-red-500 p-6">{error}</div>
  }

  return (
    <Container maxWidth="xl">
      {user?.role === 'staff' && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              {t('staff.clients.viewTitle')}
            </h3>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.clients.title')}</h1>
            <p className="text-base text-slate-600 mt-2">{t('admin.clients.subtitle')}</p>
          </div>

          {hasPermission?.('manage_clients') && (
            <div className="w-full md:w-auto">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg w-full md:w-auto"
              >
                <Plus className="w-4 h-4" />
                {t('admin.clients.add')}
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(client) => {
            setShowCreateModal(false)
            navigate(`/admin/clients/${client.id}`)
          }}
        />
      )}

      <Card>
        <CardHeader title={t('admin.clients.directoryTitle')} />

        <CardContent>

          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-red-600">
                {t('notDocumentedClients', { count: notDocumentedCount })}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showNotDocumentedOnly}
                  onChange={(e) => setShowNotDocumentedOnly(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{t('showOnlyNotDocumented')}</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                type="text"
                placeholder={t('admin.clients.searchPlaceholder')}
                value={searchQuery ?? ''}
                onChange={(e) => setSearchQuery(e.target.value ?? '')}
                className="input ps-10"
              />
            </div>

            <button className="btn btn-secondary btn-md">
              <Filter className="w-4 h-4" />
              {t('admin.clients.filter')}
            </button>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">
                {t('admin.clients.noClients')}
              </h3>
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-2 md:hidden">
                {filteredClients.map((client, idx) => {
                  const clientId = client?.id ?? ''
                  const isBlocked = client?.isActive === false || client?.status === 'blocked' || client?.status === 'inactive';
                  const handleBlock = async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    await clientsService.updateClient(clientId, { ...client, isActive: !client.isActive });
                    const data = await clientsService.getClients();
                    setClients(Array.isArray(data) ? data : data?.data ?? []);
                  };
                  const handleDelete = async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (window.confirm(t('admin.clients.confirmDelete') || 'Are you sure?')) {
                      await clientsService.deleteClient(clientId);
                      const data = await clientsService.getClients();
                      setClients(Array.isArray(data) ? data : data?.data ?? []);
                    }
                  };
                  return (
                    <div
                      key={clientId}
                      onClick={() => clientId && navigate(`/admin/clients/${clientId}`)}
                      className={`rounded-xl px-4 py-3 flex flex-col gap-2 cursor-pointer ${
                        client.isNotDocumented
                          ? 'bg-red-50 border border-red-100'
                          : idx % 2 === 0
                          ? 'bg-sky-100 border border-sky-200'
                          : 'bg-white border border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold shrink-0">
                            {getInitials(client?.fullName)}
                          </div>
                          <span className="text-sm text-slate-700">
                            <span className="text-slate-500">{t('admin.clients.table.client')}:</span> <span className="font-semibold text-slate-800">{client?.fullName ?? 'Unnamed'}</span>
                          </span>
                        </div>
                        <span className={isBlocked
                          ? 'px-2 py-0.5 rounded-full text-sm font-semibold bg-red-100 text-red-700'
                          : 'px-2 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-700'}>
                          {isBlocked ? t('admin.clients.blocked', 'Blocked') : t('admin.clients.active', 'Active')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /><span className="text-slate-700"><span className="text-slate-500">Email:</span> {client?.email ?? '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" /><span className="text-slate-700"><span className="text-slate-500">Phone:</span> {client?.phone ?? '-'}</span>
                        </div>
                        <div className="text-slate-700"><span className="text-slate-500">{t('admin.clients.table.lastVisit')}:</span> {formatDate(client?.lastVisit)}</div>
                      </div>
                      <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">{t('common.status')}:</span>
                        <span className={isBlocked
                          ? 'px-2 py-0.5 rounded-full text-sm font-semibold bg-red-100 text-red-700'
                          : 'px-2 py-0.5 rounded-full text-sm font-semibold bg-green-100 text-green-700'}>
                          {isBlocked ? t('admin.clients.blocked', 'Blocked') : t('admin.clients.active', 'Active')}
                        </span>
                      </div>
                      <div className="flex gap-3 items-center" onClick={e => e.stopPropagation()}>
                        <Edit
                          className="w-5 h-5 text-blue-500 hover:text-blue-700 cursor-pointer"
                          onClick={e => { e.stopPropagation(); navigate(`/admin/clients/${clientId}`); }}
                        />
                        {isBlocked
                          ? <ShieldCheck className="w-5 h-5 text-green-500 hover:text-green-700 cursor-pointer" onClick={handleBlock} />
                          : <ShieldOff className="w-5 h-5 text-yellow-500 hover:text-yellow-700 cursor-pointer" onClick={handleBlock} />
                        }
                        <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer" onClick={handleDelete} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: original table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">

                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-start py-3 px-4">
                        {t('admin.clients.table.client')}
                      </th>

                      <th className="text-start py-3 px-4">
                        {t('admin.clients.table.contact')}
                      </th>

                      <th className="text-start py-3 px-4">
                        {t('common.status')}
                      </th>

                      <th className="text-start py-3 px-4">
                        {t('admin.clients.table.lastVisit')}
                      </th>
                      <th className="text-start py-3 px-4">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {filteredClients.map((client) => {
                      const clientId = client?.id ?? ''
                      const isBlocked = client?.isActive === false || client?.status === 'blocked' || client?.status === 'inactive';
                      const handleBlock = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        await clientsService.updateClient(clientId, {
                          ...client,
                          isActive: !client.isActive
                        });
                        const data = await clientsService.getClients();
                        setClients(Array.isArray(data) ? data : data?.data ?? []);
                      };
                      const handleDelete = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (window.confirm(t('admin.clients.confirmDelete') || 'Are you sure you want to delete this client?')) {
                          await clientsService.deleteClient(clientId);
                          const data = await clientsService.getClients();
                          setClients(Array.isArray(data) ? data : data?.data ?? []);
                        }
                      };
                      return (
                        <tr
                          key={clientId}
                          className={`border-b cursor-pointer ${
                            client.isNotDocumented ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => clientId && navigate(`/admin/clients/${clientId}`)}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm font-semibold">
                                {getInitials(client?.fullName)}
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {client?.fullName ?? 'Unnamed'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {clientId.substring(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-slate-400" />
                                {client?.email ?? '-'}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-slate-400" />
                                {client?.phone ?? '-'}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={
                                isBlocked
                                  ? 'inline-block px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700'
                                  : 'inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700'
                              }
                            >
                              {isBlocked ? t('admin.clients.blocked', 'Blocked') : t('admin.clients.active', 'Active')}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {formatDate(client?.lastVisit)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-3 items-center">
                              <Edit
                                className="w-5 h-5 text-blue-500 hover:text-blue-700 cursor-pointer"
                                aria-label={t('common.edit')}
                                title={t('common.edit')}
                                role="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/admin/clients/${clientId}`);
                                }}
                              />
                              {isBlocked ? (
                                <ShieldCheck
                                  className="w-5 h-5 text-green-500 hover:text-green-700 cursor-pointer"
                                  aria-label={t('admin.clients.activate', 'Activate')}
                                  title={t('admin.clients.activate', 'Activate')}
                                  role="button"
                                  onClick={handleBlock}
                                />
                              ) : (
                                <ShieldOff
                                  className="w-5 h-5 text-yellow-500 hover:text-yellow-700 cursor-pointer"
                                  aria-label={t('admin.clients.block', 'Block')}
                                  title={t('admin.clients.block', 'Block')}
                                  role="button"
                                  onClick={handleBlock}
                                />
                              )}
                              <Trash2
                                className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer"
                                aria-label={t('common.delete')}
                                title={t('common.delete')}
                                role="button"
                                onClick={handleDelete}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </Container>
  )
}