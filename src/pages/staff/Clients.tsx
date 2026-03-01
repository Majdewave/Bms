import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, PageHeader, Card, CardContent, Badge } from '@/components'
import { clientsService } from '@/api'
import type { Client } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus, Mail, Phone, Calendar } from 'lucide-react'

export default function StaffClients() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  )

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'slate'
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <PageHeader
            title={t('staff.clients.title')}
            description={t('staff.clients.subtitle')}
          />
        </div>
        {hasPermission('manage_clients') && (
          <button
            onClick={() => navigate('/admin/clients')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('admin.clients.addButton')}
          </button>
        )}
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('admin.clients.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">{t('common.loading')}</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg font-medium">{t('staff.clients.emptyState.title')}</p>
              <p className="text-slate-400 text-sm mt-1">{t('staff.clients.emptyState.description')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent>
                <div
                  onClick={() => navigate(`/admin/clients/${client.id}`)}
                  className="flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{client.name}</h3>
                      <Badge variant={getStatusColor(client.status)}>
                        {client.status === 'active' ? t('admin.clients.statusActive') : t('admin.clients.statusInactive')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{t('admin.clients.joinedDate', { date: new Date(client.joinDate).toLocaleDateString() })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{client.appointmentsCount}</p>
                    <p className="text-xs text-slate-500">{t('admin.clients.appointments')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  )
}
