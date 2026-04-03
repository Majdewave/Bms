import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Upload, CheckCircle, X } from 'lucide-react'
import { Container, PageHeader } from '@/components/Layout'
import { Card, CardContent } from '@/components'
import { getBusinessSettings, updateBusinessSettings, uploadTenantLogo } from '@/api/businessSettings'
import ServicesSection from './ServicesSection'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import * as apiClient from '@/api/apiClient'
import { get, put, post, del } from '@/api/apiClient'

interface TenantContactSettings {
  name?: string
  phone?: string | null
  whatsApp?: string | null
  logoUrl?: string | null
  autoDeleteNotDocumentedAfterDays?: number | null
  enableAutoDeleteNotDocumented?: boolean | null
}

export default function BusinessSettings() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { setTenant } = useTenant()
  const isAdmin = user?.role === 'admin'
  const isRTL = i18n.language === 'he' || i18n.language === 'ar'
  const [formData, setFormData] = useState<{
    name: string
    phone: string
    whatsApp: string
  }>({
    name: '',
    phone: '',
    whatsApp: '',
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoVersion, setLogoVersion] = useState<number>(Date.now())
  const [pageLoading, setPageLoading] = useState(false)
  const [autoDeleteDays, setAutoDeleteDays] = useState(1)
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const API_BASE = (import.meta as any).env.VITE_API_URL

  const getAbsoluteLogoUrl = (url: string) =>
    url.startsWith('http') ? url : `${API_BASE}${url}`

  const getCacheBustedLogoUrl = (url: string) => {
    const baseUrl = getAbsoluteLogoUrl(url)
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}v=${logoVersion}`
  }

  useEffect(() => {
    loadSettings()
  }, [])

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
        phone: tenant?.phone ?? '',
        whatsApp: tenant?.whatsApp ?? '',
      })

      if (settings.logoUrl) {
        setLogoUrl(settings.logoUrl)
        setLogoPreview(settings.logoUrl)
        setLogoVersion(Date.now())
        setTenant((prev) => ({
          ...prev,
          name: settings.name,
          phone: tenant?.phone ?? '',
          whatsApp: tenant?.whatsApp ?? '',
          logoUrl: settings.logoUrl,
          autoDeleteNotDocumentedAfterDays: tenant?.autoDeleteNotDocumentedAfterDays ?? 1,
          enableAutoDeleteNotDocumented: tenant?.enableAutoDeleteNotDocumented ?? true,
        }))
      } else {
        setTenant((prev) => ({
          ...prev,
          name: settings.name,
          phone: tenant?.phone ?? '',
          whatsApp: tenant?.whatsApp ?? '',
          logoUrl: null,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateBusinessSettings({
        name: formData.name,
        logoUrl: logoUrl,
      })

      await apiClient.put('/api/tenant/me', {
        phone: formData.phone,
        whatsApp: formData.whatsApp,
      })

      await put('/api/tenant/auto-delete-setting', {
        days: autoDeleteDays,
        enabled: enabled,
      })

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

        <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('admin.settings.businessDetails')}
              </h2>
            </div>
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('admin.settings.branding')}
              </h2>
            </div>
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
                        className="h-32 max-w-full object-contain"
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
                    className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingLogo ? t('common.deleting') : t('settings.deleteLogo')}
                  </button>

                  <label
                    htmlFor="logo-upload"
                    className={`px-3 py-1 text-sm bg-indigo-600 text-white rounded-md cursor-pointer hover:bg-indigo-700 ${
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
            </div>
          </div>

          <ServicesSection isAdmin={isAdmin} />

          <Card>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {t('settings.autoDeleteTitle')}
                  </h3>
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
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploadingLogo || deletingLogo}
              className={`px-8 py-3 rounded-lg font-medium transition-all ${
                saving || uploadingLogo || deletingLogo
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
