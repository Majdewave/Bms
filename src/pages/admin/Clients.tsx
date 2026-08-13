import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Card, CardHeader, CardContent, Badge } from '@/components'
import CreateClientModal from '@/components/CreateClientModal'
import Autocomplete from '@/components/Autocomplete'
import { clientsService } from '@/api'
import type { Client } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Mail, Phone, Users, Edit, ShieldOff, ShieldCheck, Trash2, User } from 'lucide-react'

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
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-700" />
            <h3 className="font-semibold text-primary-900">
              {t('staff.clients.viewTitle')}
            </h3>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          {hasPermission?.('manage_clients') && (
            <div className="order-2 w-full md:order-1 md:w-auto md:self-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.2)] transition-colors hover:bg-primary-700 md:w-auto"
              >
                <Plus className="h-4 w-4" />
                {t('admin.clients.add')}
              </button>
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight text-slate-900">{t('admin.clients.title')}</h1>
            <p className="mt-2 text-lg text-slate-500">{t('admin.clients.subtitle')}</p>
          </div>

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

      <Card className="rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <CardHeader title={t('admin.clients.directoryTitle')} className="pb-0" />

        <CardContent>

          <div className="mb-6 rounded-md border border-slate-200 bg-white p-3 shadow-[0_6px_14px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
              <Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <Autocomplete
                items={safeClients}
                query={searchQuery ?? ''}
                onQueryChange={(value) => setSearchQuery(value ?? '')}
                onSelect={(client) => setSearchQuery(client.fullName ?? '')}
                getItemId={(client) => client.id}
                getItemLabel={(client) => client.fullName ?? client.email ?? ''}
                getItemSecondaryText={(client) => client.email || client.phone || undefined}
                getItemSearchText={(client) => `${client.fullName ?? ''} ${client.email ?? ''} ${client.phone ?? ''} ${client.idNumber ?? ''}`}
                placeholder={t('admin.clients.searchPlaceholder')}
                inputClassName="h-11 w-full rounded-md border border-slate-200 bg-white ps-12 pe-4 text-sm text-slate-800 transition-colors focus:border-primary-300 focus:ring-2 focus:ring-primary-500/10"
                noResultsText="לא נמצאו לקוחות"
                minQueryLength={0}
                emptyQueryShowsAll={false}
                maxResults={20}
              />
            </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <label className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
                  <input
                    type="checkbox"
                    checked={showNotDocumentedOnly}
                    onChange={(e) => setShowNotDocumentedOnly(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="whitespace-nowrap text-sm font-medium text-slate-700">{t('showOnlyNotDocumented')}</span>
                </label>
                <div className="basis-full text-sm font-medium text-red-500 lg:basis-auto lg:whitespace-nowrap">
                  {t('notDocumentedClients', { count: notDocumentedCount })}
                </div>
              </div>
            </div>
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
              <div className="hidden max-[540px]:flex flex-col gap-2.5">
                {filteredClients.map((client, idx) => {
                  const rowNumber = idx + 1
                  const clientId = client?.id ?? ''
                  const isBlocked = client?.isActive === false || client?.status === 'blocked' || client?.status === 'inactive';
                  const isNotDocumented = Boolean(client?.isNotDocumented || (client as any)?.isDocumented === false);
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
                      className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-slate-50"
                    >
                      <div className="w-full border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex items-center gap-2 font-semibold text-slate-900">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-200 px-1 text-xs font-bold text-slate-700">
                              {rowNumber}
                            </span>
                            <User className="w-4 h-4 shrink-0" />
                            <span className="truncate text-right">{client?.fullName ?? 'Unnamed'}</span>
                            <span className={isBlocked
                              ? 'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 ms-2'
                              : 'inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 ms-2'}>
                              {isBlocked ? t('admin.clients.blocked', 'Blocked') : t('admin.clients.active', 'Active')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={`px-4 py-3 space-y-3 ${
                        client.isNotDocumented
                          ? 'bg-red-50 border-t border-red-100'
                          : idx % 2 === 0
                          ? 'bg-slate-50 border-t border-slate-100'
                          : 'bg-white border-t border-slate-100'
                      }`}>
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
                              className="w-5 h-5 text-slate-500 hover:text-primary-700 cursor-pointer"
                              onClick={e => { e.stopPropagation(); navigate(`/admin/clients/${clientId}`); }}
                            />
                            {isBlocked
                              ? <ShieldCheck className="w-5 h-5 text-green-500 hover:text-green-700 cursor-pointer" onClick={handleBlock} />
                              : <ShieldOff className="w-5 h-5 text-amber-500 hover:text-amber-700 cursor-pointer" onClick={handleBlock} />
                            }
                            <Trash2 className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer" onClick={handleDelete} />
                          </div>
                        </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: original table */}
              <div className="max-[540px]:hidden overflow-x-auto rounded-md border border-slate-200/70 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
                <table className="w-full text-sm">

                  <thead className="border-b border-slate-200 bg-slate-50/90">
                    <tr>
                      <th className="w-12 min-w-12 px-3 py-3.5 text-center text-xs font-semibold text-slate-500">#</th>
                      <th className="px-6 py-3.5 text-start text-xs font-semibold text-slate-500">
                        {t('admin.clients.table.client')}
                      </th>

                      <th className="px-6 py-3.5 text-start text-xs font-semibold text-slate-500">
                        {t('admin.clients.table.phone', 'Phone')}
                      </th>

                      <th className="px-6 py-3.5 text-start text-xs font-semibold text-slate-500">
                        {t('admin.clients.table.lastVisit')}
                      </th>

                      <th className="px-6 py-3.5 text-start text-xs font-semibold text-slate-500">
                        {t('common.status')}
                      </th>

                      <th className="px-6 py-3.5 text-start text-xs font-semibold text-slate-500">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client, idx) => {
                      const rowNumber = idx + 1
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
                          className={`cursor-pointer transition-[background-color,box-shadow] duration-200 ${
                            client.isNotDocumented
                              ? 'hover:bg-red-50/35 hover:shadow-[inset_0_1px_0_rgba(248,113,113,0.16)]'
                              : 'hover:bg-primary-50/35 hover:shadow-[inset_0_1px_0_rgba(37,99,235,0.12)]'
                          }`}
                          onClick={() => clientId && navigate(`/admin/clients/${clientId}`)}
                        >
                          <td className="w-12 min-w-12 px-3 py-5 text-center align-middle font-semibold text-slate-500">
                            {rowNumber}
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-300/40 bg-gradient-to-b from-primary-500 to-primary-600 text-sm font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_2px_6px_rgba(37,99,235,0.18)]">
                                {getInitials(client?.fullName)}
                              </div>
                              <div>
                                <p className="text-[15px] font-semibold text-slate-900">
                                  {client?.fullName ?? 'Unnamed'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {clientId.substring(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {client?.phone ?? '-'}
                            </div>
                          </td>
                          <td className="px-6 py-5 align-middle text-sm text-slate-700">
                            {formatDate(client?.lastVisit)}
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <span
                              className={
                                client.isNotDocumented
                                  ? 'inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700'
                                  : isBlocked
                                  ? 'inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600'
                                  : 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700'
                              }
                            >
                              {client.isNotDocumented
                                ? t('admin.clients.missingDocumentation', 'Missing documentation')
                                : isBlocked
                                ? t('admin.clients.blocked', 'Inactive')
                                : t('admin.clients.active', 'Active')}
                            </span>
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                aria-label={t('common.edit')}
                                title={t('common.edit')}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#2563EB] hover:text-white"
                                onClick={e => {
                                  e.stopPropagation();
                                  navigate(`/admin/clients/${clientId}`);
                                }}
                              >
                                <Edit className="h-4.5 w-4.5" />
                              </button>
                              {isBlocked ? (
                                <button
                                  type="button"
                                  aria-label={t('admin.clients.activate', 'Activate')}
                                  title={t('admin.clients.activate', 'Activate')}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[#2563EB] hover:text-white"
                                  onClick={handleBlock}
                                >
                                  <ShieldCheck className="h-4.5 w-4.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={t('admin.clients.block', 'Block')}
                                  title={t('admin.clients.block', 'Block')}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-amber-500 hover:text-white"
                                  onClick={handleBlock}
                                >
                                  <ShieldOff className="h-4.5 w-4.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label={t('common.delete')}
                                title={t('common.delete')}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-red-500 hover:text-white"
                                onClick={handleDelete}
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
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