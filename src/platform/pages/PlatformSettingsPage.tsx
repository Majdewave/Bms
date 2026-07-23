import { useEffect, useState, type ReactNode } from 'react'
import { BadgeDollarSign, CalendarClock, MessageSquare, Save, Settings2, ToggleLeft } from 'lucide-react'
import { fetchPlatformSettings, updatePlatformSettings, type PlatformSettings } from '@/platform/settings/services/platformSettingsService'
import { PlatformApiError } from '@/platform/services/platformApiClient'
import ErrorState from '@/platform/components/ui/ErrorState'

const tabOrder = ['general', 'trial', 'plans', 'features'] as const

type SettingsTab = typeof tabOrder[number]

const tabMeta: Record<SettingsTab, { label: string; icon: typeof Settings2 }> = {
  general: { label: 'SUPPORT', icon: MessageSquare },
  trial: { label: 'TRIAL', icon: CalendarClock },
  plans: { label: 'PLANS', icon: BadgeDollarSign },
  features: { label: 'FEATURE FLAGS', icon: ToggleLeft },
}

const defaultSettings: PlatformSettings = {
  id: '',
  supportEmail: 'support@clienta.digitalpenpro.com',
  supportPhone: null,
  websiteUrl: 'https://clienta.digitalpenpro.com',
  defaultTrialDays: 21,
  trialReminderDays: 3,
  allowRegistrations: true,
  requireManualApproval: true,
  enableBilling: true,
  enableHelpCenter: true,
  whatsappEnabled: false,
  proMonthlyPrice: 46,
  proAnnualPrice: 460,
  proDescription: 'Clienta Pro for growing teams',
  proEnabled: true,
  proDisplayOrder: 1,
  updatedAt: new Date(0).toISOString(),
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="platform-field">
      <span className="platform-field-label">{label}</span>
      {children}
      {hint && <span className="platform-field-hint">{hint}</span>}
    </label>
  )
}

function SectionCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="platform-card platform-section-card platform-settings-section">
      <header className="platform-section-header">
        <h3 className="platform-section-title">{title}</h3>
      </header>
      <div className="platform-settings-grid">{children}</div>
    </section>
  )
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchPlatformSettings(controller.signal)
        setSettings(result)
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof PlatformApiError ? err.message : 'Could not load settings.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  const update = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setMessage('')

    try {
      const updated = await updatePlatformSettings(settings)
      setSettings(updated)
      setMessage('Settings saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="platform-page"><div className="skeleton h-72 w-full" /></div>
  }

  if (error && !settings.id) {
    return <ErrorState title="Could not load platform settings" description={error} onRetry={() => window.location.reload()} />
  }

  return (
    <div className="platform-page">
      <header className="platform-page-header">
        <div>
          <h2 className="platform-page-title">Platform Configuration</h2>
          <p className="platform-page-subtitle">Single source of truth for support, trial access, plan pricing, and global feature flags.</p>
        </div>
        <button type="button" className="platform-button-primary" onClick={() => void save()} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      <div className="platform-settings-layout">
        <aside className="platform-settings-nav">
          {tabOrder.map((section) => {
            const meta = tabMeta[section]
            const Icon = meta.icon

            return (
              <button
                key={section}
                type="button"
                className={`platform-settings-nav-item ${activeTab === section ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab(section)
                  document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{meta.label}</span>
              </button>
            )
          })}
        </aside>

        <div className="space-y-5">
          {message && <div className="platform-inline-message platform-inline-message-success">{message}</div>}
          {error && <div className="platform-inline-message platform-inline-message-error">{error}</div>}

          <SectionCard id="general" title="SUPPORT">
            <Field label="Support Email">
              <input className="input" type="email" value={settings.supportEmail} onChange={(event) => update('supportEmail', event.target.value)} />
            </Field>
            <Field label="Support Phone">
              <input className="input" value={settings.supportPhone ?? ''} onChange={(event) => update('supportPhone', event.target.value || null)} />
            </Field>
            <Field label="Website URL">
              <input className="input" value={settings.websiteUrl ?? ''} onChange={(event) => update('websiteUrl', event.target.value || null)} />
            </Field>
          </SectionCard>

          <SectionCard id="trial" title="TRIAL">
            <Field label="Default Trial Days">
              <input className="input" type="number" min={0} value={settings.defaultTrialDays} onChange={(event) => update('defaultTrialDays', Number(event.target.value))} />
            </Field>
            <Field label="Trial Reminder Days">
              <input className="input" type="number" min={0} value={settings.trialReminderDays} onChange={(event) => update('trialReminderDays', Number(event.target.value))} />
            </Field>
            <Field label="Registrations Enabled">
              <input type="checkbox" checked={settings.allowRegistrations} onChange={(event) => update('allowRegistrations', event.target.checked)} />
            </Field>
            <Field label="Manual Approval Required">
              <input type="checkbox" checked={settings.requireManualApproval} onChange={(event) => update('requireManualApproval', event.target.checked)} />
            </Field>
          </SectionCard>

          <SectionCard id="plans" title="PLANS">
            <Field label="Plan Name">
              <input className="input" value="Pro" disabled />
            </Field>
            <Field label="Plan Description">
              <input className="input" value={settings.proDescription} onChange={(event) => update('proDescription', event.target.value)} />
            </Field>
            <Field label="Monthly Price">
              <input className="input" type="number" min={0} step="0.01" value={settings.proMonthlyPrice} onChange={(event) => update('proMonthlyPrice', Number(event.target.value))} />
            </Field>
            <Field label="Annual Price">
              <input className="input" type="number" min={0} step="0.01" value={settings.proAnnualPrice} onChange={(event) => update('proAnnualPrice', Number(event.target.value))} />
            </Field>
            <Field label="Plan Enabled">
              <input type="checkbox" checked={settings.proEnabled} onChange={(event) => update('proEnabled', event.target.checked)} />
            </Field>
            <Field label="Display Order">
              <input className="input" type="number" min={1} value={settings.proDisplayOrder} onChange={(event) => update('proDisplayOrder', Number(event.target.value))} />
            </Field>
            <Field label="Billing Enabled">
              <input type="checkbox" checked={settings.enableBilling} onChange={(event) => update('enableBilling', event.target.checked)} />
            </Field>
          </SectionCard>

          <SectionCard id="features" title="FEATURE FLAGS">
            <Field label="Help Center Enabled">
              <input type="checkbox" checked={settings.enableHelpCenter} onChange={(event) => update('enableHelpCenter', event.target.checked)} />
            </Field>
            <Field label="WhatsApp Enabled">
              <input type="checkbox" checked={settings.whatsappEnabled} onChange={(event) => update('whatsappEnabled', event.target.checked)} />
            </Field>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}