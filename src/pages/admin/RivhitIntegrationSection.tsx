import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plug } from 'lucide-react'
import {
  disconnectRivhit,
  getRivhitIntegration,
  testRivhitConnection,
  updateRivhitIntegration,
  type RivhitIntegrationState,
} from '@/api/rivhitIntegration'

const statusStyles: Record<string, string> = {
  notConfigured: 'bg-slate-100 text-slate-700',
  disabled: 'bg-slate-100 text-slate-700',
  notTested: 'bg-amber-100 text-amber-800',
  connected: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

// Rendered by the parent only for explicit Business tenants with the Admin role.
export default function RivhitIntegrationSection() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'
  const [state, setState] = useState<RivhitIntegrationState | null>(null)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | 'toggle' | 'disconnect' | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getRivhitIntegration()
      .then((s) => { if (!cancelled) setState(s) })
      .catch(() => { if (!cancelled) setMessage({ kind: 'error', text: t('settings.rivhit.loadError') }) })
    return () => { cancelled = true }
  }, [t])

  const run = useCallback(async (kind: NonNullable<typeof busy>, action: () => Promise<RivhitIntegrationState | void>, okText?: string) => {
    setBusy(kind)
    setMessage(null)
    try {
      const next = await action()
      if (next) setState(next)
      if (okText) setMessage({ kind: 'ok', text: okText })
    } catch {
      setMessage({ kind: 'error', text: t('settings.rivhit.saveError') })
    } finally {
      setBusy(null)
    }
  }, [t])

  const saveToken = async () => {
    const value = token.trim()
    if (!value) return
    await run('save', async () => {
      const next = await updateRivhitIntegration({ apiToken: value })
      setToken('')
      return next
    }, t('settings.rivhit.saved'))
  }

  const toggleEnabled = () => state && run('toggle', () => updateRivhitIntegration({ isEnabled: !state.isEnabled }))

  const test = () => run('test', async () => {
    if (token.trim()) {
      await updateRivhitIntegration({ apiToken: token.trim() })
      setToken('')
    }
    const result = await testRivhitConnection()
    setMessage(result.success
      ? { kind: 'ok', text: t('settings.rivhit.testOk') }
      : { kind: 'error', text: t(`settings.rivhit.errors.${result.failureCode ?? 'generic'}`, { defaultValue: t('settings.rivhit.errors.generic') }) })
    return result.state
  })

  const disconnect = () => {
    if (!window.confirm(t('settings.rivhit.disconnectConfirm'))) return
    return run('disconnect', () => disconnectRivhit())
  }

  const isBusy = busy !== null
  const status = state?.connectionStatus ?? 'notConfigured'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="mt-6 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-3 bg-slate-700 text-white">
        <Plug className="w-5 h-5" />
        <h2 className="text-lg font-semibold">{t('settings.rivhit.title')}</h2>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-sm text-slate-500">{t('settings.rivhit.description')}</p>

        <div className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
          <span className="text-sm font-medium text-slate-700">{t('settings.rivhit.enabled')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={state?.isEnabled ?? false}
            disabled={isBusy || !state || (!state.isConfigured && !state.isEnabled)}
            onClick={toggleEnabled}
            className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${state?.isEnabled ? 'bg-green-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${state?.isEnabled ? 'start-6' : 'start-1'}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-slate-700">{t('settings.rivhit.statusLabel')}:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[status]}`}>{t(`settings.rivhit.status.${status}`)}</span>
          {state?.lastConnectionTestAt && (
            <span className="text-slate-500">
              {t('settings.rivhit.lastTest', { date: new Date(state.lastConnectionTestAt).toLocaleString(i18n.language) })}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="rivhit-token">{t('settings.rivhit.apiToken')}</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="rivhit-token"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
              placeholder={state?.isConfigured ? t('settings.rivhit.tokenSavedPlaceholder') : t('settings.rivhit.tokenPlaceholder')}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5"
            />
            <button
              type="button"
              onClick={saveToken}
              disabled={isBusy || !token.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:bg-slate-300 disabled:text-slate-500"
            >
              {t('settings.rivhit.saveToken')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={test}
            disabled={isBusy || (!state?.isConfigured && !token.trim())}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === 'test' ? t('settings.rivhit.testing') : t('settings.rivhit.testConnection')}
          </button>
          {state?.isConfigured && (
            <button
              type="button"
              onClick={disconnect}
              disabled={isBusy}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {t('settings.rivhit.disconnect')}
            </button>
          )}
        </div>

        {message && (
          <div role="status" className={`text-sm ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-700">{t('settings.rivhit.accounting')}</div>
            <div className="mt-1 text-sm text-slate-600">{t('settings.rivhit.documents')}</div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3 opacity-60">
            <div className="text-sm font-medium text-slate-700">{t('settings.rivhit.payments')}</div>
            <div className="mt-1 text-sm text-slate-500">{t('settings.rivhit.comingSoon')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
