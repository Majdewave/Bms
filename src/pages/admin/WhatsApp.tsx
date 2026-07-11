import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Building2, Clock3, Link2, MessageCircle, Phone, ShieldCheck, Unplug } from 'lucide-react'
import { whatsappService, type WhatsAppConnectionDiagnostics, type WhatsAppStatus } from '@/api/whatsapp'

type FbLoginResponse = {
  authResponse?: {
    code?: string
  }
}

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void
      login: (
        callback: (response: FbLoginResponse) => void,
        options: {
          config_id: string
          response_type: 'code'
          override_default_response_type: boolean
        }
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

type ToastState = {
  message: string
  type: 'success' | 'error' | 'info'
} | null

const emptyCapabilities = {
  canSendText: false,
  canSendTemplate: false,
  canSendDocuments: false,
  canReceiveMessages: false,
  canReceiveStatus: false,
  canManageTemplates: false,
}

const defaultStatus: WhatsAppStatus = {
  connectionStatus: 'Disconnected',
  connected: false,
  businessName: null,
  phoneNumber: null,
  capabilities: emptyCapabilities,
  connectedSince: null,
  webhookVerified: false,
  webhookVerifiedAt: null,
  graphApiVersion: null,
  lastError: null,
  lastErrorAt: null,
  messagesThisMonth: 0,
  templatesCount: 0,
  conversationsCount: 0,
  lastActivity: null,
}

export default function AdminWhatsApp() {
  const [status, setStatus] = useState<WhatsAppStatus>(defaultStatus)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<WhatsAppConnectionDiagnostics | null>(null)
  const [error, setError] = useState<string>('')
  const [toast, setToast] = useState<ToastState>(null)
  const [pendingAuthorizationCode, setPendingAuthorizationCode] = useState<string | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    window.setTimeout(() => setToast(null), 3500)
  }, [])

  const formatDate = (value: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await whatsappService.getStatus()
      setStatus({
        connectionStatus: data.connectionStatus,
        connected: !!data.connected,
        businessName: data.businessName ?? null,
        phoneNumber: data.phoneNumber ?? null,
        capabilities: {
          canSendText: !!data.capabilities?.canSendText,
          canSendTemplate: !!data.capabilities?.canSendTemplate,
          canSendDocuments: !!data.capabilities?.canSendDocuments,
          canReceiveMessages: !!data.capabilities?.canReceiveMessages,
          canReceiveStatus: !!data.capabilities?.canReceiveStatus,
          canManageTemplates: !!data.capabilities?.canManageTemplates,
        },
        connectedSince: data.connectedSince ?? null,
        webhookVerified: !!data.webhookVerified,
        webhookVerifiedAt: data.webhookVerifiedAt ?? null,
        graphApiVersion: data.graphApiVersion ?? null,
        lastError: data.lastError ?? null,
        lastErrorAt: data.lastErrorAt ?? null,
        messagesThisMonth: Number(data.messagesThisMonth ?? 0),
        templatesCount: Number(data.templatesCount ?? 0),
        conversationsCount: Number(data.conversationsCount ?? 0),
        lastActivity: data.lastActivity ?? null,
      })
    } catch {
      setError('Failed to load WhatsApp status')
      setStatus(defaultStatus)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const waStatus = params.get('wa_status')
    const waError = params.get('wa_error')

    if (waStatus === 'connected') {
      showToast('WhatsApp connected successfully.', 'success')
    }

    if (waStatus === 'error') {
      showToast(waError || 'WhatsApp connection failed.', 'error')
    }

    if (waStatus || waError) {
      params.delete('wa_status')
      params.delete('wa_error')
      const query = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    }

    loadStatus()
  }, [loadStatus, showToast])

  useEffect(() => {
    if (status.connectionStatus !== 'Connecting') {
      return
    }

    const interval = window.setInterval(() => {
      loadStatus()
    }, 5000)

    return () => {
      window.clearInterval(interval)
    }
  }, [status.connectionStatus, loadStatus])

  useEffect(() => {
    console.log('pendingAuthorizationCode changed', pendingAuthorizationCode)

    const complete = async () => {
      console.log('complete() executed', {
        pendingAuthorizationCode,
      })

      if (!pendingAuthorizationCode) {
        return
      }

      try {
        setBusy(true)
        const request = {
          authorizationCode: pendingAuthorizationCode,
        }
        console.log('Calling /complete', request)
        await whatsappService.completeEmbeddedSignup(request)

        showToast('WhatsApp connected successfully.', 'success')
        setPendingAuthorizationCode(null)
        await loadStatus()
      } catch {
        showToast('Failed to complete Embedded Signup connection.', 'error')
      } finally {
        setBusy(false)
      }
    }

    complete()
  }, [pendingAuthorizationCode, loadStatus, showToast])

  const ensureFacebookSdk = useCallback(async (): Promise<void> => {
    if (window.FB) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      const existing = document.getElementById('facebook-jssdk') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('Failed to load Facebook SDK')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.async = true
      script.defer = true
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Facebook SDK'))
      document.body.appendChild(script)
    })
  }, [])

  const handleConnect = async () => {
    if (busy || loading || status.connectionStatus === 'Connecting') {
      return
    }

    try {
      setBusy(true)
      const payload = await whatsappService.connect()
      await ensureFacebookSdk()

      if (!window.FB) {
        throw new Error('Facebook SDK unavailable')
      }

      window.FB.init({
        appId: payload.appId,
        cookie: true,
        xfbml: false,
        version: payload.graphApiVersion,
      })

      window.FB.login(
        (response) => {
          console.log('FB.login response', response)
          const code = response?.authResponse?.code
          if (!code) {
            showToast('Meta login was cancelled or did not return an authorization code.', 'error')
            setBusy(false)
            return
          }

          setPendingAuthorizationCode(code)
          showToast('Meta authorization succeeded. Completing connection...', 'info')
          setBusy(false)
        },
        {
          config_id: payload.embeddedSignupConfigId,
          response_type: 'code',
          override_default_response_type: true,
        }
      )
    } catch {
      showToast('Could not start Meta connection. Please try again.', 'error')
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    if (busy || !status.connected) {
      return
    }

    const confirmed = window.confirm('Are you sure you want to disconnect WhatsApp?')
    if (!confirmed) {
      return
    }

    try {
      setBusy(true)
      await whatsappService.disconnect()
      showToast('WhatsApp disconnected.', 'success')
      await loadStatus()
    } catch {
      showToast('Failed to disconnect WhatsApp.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleTestConnection = async () => {
    if (diagnosticsLoading || busy) {
      return
    }

    try {
      setDiagnosticsLoading(true)
      const result = await whatsappService.testConnection()
      setDiagnostics(result)
      showToast(result.isHealthy ? 'Connection is healthy.' : 'Connection diagnostics found problems.', result.isHealthy ? 'success' : 'error')
      await loadStatus()
    } catch {
      showToast('Failed to run connection diagnostics.', 'error')
    } finally {
      setDiagnosticsLoading(false)
    }
  }

  const diagnosticsDuration = useMemo(() => {
    if (!diagnostics) return 0
    return diagnostics.checks.reduce((sum, check) => sum + check.durationMs, 0)
  }, [diagnostics])

  const statusBadge = useMemo(() => {
    if (loading) return <span className="text-sm text-slate-500">Loading...</span>

    if (status.connectionStatus === 'Connected') {
      return <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-sm font-semibold">🟢 Connected</span>
    }

    if (status.connectionStatus === 'Connecting') {
      return <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-sm font-semibold">🟡 Connecting</span>
    }

    if (status.connectionStatus === 'TokenExpired') {
      return <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-sm font-semibold">🟠 Token Expired</span>
    }

    if (status.connectionStatus === 'Error') {
      return <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 text-rose-700 px-3 py-1 text-sm font-semibold">🔴 Error</span>
    }

    return <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm font-semibold">⚪ Disconnected</span>
  }, [loading, status.connectionStatus])

  const connectionRows = [
    { label: 'Business Name', value: status.businessName || '—', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Phone Number', value: status.phoneNumber || '—', icon: <Phone className="w-4 h-4" /> },
    { label: 'Connected Since', value: formatDate(status.connectedSince), icon: <Clock3 className="w-4 h-4" /> },
    { label: 'Webhook Status', value: status.webhookVerified ? 'Verified' : 'Not Verified', icon: <ShieldCheck className="w-4 h-4" /> },
    { label: 'Graph API Version', value: status.graphApiVersion || '—', icon: <MessageCircle className="w-4 h-4" /> },
  ]

  return (
    <div className="p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <MessageCircle className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">WhatsApp Meta Connection</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">שלב 3: חיבור Meta בלבד (Embedded Signup + Webhook verification).</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {status.lastError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="font-semibold">Last Connection Error</div>
            <div className="mt-1">{status.lastError}</div>
            <div className="mt-1 text-xs text-amber-700">{formatDate(status.lastErrorAt)}</div>
          </div>
        ) : null}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Connection Status</h2>
            {statusBadge}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-4 rounded-md bg-slate-200 animate-pulse" />
              <div className="h-4 rounded-md bg-slate-200 animate-pulse" />
              <div className="h-4 rounded-md bg-slate-200 animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {connectionRows.map((row) => (
                <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold mb-1">
                    {row.icon}
                    <span>{row.label}</span>
                  </div>
                  <p className="text-sm text-slate-600 break-all">{row.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleConnect}
              disabled={busy || loading || status.connectionStatus === 'Connecting'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition"
            >
              <Link2 className="w-4 h-4" />
              {status.connectionStatus === 'Connecting' ? 'Connecting...' : status.connected ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy || !status.connected}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold transition"
            >
              <Unplug className="w-4 h-4" />
              Disconnect
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={diagnosticsLoading || busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold transition"
            >
              {diagnosticsLoading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </section>

        {diagnostics ? (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Connection Diagnostics</h2>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${diagnostics.isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {diagnostics.isHealthy ? '🟢 Healthy' : '🔴 Connection Problem'}
              </span>
            </div>

            <div className="text-xs text-slate-500">Total execution time: {diagnosticsDuration} ms</div>

            <div className="grid grid-cols-1 gap-3">
              {diagnostics.checks.map((check) => (
                <div key={check.name} className={`rounded-xl border px-4 py-3 ${check.success ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{check.success ? '✅' : '❌'} {check.name}</div>
                    <div className="text-xs text-slate-600">{check.durationMs} ms</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{check.message}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Stage 3 scope enforced: Meta connection only. Send message, templates sync, incoming processing, chat, and automations remain out of scope.
        </div>

        {toast ? (
          <div className={`fixed bottom-6 left-6 z-50 px-4 py-3 rounded-xl text-sm text-white shadow-lg ${
            toast.type === 'error' ? 'bg-rose-600' : toast.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'
          }`}>
            {toast.message}
          </div>
        ) : null}
      </div>
    </div>
  )
}
