import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'
import { clientsService } from '@/api'
import type { Client } from '@/api'
import { pmClientPath } from '@/pm/utils/pmPaths'

export default function BusinessFilesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    clientsService.getClients()
      .then((items) => { if (!cancelled) setClients(items) })
      .catch((error) => console.error('Failed to load Business client documents:', error))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const isRtl = i18n.language.startsWith('he') || i18n.language.startsWith('ar')

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t('businessShell.files.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('businessShell.files.subtitle')}</p>
      </header>
      {loading ? <p className="py-8 text-center text-slate-500">{t('common.loading')}</p> : clients.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">{t('businessShell.files.empty')}</div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {clients.map((client) => (
            <button key={client.id} type="button" onClick={() => navigate(`${pmClientPath('/business', client.id)}?tab=files`)} className="flex w-full items-center gap-3 p-4 text-start hover:bg-slate-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><FolderOpen className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{client.fullName}</span>
              <span className="text-sm font-medium text-primary-700">{t('businessShell.files.open')}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
