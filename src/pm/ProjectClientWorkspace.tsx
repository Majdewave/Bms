import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Building2, Mail, Phone, User } from 'lucide-react'
import { Container } from '@/components'
import { Tabs } from '@/components/Tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { clientsService } from '@/api'
import type { Client } from '@/api'
import PmOverviewTab from './components/PmOverviewTab'
import PmProjectsTab from './components/PmProjectsTab'
import PmContactsTab from './components/PmContactsTab'
import PmQuotesTab from './components/PmQuotesTab'
import PmInvoicesTab from './components/PmInvoicesTab'
import PmFilesTab from './components/PmFilesTab'
import PmNotesTab from './components/PmNotesTab'

type TabKey = 'overview' | 'projects' | 'contacts' | 'quotes' | 'invoices' | 'files' | 'notes'

// PM (Project Management) Phase 2 - isolated workspace. Uses the SAME ClientId/Client entity as the
// existing ClientProfile; does not create a parallel client record.
export default function ProjectClientWorkspace() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { hasPermission } = useAuth()
  const { productType } = useTenant()
  const isBusiness = productType === 'business'
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const requestedTab = searchParams.get('tab') as TabKey | null
  const initialTab: TabKey = requestedTab && ['overview', 'projects', 'contacts', 'quotes', 'invoices', 'files', 'notes'].includes(requestedTab)
    ? requestedTab
    : 'overview'
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ fullName: '', phone: '', email: '' })
  const [savingHeader, setSavingHeader] = useState(false)

  const canManageProjects = hasPermission('manage_projects')

  useEffect(() => {
    if (requestedTab && ['overview', 'projects', 'contacts', 'quotes', 'invoices', 'files', 'notes'].includes(requestedTab)) {
      setActiveTab(requestedTab)
    }
  }, [requestedTab])

  useEffect(() => {
    if (!id || id === 'new') {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    clientsService
      .getClientDetails(id)
      .then((data) => {
        if (cancelled) return
        setClient(data)
        setHeaderForm({
          fullName: data?.fullName ?? '',
          phone: data?.phone ?? '',
          email: data?.email ?? '',
        })
      })
      .catch((error) => {
        console.error('Failed to load client for PM workspace:', error)
        if (!cancelled) setClient(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const saveHeader = async () => {
    if (!client || !id) return
    setSavingHeader(true)
    try {
      await clientsService.updateClient(id, {
        fullName: headerForm.fullName,
        phone: headerForm.phone,
        email: headerForm.email,
      })
      setClient({ ...client, ...headerForm })
      setEditingHeader(false)
    } catch (error) {
      console.error('Failed to update client header:', error)
    } finally {
      setSavingHeader(false)
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500">{t('common.loading')}</div>
    )
  }

  if (!client || !id) {
    return (
      <div className="p-10 text-center text-red-500">{t('admin.clientProfile.notFound')}</div>
    )
  }

  const tabs = [
    { key: 'overview', label: t('pm.tabs.overview') },
    { key: 'projects', label: t('pm.tabs.projects') },
    { key: 'contacts', label: t('pm.tabs.contacts') },
    { key: 'quotes', label: t('pm.tabs.quotes') },
    { key: 'invoices', label: t('pm.tabs.invoices') },
    { key: 'files', label: t('pm.tabs.files') },
    { key: 'notes', label: t('pm.tabs.notes') },
  ]

  return (
    <Container maxWidth="xl">
      <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6 pb-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </button>
            <h1 className="text-2xl font-bold text-slate-900">{t('pm.workspaceTitle')}</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-primary-500 to-primary-600 text-white">
                <Building2 className="h-6 w-6" />
              </div>
              {editingHeader ? (
                <div className="space-y-2">
                  <input
                    value={headerForm.fullName}
                    onChange={(event) => setHeaderForm((current) => ({ ...current, fullName: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-lg font-semibold"
                    placeholder={t('admin.clientProfile.fullName')}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{client.fullName}</h2>
                  {isBusiness && client.idNumber ? (
                    <p className="text-sm text-slate-500">{t('admin.clients.form.businessRegistrationNumber')}: <bdi>{client.idNumber}</bdi></p>
                  ) : !isBusiness && client.idNumber ? (
                    <p className="text-sm text-slate-500">{client.idNumber}</p>
                  ) : null}
                </div>
              )}
            </div>

            {canManageProjects && !editingHeader && (
              <button
                type="button"
                onClick={() => setEditingHeader(true)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('common.edit')}
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" />
              {editingHeader ? (
                <input
                  value={headerForm.phone}
                  onChange={(event) => setHeaderForm((current) => ({ ...current, phone: event.target.value }))}
                  dir="ltr"
                  className="w-full rounded-lg border border-slate-300 p-2 text-left text-sm"
                />
              ) : (
                <span dir="ltr" className="text-left">{client.phone || '-'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" />
              {editingHeader ? (
                <input
                  value={headerForm.email}
                  onChange={(event) => setHeaderForm((current) => ({ ...current, email: event.target.value }))}
                  dir="ltr"
                  className="w-full rounded-lg border border-slate-300 p-2 text-left text-sm"
                />
              ) : (
                <span dir="ltr" className="text-left">{client.email || '-'}</span>
              )}
            </div>
          </div>

          {editingHeader && (
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingHeader(false)
                  setHeaderForm({ fullName: client.fullName ?? '', phone: client.phone ?? '', email: client.email ?? '' })
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={saveHeader}
                disabled={savingHeader}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {savingHeader ? t('common.saving') : t('common.save')}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <Tabs tabs={tabs} activeKey={activeTab} onChange={(key) => setActiveTab(key as TabKey)}>
            {activeTab === 'overview' && <PmOverviewTab clientId={id} />}
            {activeTab === 'projects' && <PmProjectsTab clientId={id} canManage={canManageProjects} />}
            {activeTab === 'contacts' && <PmContactsTab clientId={id} canManage={canManageProjects} />}
            {activeTab === 'quotes' && <PmQuotesTab clientId={id} />}
            {activeTab === 'invoices' && <PmInvoicesTab clientId={id} />}
            {activeTab === 'files' && <PmFilesTab clientId={id} />}
            {activeTab === 'notes' && <PmNotesTab clientId={id} />}
          </Tabs>
        </div>
      </div>
    </Container>
  )
}
