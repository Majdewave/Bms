import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Sliders, CheckCircle, X, BarChart2, Receipt, Pill, Database, Image as ImageIcon } from 'lucide-react'
import * as apiClient from '@/api/apiClient'
import type { Features } from '@/contexts/FeatureContext'
import { useFeatures } from '@/contexts/FeatureContext'

const defaultFeatures: Features = {
  reportsEnabled: true,
  invoicesEnabled: true,
  prescriptionsEnabled: true,
  drugsEnabled: false,
  beforeAfterPhotosEnabled: false,
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled: boolean
}

function ToggleRow({ label, description, checked, onChange, disabled, icon }: ToggleRowProps & { icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 bg-transparent">
      <div className="flex items-center gap-3 flex-1 pe-4">
        <span>{icon}</span>
        <div>
          <p className="text-base font-medium leading-6 text-slate-800">{label}</p>
          <p className="text-sm leading-6 text-slate-500 mt-1">{description}</p>
        </div>
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
      .then((data) =>
        setSettings({
          reportsEnabled: data.reportsEnabled ?? true,
          invoicesEnabled: data.invoicesEnabled ?? true,
          prescriptionsEnabled: data.prescriptionsEnabled ?? true,
          drugsEnabled: data.drugsEnabled ?? false,
          beforeAfterPhotosEnabled: data.beforeAfterPhotosEnabled ?? false,
        })
      )
      .catch(() => {})
  }, [])

  const handleToggle = async (key: keyof Features, value: boolean) => {
    const updated: Features = {
      reportsEnabled: key === 'reportsEnabled' ? value : settings.reportsEnabled,
      invoicesEnabled: key === 'invoicesEnabled' ? value : settings.invoicesEnabled,
      prescriptionsEnabled:
        key === 'prescriptionsEnabled' ? value : settings.prescriptionsEnabled,
      drugsEnabled: key === 'drugsEnabled' ? value : settings.drugsEnabled,
      beforeAfterPhotosEnabled:
        key === 'beforeAfterPhotosEnabled' ? value : settings.beforeAfterPhotosEnabled,
    }

    setSettings(updated)
    setSaving(true)

    try {
      await apiClient.put('/api/features', updated)
      reload()

      setToastError(false)
      setToastMessage(isRTL ? 'ההגדרות נשמרו בהצלחה' : 'Settings saved successfully')
    } catch {
      setSettings(settings) // rollback
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center">
          <Sliders className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-[30px] font-bold text-gray-900 leading-tight">
            {t('features.title')}
          </h1>
          <p className="text-[16px] text-gray-500 mt-1">
            {t('features.subtitle')}
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-xl">
        <h2 className="text-lg font-semibold leading-7 text-slate-700 mb-2">
          {t('features.activeModules')}
        </h2>
        <p className="text-sm leading-6 text-slate-500 mb-4">
          {t('features.description')}
        </p>

        <ToggleRow
          label={t('features.reports')}
          description={t('features.reportsDesc') + ' - הצג את עמוד הדוחות בתפריט הניווט'}
          checked={settings.reportsEnabled}
          onChange={(val) => handleToggle('reportsEnabled', val)}
          disabled={saving}
          icon={<BarChart2 className="w-5 h-5 text-blue-400" />}
        />

        <ToggleRow
          label={t('features.invoices')}
          description={t('features.invoicesDesc') + ' - הצג את עמוד החשבוניות בתפריט הניווט'}
          checked={settings.invoicesEnabled}
          onChange={(val) => handleToggle('invoicesEnabled', val)}
          disabled={saving}
          icon={<Receipt className="w-5 h-5 text-green-400" />}
        />

        <ToggleRow
          label={t('features.prescriptions')}
          description={t('features.prescriptionsDesc') + ' - הצג את אפשרות כתיבת מרשם בפרופיל הלקוח'}
          checked={settings.prescriptionsEnabled}
          onChange={(val) => handleToggle('prescriptionsEnabled', val)}
          disabled={saving}
          icon={<Pill className="w-5 h-5 text-purple-400" />}
        />

        <ToggleRow
          label={t('features.drugs')}
          description={t('features.drugsDesc') + ' - הצג את מאגר התרופות במערכת'}
          checked={settings.drugsEnabled}
          onChange={(val) => handleToggle('drugsEnabled', val)}
          disabled={saving}
          icon={<Database className="w-5 h-5 text-indigo-400" />}
        />

        <ToggleRow
          label={t('features.beforeAfterPhotos')}
          description={t('features.beforeAfterPhotosDesc') + ' - הצג העלאת תמונות לפני ואחרי בפרופיל הלקוח'}
          checked={settings.beforeAfterPhotosEnabled}
          onChange={(val) => handleToggle('beforeAfterPhotosEnabled', val)}
          disabled={saving}
          icon={<ImageIcon className="w-5 h-5 text-pink-400" />}
        />
      </div>
    </div>
  )
}