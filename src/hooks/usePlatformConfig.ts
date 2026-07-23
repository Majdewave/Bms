import { useEffect, useState } from 'react'
import { fetchPublicPlatformSettings, type PlatformSettings } from '@/platform/settings/services/platformSettingsService'

const fallbackConfig: PlatformSettings = {
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

export function usePlatformConfig() {
  const [config, setConfig] = useState<PlatformSettings>(fallbackConfig)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        const result = await fetchPublicPlatformSettings(controller.signal)
        setConfig(result)
      } catch {
        setConfig(fallbackConfig)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  return { config, loading }
}