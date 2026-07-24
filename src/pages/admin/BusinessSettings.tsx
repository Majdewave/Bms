import { useState, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BadgeCheck,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  CreditCard,
  FileText,
  Info,
  Palette,
  Percent,
  Receipt,
  ShieldAlert,
  Tv,
  ExternalLink,
  Copy,
  RefreshCw,
  MonitorSmartphone,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
import { Container, PageHeader } from '@/components/Layout'
import { getBusinessSettings, deleteBusinessStamp, uploadTenantLogo,  uploadBusinessStamp} from '@/api/businessSettings'
import DepartmentsSection from './DepartmentsSection'
import ServicesSection from './ServicesSection'
import type { Department } from '@/api/departmentService'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { useFeatures, type Features } from '@/contexts/FeatureContext'
import * as apiClient from '@/api/apiClient'
import { get, put, post, del } from '@/api/apiClient'
import {
  queueDisplayApi,
  QueueDisplayPrivacyMode,
  QueueDisplayTheme,
  type QueueDisplaySettings,
} from '@/api/queueDisplay'

interface TenantContactSettings {
  name?: string
  legalBusinessName?: string | null
  businessRegistrationNumber?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  whatsApp?: string | null
  logoUrl?: string | null
  businessStampUrl?: string | null
  defaultVatRate?: number | null
  defaultWithholdingTaxRate?: number | null
  currency?: 'ILS' | 'USD' | 'EUR' | string | null
  defaultPaymentMethod?: string | null
  defaultInstallments?: number | null
  defaultInvoiceStatus?: string | null
  invoicePrefix?: string | null
  nextInvoiceNumber?: number | null
  quotePrefix?: string | null
  nextQuoteNumber?: number | null
  autoDeleteNotDocumentedAfterDays?: number | null
  enableAutoDeleteNotDocumented?: boolean | null
}

type SectionCardProps = {
  title: string
  icon: ReactNode
  headerClassName: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

function SectionCard({ title, icon, headerClassName, isOpen, onToggle, children }: SectionCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${headerClassName}`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 text-start">
          <span className="inline-flex h-9 w-9 items-center justify-center text-white">
            {icon}
          </span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          {isOpen ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}

export default function BusinessSettings() {
  const { t, i18n } = useTranslation()
  const { user, hasPermission } = useAuth()
  const { setTenant } = useTenant()
  const { reload: reloadFeatures } = useFeatures()
  const isAdmin = user?.role === 'admin'
  const canManageDepartments = hasPermission('manage_business_settings')
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'
  const [formData, setFormData] = useState<{
    name: string
    legalBusinessName: string
    businessRegistrationNumber: string
    phone: string
    whatsApp: string
    defaultVatRate: string
    defaultWithholdingTaxRate: string
    currency: 'ILS' | 'USD' | 'EUR'
    defaultPaymentMethod: string
    defaultInstallments: string
    defaultInvoiceStatus: string
    invoicePrefix: string
    nextInvoiceNumber: string
    quotePrefix: string
    nextQuoteNumber: string
  }>({
    name: '',
    legalBusinessName: '',
    businessRegistrationNumber: '',
    phone: '',
    whatsApp: '',
    defaultVatRate: '18',
    defaultWithholdingTaxRate: '0',
    currency: 'ILS',
    defaultPaymentMethod: 'cash',
    defaultInstallments: '1',
    defaultInvoiceStatus: 'pending',
    invoicePrefix: 'INV-',
    nextInvoiceNumber: '1',
    quotePrefix: 'QT-',
    nextQuoteNumber: '1',
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [businessStampUrl, setBusinessStampUrl] = useState<string | null>(null)
  const [stampPreview, setStampPreview] = useState<string | null>(null)
  const [uploadingStamp, setUploadingStamp] = useState(false)
  const [deletingStamp, setDeletingStamp] = useState(false)
  const [logoVersion, setLogoVersion] = useState<number>(Date.now())
  const [pageLoading, setPageLoading] = useState(false)
  const [autoDeleteDays, setAutoDeleteDays] = useState(1)
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [featureSettings, setFeatureSettings] = useState<Features | null>(null)
  const [queueSettings, setQueueSettings] = useState<QueueDisplaySettings | null>(null)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueSaving, setQueueSaving] = useState(false)
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(12)
  const [slideshowEnabled, setSlideshowEnabled] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [openCards, setOpenCards] = useState({
    business: true,
    invoice: false,
    branding: false,
    departments: false,
    services: false,
    queueDisplay: false,
    autoDelete: false,
  })
  const [invoiceValidationErrors, setInvoiceValidationErrors] = useState<Partial<Record<
    'nextInvoiceNumber' | 'nextQuoteNumber' | 'defaultVatRate' | 'defaultWithholdingTaxRate' | 'defaultInstallments',
    string
  >>>({})

  const invoiceStatusLabelMap: Record<string, string> = {
    pending: '🟡 ממתין',
    paid: '🟢 שולם',
    partially_paid: '🟠 שולם חלקית',
    cancelled: '🔴 בוטל',
  }

  const paymentMethodLabelMap: Record<string, string> = {
    cash: '💵 מזומן',
    credit: '💳 אשראי',
    bank_transfer: '🏦 העברה בנקאית',
    check: "🧾 צ'ק",
    bit: '📱 BIT',
    paybox: '📲 PayBox',
    other: '📄 אחר',
  }

  const publicQueueUrl = queueSettings
    ? `${window.location.origin}/queue-display/${queueSettings.publicToken}`
    : ''

  const toggleCard = (key: keyof typeof openCards) => {
    setOpenCards((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const API_BASE = (import.meta as any).env.VITE_API_URL

  const getAbsoluteLogoUrl = (url: string) =>
    url.startsWith('http') ? url : `${API_BASE}${url}`

  const getCacheBustedLogoUrl = (url: string) => {
    const baseUrl = getAbsoluteLogoUrl(url)
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}v=${logoVersion}`
  }

  const loadFeatureSettings = async () => {
    try {
      const data = await apiClient.get<Features>('/api/features')
      setFeatureSettings(data)
      return data
    } catch (error) {
      console.error('Failed to load feature settings:', error)
      setFeatureSettings(null)
      return null
    }
  }

  const loadQueueSettings = async () => {
    if (!featureSettings?.queueDisplayEnabled) {
      setQueueSettings(null)
      return
    }

    setQueueLoading(true)
    try {
      const data = await queueDisplayApi.getSettings()
      setQueueSettings(data)
    } catch (error) {
      console.error('Failed to load queue display settings:', error)
      setQueueSettings(null)
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    void loadFeatureSettings()
  }, [])

  useEffect(() => {
    void loadQueueSettings()
  }, [featureSettings?.queueDisplayEnabled])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await get<TenantContactSettings>('/api/tenant/me')
        setAutoDeleteDays(res.autoDeleteNotDocumentedAfterDays ?? 1)
        setEnabled(res.enableAutoDeleteNotDocumented ?? true)
      } catch (e) {
        console.error(e)
      }
    }

    load()
  }, [])

  const loadSettings = async () => {
    setPageLoading(true)
    try {
      const [settings, tenant] = await Promise.all([
        getBusinessSettings(),
        apiClient.get<TenantContactSettings>('/api/tenant/me'),
      ])

      setFormData({
        name: settings.name,
        legalBusinessName: tenant?.legalBusinessName ?? settings.legalBusinessName ?? '',
        businessRegistrationNumber: tenant?.businessRegistrationNumber ?? settings.businessRegistrationNumber ?? '',
        phone: tenant?.phone ?? '',
        whatsApp: tenant?.whatsApp ?? '',
        defaultVatRate: String(tenant?.defaultVatRate ?? settings.defaultVatRate ?? 18),
        defaultWithholdingTaxRate: String(tenant?.defaultWithholdingTaxRate ?? settings.defaultWithholdingTaxRate ?? 0),
        currency: (tenant?.currency ?? settings.currency ?? 'ILS') as 'ILS' | 'USD' | 'EUR',
        defaultPaymentMethod: String(tenant?.defaultPaymentMethod ?? settings.defaultPaymentMethod ?? 'cash'),
        defaultInstallments: String(tenant?.defaultInstallments ?? settings.defaultInstallments ?? 1),
        defaultInvoiceStatus: String(tenant?.defaultInvoiceStatus ?? settings.defaultInvoiceStatus ?? 'pending'),
        invoicePrefix: settings.invoicePrefix ?? 'INV-',
        nextInvoiceNumber: String(settings.nextInvoiceNumber ?? 1),
        quotePrefix: settings.quotePrefix ?? 'QT-',
        nextQuoteNumber: String(settings.nextQuoteNumber ?? 1),
      })

      if (settings.logoUrl) {
        setLogoUrl(settings.logoUrl)
        setLogoPreview(settings.logoUrl)
        setLogoVersion(Date.now())

        if (settings.businessStampUrl) {
          setBusinessStampUrl(settings.businessStampUrl)
          setStampPreview(settings.businessStampUrl)
        }
        setTenant((prev) => ({
          ...prev,
          name: settings.name,
          legalBusinessName: tenant?.legalBusinessName ?? settings.legalBusinessName ?? '',
          businessRegistrationNumber: tenant?.businessRegistrationNumber ?? settings.businessRegistrationNumber ?? '',
          phone: tenant?.phone ?? '',
          whatsApp: tenant?.whatsApp ?? '',
          logoUrl: settings.logoUrl,
          businessStampUrl: settings.businessStampUrl,
          defaultVatRate: tenant?.defaultVatRate ?? settings.defaultVatRate ?? 18,
          defaultWithholdingTaxRate: tenant?.defaultWithholdingTaxRate ?? settings.defaultWithholdingTaxRate ?? 0,
          currency: tenant?.currency ?? settings.currency ?? 'ILS',
          defaultPaymentMethod: tenant?.defaultPaymentMethod ?? settings.defaultPaymentMethod ?? 'cash',
          defaultInstallments: tenant?.defaultInstallments ?? settings.defaultInstallments ?? 1,
          defaultInvoiceStatus: tenant?.defaultInvoiceStatus ?? settings.defaultInvoiceStatus ?? 'pending',
          invoicePrefix: settings.invoicePrefix ?? 'INV-',
          nextInvoiceNumber: settings.nextInvoiceNumber ?? 1,
          quotePrefix: settings.quotePrefix ?? 'QT-',
          nextQuoteNumber: settings.nextQuoteNumber ?? 1,
          autoDeleteNotDocumentedAfterDays: tenant?.autoDeleteNotDocumentedAfterDays ?? 1,
          enableAutoDeleteNotDocumented: tenant?.enableAutoDeleteNotDocumented ?? true,
        }))
      } else {
            if (settings.businessStampUrl) {
                setBusinessStampUrl(settings.businessStampUrl)
                setStampPreview(settings.businessStampUrl)
            }

        setTenant((prev) => ({
          ...prev,
          name: settings.name,
          legalBusinessName: tenant?.legalBusinessName ?? settings.legalBusinessName ?? '',
          businessRegistrationNumber: tenant?.businessRegistrationNumber ?? settings.businessRegistrationNumber ?? '',
          phone: tenant?.phone ?? '',
          whatsApp: tenant?.whatsApp ?? '',
          logoUrl: null,
          businessStampUrl: settings.businessStampUrl,
          defaultVatRate: tenant?.defaultVatRate ?? settings.defaultVatRate ?? 18,
          defaultWithholdingTaxRate: tenant?.defaultWithholdingTaxRate ?? settings.defaultWithholdingTaxRate ?? 0,
          currency: tenant?.currency ?? settings.currency ?? 'ILS',
          defaultPaymentMethod: tenant?.defaultPaymentMethod ?? settings.defaultPaymentMethod ?? 'cash',
          defaultInstallments: tenant?.defaultInstallments ?? settings.defaultInstallments ?? 1,
          defaultInvoiceStatus: tenant?.defaultInvoiceStatus ?? settings.defaultInvoiceStatus ?? 'pending',
          invoicePrefix: settings.invoicePrefix ?? 'INV-',
          nextInvoiceNumber: settings.nextInvoiceNumber ?? 1,
          quotePrefix: settings.quotePrefix ?? 'QT-',
          nextQuoteNumber: settings.nextQuoteNumber ?? 1,
          autoDeleteNotDocumentedAfterDays: tenant?.autoDeleteNotDocumentedAfterDays ?? 1,
          enableAutoDeleteNotDocumented: tenant?.enableAutoDeleteNotDocumented ?? true,
        }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      showToastNotification(t('admin.settings.saveError'))
    } finally {
      setPageLoading(false)
    }
  }


  const handleStampDelete = async () => {
    if (!window.confirm('האם למחוק את חתימת העסק?')) {
      return
    }

    setDeletingStamp(true)

    try {
      await deleteBusinessStamp()

      setBusinessStampUrl(null)
      setStampPreview(null)

      setTenant(prev => ({
        ...prev,
        businessStampUrl: null
      }))

      showToastNotification('חתימת העסק הוסרה')
    } catch (err) {
      console.error(err)
      showToastNotification('אירעה שגיאה')
    } finally {
      setDeletingStamp(false)
    }
  }


  
  const handleStampUpload = async (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0]
  if (!file) return

  setUploadingStamp(true)

  try {
    const result = await uploadBusinessStamp(file)

    if (result.businessStampUrl) {
      setBusinessStampUrl(result.businessStampUrl)
      setStampPreview(result.businessStampUrl)
    }

    showToastNotification(t('admin.settings.saveSuccess'))
  } catch (err) {
    console.error(err)
    showToastNotification(t('admin.settings.saveError'))
  } finally {
    setUploadingStamp(false)
    e.target.value = ''
  }
}


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name in invoiceValidationErrors) {
      setInvoiceValidationErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      showToastNotification(t('admin.settings.invalidImageType'))
      e.target.value = ''
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      showToastNotification(t('admin.settings.imageTooLarge'))
      return
    }

    setUploadingLogo(true)
    try {
      const result = await uploadTenantLogo(file)
      const nextLogoUrl = result.logoUrl ?? logoUrl
      if (nextLogoUrl) {
        setLogoUrl(nextLogoUrl)
        setLogoPreview(nextLogoUrl)
        const nextVersion = Date.now()
        const cacheBustedLogoUrl = `${nextLogoUrl}${nextLogoUrl.includes('?') ? '&' : '?'}v=${nextVersion}`
        setLogoVersion(nextVersion)
        setTenant((prev) => ({
          ...prev,
          logoUrl: cacheBustedLogoUrl,
        }))
      }
      showToastNotification(t('admin.settings.saveSuccess'))
    } catch (error) {
      console.error('Failed to upload logo:', error)
      showToastNotification(t('admin.settings.saveError'))
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleLogoDelete = async () => {
    if (!logoUrl) return

    setDeletingLogo(true)
    try {
      await del('/api/tenant/logo')
      setLogoUrl(null)
      setLogoPreview(null)
      setLogoVersion(Date.now())
      setTenant((prev) => ({
        ...prev,
        logoUrl: null,
      }))
      showToastNotification(t('admin.settings.saveSuccess'))
    } catch (error) {
      console.error('Failed to delete logo:', error)
      showToastNotification(t('admin.settings.saveError'))
    } finally {
      setDeletingLogo(false)
    }
  }

  const showToastNotification = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const openQueueDisplay = () => {
    if (!publicQueueUrl) {
      return
    }

    window.open(publicQueueUrl, '_blank', 'noopener,noreferrer')
  }

  const copyQueueDisplayLink = async () => {
    if (!publicQueueUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(publicQueueUrl)
      showToastNotification(t('queueDisplay.linkCopied'))
    } catch {
      showToastNotification(t('queueDisplay.linkCopyFailed'))
    }
  }

  const toggleQueueDisplayFeature = async (enabled: boolean) => {
    if (!featureSettings) {
      return
    }

    setQueueSaving(true)
    const previous = featureSettings
    const updated = { ...featureSettings, queueDisplayEnabled: enabled }
    setFeatureSettings(updated)

    try {
      await apiClient.put('/api/features', updated)
      reloadFeatures()
      showToastNotification(t('queueDisplay.featureSaved'))
      if (!enabled) {
        setQueueSettings(null)
      }
    } catch (error) {
      console.error('Failed to update queue display feature:', error)
      setFeatureSettings(previous)
      showToastNotification(t('queueDisplay.featureSaveFailed'))
    } finally {
      setQueueSaving(false)
    }
  }

  const saveQueueDisplaySettings = async () => {
    if (!queueSettings) {
      return
    }

    setQueueSaving(true)
    try {
      const updated = await queueDisplayApi.updateSettings({
        privacyMode: queueSettings.privacyMode,
        theme: queueSettings.theme,
        logoOverrideUrl: queueSettings.logoOverrideUrl,
        advertisementImageUrl: queueSettings.advertisementImageUrl,
      })
      setQueueSettings(updated)
      showToastNotification(t('queueDisplay.settingsSaved'))
    } catch (error) {
      console.error('Failed to save queue display settings:', error)
      showToastNotification(t('queueDisplay.settingsSaveFailed'))
    } finally {
      setQueueSaving(false)
    }
  }

  const regenerateQueueDisplayToken = async () => {
    setQueueSaving(true)
    try {
      const updated = await queueDisplayApi.regenerateToken()
      setQueueSettings(updated)
      showToastNotification(t('queueDisplay.regenerated'))
    } catch (error) {
      console.error('Failed to regenerate queue display token:', error)
      showToastNotification(t('queueDisplay.regenerateFailed'))
    } finally {
      setQueueSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const validationErrors: Partial<Record<
      'nextInvoiceNumber' | 'nextQuoteNumber' | 'defaultVatRate' | 'defaultWithholdingTaxRate' | 'defaultInstallments',
      string
    >> = {}

    const parsedNextInvoiceNumber = Number(formData.nextInvoiceNumber)
    const parsedNextQuoteNumber = Number(formData.nextQuoteNumber)
    const parsedDefaultVatRate = Number(formData.defaultVatRate)
    const parsedDefaultWithholdingTaxRate = Number(formData.defaultWithholdingTaxRate)
    const parsedDefaultInstallments = Number(formData.defaultInstallments)

    if (!Number.isFinite(parsedNextInvoiceNumber) || parsedNextInvoiceNumber < 1) {
      validationErrors.nextInvoiceNumber = 'מספר החשבונית הבא חייב להיות 1 ומעלה'
    }

    if (!Number.isFinite(parsedNextQuoteNumber) || parsedNextQuoteNumber < 1) {
      validationErrors.nextQuoteNumber = 'מספר הצעת המחיר הבא חייב להיות 1 ומעלה'
    }

    if (!Number.isFinite(parsedDefaultVatRate) || parsedDefaultVatRate < 0 || parsedDefaultVatRate > 100) {
      validationErrors.defaultVatRate = 'מע"מ ברירת מחדל חייב להיות בין 0 ל-100'
    }

    if (
      !Number.isFinite(parsedDefaultWithholdingTaxRate) ||
      parsedDefaultWithholdingTaxRate < 0 ||
      parsedDefaultWithholdingTaxRate > 100
    ) {
      validationErrors.defaultWithholdingTaxRate = 'ניכוי מס במקור חייב להיות בין 0 ל-100'
    }

    if (
      formData.defaultPaymentMethod === 'credit' &&
      (!Number.isFinite(parsedDefaultInstallments) || parsedDefaultInstallments < 1 || parsedDefaultInstallments > 36)
    ) {
      validationErrors.defaultInstallments = 'מספר תשלומים חייב להיות בין 1 ל-36'
    }

    if (Object.values(validationErrors).some(Boolean)) {
      setInvoiceValidationErrors(validationErrors)
      setSaving(false)
      return
    }

    setInvoiceValidationErrors({})

    try {
      await apiClient.put('/api/tenant/me', {
        name: formData.name,
        legalBusinessName: formData.legalBusinessName,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        logoUrl: logoUrl,
        businessStampUrl: businessStampUrl,
        phone: formData.phone,
        whatsApp: formData.whatsApp,
        defaultVatRate: Number(formData.defaultVatRate) || 18,
        defaultWithholdingTaxRate: Number(formData.defaultWithholdingTaxRate) || 0,
        currency: formData.currency,
        defaultPaymentMethod: formData.defaultPaymentMethod,
        defaultInstallments: formData.defaultPaymentMethod === 'credit' ? Number(formData.defaultInstallments) || 1 : 1,
        defaultInvoiceStatus: formData.defaultInvoiceStatus,
        invoicePrefix: formData.invoicePrefix,
        nextInvoiceNumber: Number(formData.nextInvoiceNumber),
        quotePrefix: formData.quotePrefix,
        nextQuoteNumber: Number(formData.nextQuoteNumber),
      })

      await put('/api/tenant/auto-delete-setting', {
        days: autoDeleteDays,
        enabled: enabled,
      })

      setTenant((prev) => ({
        ...(prev ?? {}),
        name: formData.name,
        legalBusinessName: formData.legalBusinessName,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        phone: formData.phone,
        whatsApp: formData.whatsApp,
        defaultVatRate: Number(formData.defaultVatRate) || 18,
        defaultWithholdingTaxRate: Number(formData.defaultWithholdingTaxRate) || 0,
        currency: formData.currency,
        defaultPaymentMethod: formData.defaultPaymentMethod,
        defaultInstallments: formData.defaultPaymentMethod === 'credit' ? Number(formData.defaultInstallments) || 1 : 1,
        defaultInvoiceStatus: formData.defaultInvoiceStatus,
        invoicePrefix: formData.invoicePrefix,
        nextInvoiceNumber: Number(formData.nextInvoiceNumber),
        quotePrefix: formData.quotePrefix,
        nextQuoteNumber: Number(formData.nextQuoteNumber),
        logoUrl,
        businessStampUrl,
        autoDeleteNotDocumentedAfterDays: autoDeleteDays,
        enableAutoDeleteNotDocumented: enabled,
      }))

      showToastNotification(t('admin.settings.saveSuccess'))
    } catch (error) {
      console.error('Failed to save settings:', error)
      showToastNotification(t('admin.settings.saveError'))
    } finally {
      setSaving(false)
    }
  }


  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <Container maxWidth="lg">
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('admin.settings.title')}
          description={t('admin.settings.description')}
        />

        {showToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{toastMessage}</p>
              <button
                onClick={() => setShowToast(false)}
                className="ml-auto hover:bg-green-700 rounded p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-8">
          <div className="order-1 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg">
            <button
              type="button"
              onClick={() => toggleCard('business')}
              className="w-full px-6 py-4 bg-blue-700 hover:bg-blue-800 transition-colors flex items-center justify-between"
              aria-expanded={openCards.business}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-semibold text-white">
                  {t('admin.settings.businessDetails')}
                </h2>
              </div>
              <span className={`transition-transform duration-300 ${openCards.business ? 'rotate-180' : ''}`}>
                {openCards.business ? (
                  <ChevronUp className="w-5 h-5 text-white" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white" />
                )}
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                openCards.business ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-6 space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    {t('admin.settings.businessName')}
                    <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={t('admin.settings.businessNamePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm mb-1">טלפון</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">וואטסאפ</label>
                  <input
                    name="whatsApp"
                    value={formData.whatsApp}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>

              </div>
            </div>
            </div>
          </div>

          <div className="order-3 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg">
            <button
              type="button"
              onClick={() => toggleCard('invoice')}
              className="w-full px-6 py-4 bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center justify-between"
              aria-expanded={openCards.invoice}
            >
              <div className="flex items-center gap-3 text-start">
                <span className="inline-flex h-9 w-9 items-center justify-center text-white">
                  <Receipt className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">הגדרות חשבונית</h2>
                  <p className="text-sm text-emerald-50 mt-1">הגדרות ברירת מחדל עבור כל החשבוניות במערכת</p>
                </div>
              </div>
              <span className={`transition-transform duration-300 ${openCards.invoice ? 'rotate-180' : ''}`}>
                {openCards.invoice ? (
                  <ChevronUp className="w-5 h-5 text-white" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white" />
                )}
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                openCards.invoice ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
            <div className="p-6 space-y-6">
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  פרטי העסק
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        שם חברה / ישות משפטית
                        <span title="שם הישות המשפטית שיודפס כברירת מחדל על חשבוניות חדשות">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <input
                      name="legalBusinessName"
                      value={formData.legalBusinessName}
                      onChange={handleChange}
                      placeholder={'סלמאן שירותי רפואה בע"מ'}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-slate-500" />
                        ח.פ / עוסק מורשה
                        <span title="מספר הרישום העסקי שיופיע על החשבונית">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <input
                      name="businessRegistrationNumber"
                      value={formData.businessRegistrationNumber}
                      onChange={handleChange}
                      placeholder="516662921"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-4">
                <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  מספור ומיסוי
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-purple-600" />
                        קידומת חשבונית
                        <span title="טקסט שיתווסף לפני מספר החשבונית (למשל INV-)">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <input
                      name="invoicePrefix"
                      value={formData.invoicePrefix}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        מספר החשבונית הבא
                        <span title="מספר החשבונית שישמש ליצירת החשבונית הבאה">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <input
                      name="nextInvoiceNumber"
                      type="number"
                      min="1"
                      value={formData.nextInvoiceNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {invoiceValidationErrors.nextInvoiceNumber && (
                      <p className="text-xs text-red-600 mt-1">{invoiceValidationErrors.nextInvoiceNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-purple-600" />
                        קידומת הצעת מחיר
                      </span>
                    </label>
                    <input
                      name="quotePrefix"
                      value={formData.quotePrefix}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        מספר הצעת מחיר הבא
                      </span>
                    </label>
                    <input
                      name="nextQuoteNumber"
                      type="number"
                      min="1"
                      value={formData.nextQuoteNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {invoiceValidationErrors.nextQuoteNumber && (
                      <p className="text-xs text-red-600 mt-1">{invoiceValidationErrors.nextQuoteNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-green-600" />
                        מטבע
                        <span title="המטבע שיוצע כברירת מחדל בעת יצירת חשבונית">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          currency: e.target.value as 'ILS' | 'USD' | 'EUR',
                        }))
                      }
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ILS">ILS (₪)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Percent className="w-4 h-4 text-green-600" />
                        {t('admin.settings.defaultVatRate')}
                        <span title={'אחוז המע"מ שיוצע כברירת מחדל בחשבוניות חדשות'}>
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>

                    <div className="relative">
                      <input
                        name="defaultVatRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.defaultVatRate}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 pr-8 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                    </div>
                    {invoiceValidationErrors.defaultVatRate && (
                      <p className="text-xs text-red-600 mt-1">{invoiceValidationErrors.defaultVatRate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Percent className="w-4 h-4 text-orange-500" />
                        ניכוי מס במקור (%)
                        <span title="אחוז ניכוי מס במקור שיוצע כברירת מחדל בחשבוניות חדשות">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <input
                      name="defaultWithholdingTaxRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.defaultWithholdingTaxRate}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {invoiceValidationErrors.defaultWithholdingTaxRate && (
                      <p className="text-xs text-red-600 mt-1">{invoiceValidationErrors.defaultWithholdingTaxRate}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-4">
                <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-600" />
                  תשלום
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-orange-600" />
                        אופן תשלום ברירת מחדל
                        <span title="יוצג כברירת מחדל בעת יצירת חשבונית חדשה">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <select
                      name="defaultPaymentMethod"
                      value={formData.defaultPaymentMethod}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="cash">מזומן</option>
                      <option value="credit">אשראי</option>
                      <option value="bank_transfer">העברה בנקאית</option>
                      <option value="check">צ'ק</option>
                      <option value="bit">BIT</option>
                      <option value="paybox">PayBox</option>
                      <option value="other">אחר</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-orange-600" />
                        מספר תשלומים ברירת מחדל
                        <span title="רלוונטי רק כאשר אופן התשלום הוא אשראי">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <input
                      name="defaultInstallments"
                      type="number"
                      min="1"
                      max="36"
                      value={formData.defaultInstallments}
                      onChange={handleChange}
                      disabled={formData.defaultPaymentMethod !== 'credit'}
                      className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        formData.defaultPaymentMethod !== 'credit'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : ''
                      }`}
                    />
                    {invoiceValidationErrors.defaultInstallments && (
                      <p className="text-xs text-red-600 mt-1">{invoiceValidationErrors.defaultInstallments}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm mb-1 text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <CircleDollarSign className="w-4 h-4 text-green-700" />
                        סטטוס ברירת מחדל לחשבונית
                        <span title="הסטטוס שיוצע כברירת מחדל בחשבוניות חדשות">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                        </span>
                      </span>
                    </label>
                    <select
                      name="defaultInvoiceStatus"
                      value={formData.defaultInvoiceStatus}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="pending">ממתין לתשלום</option>
                      <option value="paid">שולם</option>
                      <option value="partially_paid">שולם חלקית</option>
                      <option value="cancelled">בוטל</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-slate-500" />
                  תצוגה מקדימה
                </div>
                <div className="space-y-1.5 text-sm text-slate-700">
                  <p className="text-lg font-bold text-indigo-600 tracking-wide">
                    {formData.invoicePrefix}{formData.nextInvoiceNumber}
                  </p>
                  <p>סטטוס: {invoiceStatusLabelMap[formData.defaultInvoiceStatus] ?? '🟡 ממתין'}</p>
                  <p>אופן תשלום: {paymentMethodLabelMap[formData.defaultPaymentMethod] ?? '💵 מזומן'}</p>
                  <p>{Math.max(1, Number(formData.defaultInstallments) || 1)} תשלומים</p>
                  <p>מע"מ: {formData.defaultVatRate || '0'}%</p>
                  <p>ניכוי מס: {formData.defaultWithholdingTaxRate || '0'}%</p>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="order-2 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg">
            <button
              type="button"
              onClick={() => toggleCard('branding')}
              className="w-full px-6 py-4 flex items-center justify-between bg-violet-700 hover:bg-violet-800 transition-colors"
              aria-expanded={openCards.branding}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center text-white">
                  <Palette className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-semibold text-white">
                  {t('admin.settings.branding')}
                </h2>
              </div>
              <span className={`transition-transform duration-300 ${openCards.branding ? 'rotate-180' : ''}`}>
                {openCards.branding ? (
                  <ChevronUp className="w-5 h-5 text-white" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white" />
                )}
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                openCards.branding ? 'max-h-[2500px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-slate-500" />
                  {t('admin.settings.logo')}
                </div>
              </label>

              <div className="flex flex-col items-center gap-3">
                {logoPreview ? (
                  <div className="w-full p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-center bg-white rounded-lg p-6 border border-slate-200">
                      <img
                        src={getCacheBustedLogoUrl(logoPreview)}
                        alt="Business logo"
                        className="max-w-full max-h-48 object-contain transition-transform duration-300 hover:scale-105"
                        style={{ maxHeight: '220px', borderBottom: 0 }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">{t('settings.noLogo')}</div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    disabled={deletingLogo || uploadingLogo || !logoPreview}
                    className="px-4 py-2 rounded-lg text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingLogo ? t('common.deleting') : t('settings.deleteLogo')}
                  </button>

                  <label
                    htmlFor="logo-upload"
                    className={`px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white rounded-md cursor-pointer hover:bg-indigo-700 ${
                      uploadingLogo || deletingLogo ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {uploadingLogo ? t('common.uploading') : t('settings.uploadLogo')}
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo || deletingLogo}
                      hidden
                    />
                  </label>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {t('admin.settings.logoHelper')}
              </p>

              <hr className="my-8" />

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                חתימת העסק
              </label>

                <div className="flex flex-col items-center gap-3">

                  {stampPreview ? (
                    <div className="w-full p-4 bg-slate-50 rounded-lg border">
                      <div className="flex justify-center bg-white p-6 rounded-lg">
                      <img
                          src={getAbsoluteLogoUrl(stampPreview)}
                          alt="Business Stamp"
                          className="max-h-28 object-contain"
                      />
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      לא הועלתה חתימה
                    </div>
                  )}


                  <div className="flex items-center justify-center gap-3 mt-2">
                    <label
                      htmlFor="stamp-upload"
                      className={`px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 ${
                        uploadingStamp || deletingStamp
                          ? 'opacity-50 pointer-events-none'
                          : ''
                      }`}
                    >
                      {uploadingStamp ? 'מעלה...' : 'העלה חתימה'}

                      <input
                        id="stamp-upload"
                        type="file"
                        hidden
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleStampUpload}
                        disabled={uploadingStamp || deletingStamp}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleStampDelete}
                      disabled={!stampPreview || deletingStamp || uploadingStamp}
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingStamp ? 'מוחק...' : 'מחק חתימה'}
                    </button>

                  </div>
                </div>

            </div>
            </div>
          </div>

          <div className="order-4 mt-0">
            <DepartmentsSection
              canManageDepartments={canManageDepartments}
              isOpen={openCards.departments}
              onToggle={() => toggleCard('departments')}
              onDepartmentsLoaded={setDepartments}
            />
          </div>
          <div className="order-5 mt-0">
            <ServicesSection
              isAdmin={isAdmin}
              departments={departments}
              isOpen={openCards.services}
              onToggle={() => toggleCard('services')}
            />
          </div>
          <div className="order-6 mt-0">
            <SectionCard
              title={t('queueDisplay.settingsTitle')}
              icon={<Tv className="w-5 h-5" />}
              headerClassName="bg-cyan-700 hover:bg-cyan-800"
              isOpen={openCards.queueDisplay}
              onToggle={() => toggleCard('queueDisplay')}
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-cyan-900">{t('queueDisplay.enableTitle')}</p>
                    <p className="text-xs text-cyan-700 mt-1">{t('queueDisplay.enableDescription')}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={featureSettings?.queueDisplayEnabled === true}
                    disabled={queueSaving || !featureSettings}
                    onClick={() => toggleQueueDisplayFeature(!(featureSettings?.queueDisplayEnabled === true))}
                    className={`relative h-7 w-14 rounded-full transition ${featureSettings?.queueDisplayEnabled ? 'bg-cyan-600' : 'bg-slate-300'} disabled:opacity-60`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${featureSettings?.queueDisplayEnabled ? 'translate-x-8 rtl:-translate-x-8' : 'translate-x-1 rtl:-translate-x-1'}`}
                    />
                  </button>
                </div>

                {!featureSettings?.queueDisplayEnabled && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {t('queueDisplay.disabledHint')}
                  </div>
                )}

                {featureSettings?.queueDisplayEnabled && (
                  <>
                    {queueLoading && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {t('queueDisplay.loading')}
                      </div>
                    )}

                    {!queueLoading && queueSettings && (
                      <>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{t('queueDisplay.publicUrl')}</p>
                          <input
                            readOnly
                            value={publicQueueUrl}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                          />

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={openQueueDisplay}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t('queueDisplay.openDisplay')}
                            </button>

                            <button
                              type="button"
                              onClick={copyQueueDisplayLink}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <Copy className="h-4 w-4" />
                              {t('queueDisplay.copyLink')}
                            </button>

                            <button
                              type="button"
                              onClick={regenerateQueueDisplayToken}
                              disabled={queueSaving}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                            >
                              <RefreshCw className="h-4 w-4" />
                              {t('queueDisplay.regenerateLink')}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="text-sm text-slate-700">
                            {t('queueDisplay.theme')}
                            <select
                              value={queueSettings.theme}
                              onChange={(e) => setQueueSettings({ ...queueSettings, theme: Number(e.target.value) as QueueDisplayTheme })}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value={QueueDisplayTheme.Default}>{t('queueDisplay.themeDefault')}</option>
                              <option value={QueueDisplayTheme.Light}>{t('queueDisplay.themeLight')}</option>
                              <option value={QueueDisplayTheme.Dark}>{t('queueDisplay.themeDark')}</option>
                              <option value={QueueDisplayTheme.Blue}>{t('queueDisplay.themeBlue')}</option>
                            </select>
                          </label>

                          <label className="text-sm text-slate-700">
                            {t('queueDisplay.privacyMode')}
                            <select
                              value={queueSettings.privacyMode}
                              onChange={(e) => setQueueSettings({ ...queueSettings, privacyMode: Number(e.target.value) as QueueDisplayPrivacyMode })}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            >
                              <option value={QueueDisplayPrivacyMode.FullName}>{t('queueDisplay.privacyFullName')}</option>
                              <option value={QueueDisplayPrivacyMode.FirstNameOnly}>{t('queueDisplay.privacyFirstName')}</option>
                              <option value={QueueDisplayPrivacyMode.QueueNumberOnly}>{t('queueDisplay.privacyQueueOnly')}</option>
                            </select>
                          </label>

                          <label className="text-sm text-slate-700">
                            {t('queueDisplay.refreshInterval')}
                            <input
                              type="number"
                              min={5}
                              max={60}
                              value={refreshIntervalSeconds}
                              onChange={(e) => setRefreshIntervalSeconds(Number(e.target.value) || 12)}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                            <span className="mt-1 block text-xs text-slate-500">{t('queueDisplay.refreshIntervalHint')}</span>
                          </label>

                          <label className="text-sm text-slate-700">
                            {t('queueDisplay.slideshow')}
                            <div className="mt-1 flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-3 py-2">
                              <span className="text-xs text-slate-600">{t('queueDisplay.slideshowHint')}</span>
                              <input
                                type="checkbox"
                                checked={slideshowEnabled}
                                onChange={(e) => setSlideshowEnabled(e.target.checked)}
                                className="h-4 w-4"
                              />
                            </div>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-sm font-medium text-slate-800">{t('queueDisplay.logoOverride')}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                                <Upload className="h-4 w-4" />
                                {t('queueDisplay.uploadLogo')}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    setQueueSaving(true)
                                    try {
                                      const updated = await queueDisplayApi.uploadLogoOverride(file)
                                      setQueueSettings(updated)
                                      showToastNotification(t('queueDisplay.logoUploaded'))
                                    } catch (error) {
                                      console.error('Failed to upload logo override:', error)
                                      showToastNotification(t('queueDisplay.logoUploadFailed'))
                                    } finally {
                                      e.target.value = ''
                                      setQueueSaving(false)
                                    }
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                disabled={queueSaving || !queueSettings.logoOverrideUrl}
                                onClick={async () => {
                                  setQueueSaving(true)
                                  try {
                                    const updated = await queueDisplayApi.deleteLogoOverride()
                                    setQueueSettings(updated)
                                    showToastNotification(t('queueDisplay.logoRemoved'))
                                  } catch (error) {
                                    console.error('Failed to delete logo override:', error)
                                    showToastNotification(t('queueDisplay.logoRemoveFailed'))
                                  } finally {
                                    setQueueSaving(false)
                                  }
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                              >
                                {t('queueDisplay.remove')}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-sm font-medium text-slate-800">{t('queueDisplay.advertisement')}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                                <MonitorSmartphone className="h-4 w-4" />
                                {t('queueDisplay.uploadAdvertisement')}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    setQueueSaving(true)
                                    try {
                                      const updated = await queueDisplayApi.uploadAdvertisementImage(file)
                                      setQueueSettings(updated)
                                      showToastNotification(t('queueDisplay.adUploaded'))
                                    } catch (error) {
                                      console.error('Failed to upload advertisement image:', error)
                                      showToastNotification(t('queueDisplay.adUploadFailed'))
                                    } finally {
                                      e.target.value = ''
                                      setQueueSaving(false)
                                    }
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                disabled={queueSaving || !queueSettings.advertisementImageUrl}
                                onClick={async () => {
                                  setQueueSaving(true)
                                  try {
                                    const updated = await queueDisplayApi.deleteAdvertisementImage()
                                    setQueueSettings(updated)
                                    showToastNotification(t('queueDisplay.adRemoved'))
                                  } catch (error) {
                                    console.error('Failed to delete advertisement image:', error)
                                    showToastNotification(t('queueDisplay.adRemoveFailed'))
                                  } finally {
                                    setQueueSaving(false)
                                  }
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                              >
                                {t('queueDisplay.remove')}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={queueSaving}
                            onClick={saveQueueDisplaySettings}
                            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                          >
                            {queueSaving ? t('common.saving') : t('queueDisplay.saveSettings')}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="order-7 mt-0">
            <SectionCard
              title={t('settings.autoDeleteTitle')}
              icon={<ShieldAlert className="w-5 h-5" />}
              headerClassName="bg-slate-700 hover:bg-slate-800"
              isOpen={openCards.autoDelete}
              onToggle={() => toggleCard('autoDelete')}
            >
            <div className="p-6 space-y-4">
                <div className="flex justify-end">
                  {!enabled && (
                    <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                      {t('common.off')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {t('settings.autoDeleteDescription')}
                </p>

                <label className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
                  <span className="text-sm font-medium text-slate-700">{t('settings.enableAutoDelete')}</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>

                {!enabled && (
                  <div className="mt-2 text-sm text-red-600 font-medium">
                    {t('settings.autoDeleteOff')}
                  </div>
                )}

                <div className={`${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div>
                    <label className="text-sm font-medium">{t('settings.daysBeforeDeletion')}</label>

                    <input
                      type="number"
                      min={0}
                      value={autoDeleteDays}
                      onChange={(e) => setAutoDeleteDays(Number(e.target.value))}
                      disabled={!enabled}
                      className="mt-2 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <button
                      type="button"
                      onClick={async () => {
                        await post('/api/tenant/run-cleanup')
                        alert(t('settings.cleanupCompleted'))
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                      {t('settings.runCleanup')}
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving ||uploadingLogo ||deletingLogo || uploadingStamp}
              className={`px-10 py-3 rounded-xlfont-medium transition-all ${
                saving || uploadingLogo || deletingLogo || uploadingStamp
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('common.saving')}
                </span>
              ) : (
                t('common.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </Container>
  )
}
