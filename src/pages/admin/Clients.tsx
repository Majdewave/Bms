import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, PageHeader, Card, CardHeader, CardContent, Badge } from '@/components'
import CreateClientModal from '@/components/CreateClientModal'
import { clientsService } from '@/api'
import type { Client } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Filter, Plus, Mail, Phone, Users } from 'lucide-react'

export default function Clients() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()

  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

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

  const filteredClients = safeClients.filter((client) => {
    if (!searchQuery) return true

    const q = searchQuery.toLowerCase()

    return (
      client.fullName?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q) ||
      client.phone?.toLowerCase().includes(q)
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

      <PageHeader
        title={t('admin.clients.title')}
        description={t('admin.clients.subtitle')}
        action={
          hasPermission?.('manage_clients') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              {t('admin.clients.add')}
            </button>
          )
        }
      />

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
            <div className="overflow-x-auto">
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
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredClients.map((client) => {

                    const clientId = client?.id ?? ''

                    return (
                      <tr
                        key={clientId}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() =>
                          clientId && navigate(`/admin/clients/${clientId}`)
                        }
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
                          <Badge
                            variant={
                              client?.status === 'inactive'
                                ? 'slate'
                                : 'success'
                            }
                          >
                            {client?.status ?? 'active'}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          {formatDate(client?.lastVisit)}
                        </td>

                      </tr>
                    )
                  })}
                </tbody>

              </table>
            </div>
          )}

        </CardContent>
      </Card>
    </Container>
  )
}