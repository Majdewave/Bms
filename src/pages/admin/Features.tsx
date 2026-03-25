import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sliders, CheckCircle, X } from 'lucide-react'
import * as apiClient from '@/api/apiClient'
import type { Features } from '@/contexts/FeatureContext'
import { useFeatures } from '@/contexts/FeatureContext'

const defaultFeatures: Features = {
  reportsEnabled: true,
  invoicesEnabled: true,
  prescriptionsEnabled: true,
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled: boolean
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1 pe-4">
        <p className="font-medium text-slate-800">{label}</p>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 flex-shrink-0 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

export default function AdminFeatures() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'
  const { reload } = useFeatures()

  const [settings, setSettings] = useState<Features>(defaultFeatures)
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastError, setToastError] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    apiClient
      .get<Features>('/api/features')
      .then(setSettings)
      .catch(() => {})
  }, [])

  const handleToggle = async (key: keyof Features, value: boolean) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    setSaving(true)

    try {
      await apiClient.put('/api/features', updated)
      reload()
      setToastError(false)
      setToastMessage(isRTL ? 'ההגדרות נשמרו בהצלחה' : 'Settings saved successfully')
    } catch {
      // revert on error
      setSettings(settings)
      setToastError(true)
      setToastMessage(isRTL ? 'שגיאה בשמירת ההגדרות' : 'Failed to save settings')
    } finally {
      setSaving(false)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Toast */}
      {showToast && (
        <div
          className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${
            toastError ? 'bg-red-500' : 'bg-emerald-600'
          }`}
        >
          {toastError ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Sliders className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isRTL ? 'הגדרות תכונות' : t('nav.features', 'Feature Toggles')}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isRTL ? 'הפעל או בטל תכונות מערכת' : 'Enable or disable system features'}
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-xl">
        <h2 className="text-base font-semibold text-slate-700 mb-2">
          {isRTL ? 'מודולים פעילים' : 'Active modules'}
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          {isRTL
            ? 'שינויים יכנסו לתוקף מיד לכל המשתמשים'
            : 'Changes take effect immediately for all users'}
        </p>

        <ToggleRow
          label={isRTL ? 'דוחות' : 'Reports'}
          description={
            isRTL
              ? 'הצג את עמוד הדוחות בתפריט הניווט'
              : 'Show the Reports page in the navigation menu'
          }
          checked={settings.reportsEnabled}
          onChange={(val) => handleToggle('reportsEnabled', val)}
          disabled={saving}
        />

        <ToggleRow
          label={isRTL ? 'חשבוניות' : 'Invoices'}
          description={
            isRTL
              ? 'הצג את עמוד החשבוניות בתפריט הניווט'
              : 'Show the Invoices page in the navigation menu'
          }
          checked={settings.invoicesEnabled}
          onChange={(val) => handleToggle('invoicesEnabled', val)}
          disabled={saving}
        />

        <ToggleRow
          label={isRTL ? 'מרשמים' : 'Prescriptions'}
          description={
            isRTL
              ? 'הצג את אפשרות כתיבת מרשם בפרופיל הלקוח'
              : 'Show the prescription button in client profiles'
          }
          checked={settings.prescriptionsEnabled}
          onChange={(val) => handleToggle('prescriptionsEnabled', val)}
          disabled={saving}
        />
      </div>
    </div>
  )
}
