import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, PageHeader, Card, CardContent } from '@/components'
import { clientsService } from '@/api'
import type { Client } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Plus } from 'lucide-react'

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

const safeSearch = (searchQuery ?? '').toLowerCase()

const filteredClients = (clients ?? []).filter((client) => {
  const name = (client?.fullName ?? '').toLowerCase()
  const email = (client?.email ?? '').toLowerCase()

  return name.includes(safeSearch) || email.includes(safeSearch)
})


  return (
    <Container>
      {/* Header with RTL flex row */}
      <div className="flex flex-row-reverse items-center justify-between mb-6" dir="rtl">
        <div className="flex items-center gap-4 w-full">
          {/* Add Client Button on right */}
          {hasPermission('manage_clients') && (
            <button
              onClick={() => navigate('/admin/clients')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('admin.clients.addButton')}
            </button>
          )}
          {/* Page Title/Subtitle center */}
          <div className="flex-1 text-center">
            <PageHeader
              title={t('staff.clients.title')}
              description={t('staff.clients.subtitle')}
            />
          </div>
          {/* Search input on left */}
          <div className="w-64">
            <div className="relative">
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('admin.clients.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-right"
                dir="rtl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table UI */}
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
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-xl shadow-sm border border-slate-200 rtl text-right" dir="rtl">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500">{t('admin.clients.table.name')}</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500">{t('admin.clients.table.phone')}</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500">{t('admin.clients.table.email')}</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500">{t('admin.clients.table.status')}</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500">{t('admin.clients.table.lastVisit')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                // Safe field handling
                const name = client?.fullName ?? t('admin.clients.noName')
                const phone = client?.phone ?? t('admin.clients.noPhone')
                const email = client?.email ?? t('admin.clients.noEmail')
                const status = client?.status ?? 'inactive'
                // Last Visit: handle invalid/empty date
                let lastVisit = ''
                if (client?.lastVisit) {
                  const dateObj = new Date(client.lastVisit)
                  lastVisit = isNaN(dateObj.getTime()) ? t('admin.clients.noVisit') : dateObj.toLocaleDateString('he-IL')
                } else {
                  lastVisit = t('admin.clients.noVisit')
                }
                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50 cursor-pointer transition"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {status === 'active' ? t('admin.clients.statusActive') : t('admin.clients.statusInactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">{lastVisit}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  )
}
