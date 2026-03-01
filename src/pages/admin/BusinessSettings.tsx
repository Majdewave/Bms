import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Upload, CheckCircle, X } from 'lucide-react'
import { Container, PageHeader } from '@/components/Layout'
import { getBusinessSettings, updateBusinessSettings, uploadTenantLogo } from '@/api/businessSettings'
import ServicesSection from './ServicesSection';
import { useAuth } from '@/contexts/AuthContext';

export default function BusinessSettings() {
  const { t } = useTranslation()
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [formData, setFormData] = useState<{
    name: string
  }>({
    name: '',
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const settings = await getBusinessSettings()
      setFormData({
        name: settings.name,
      })
      if (settings.logoUrl) {
        setLogoUrl(settings.logoUrl)
        setLogoPreview(settings.logoUrl)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      showToastNotification(t('admin.settings.saveError'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToastNotification(t('admin.settings.invalidImageType'))
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToastNotification(t('admin.settings.imageTooLarge'))
      return
    }

    setUploadingLogo(true)
    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload logo
      const result = await uploadTenantLogo(file)
      setLogoUrl(result.logoUrl)
      showToastNotification(t('admin.settings.saveSuccess'))
    } catch (error) {
      console.error('Failed to upload logo:', error)
      showToastNotification(t('admin.settings.saveError'))
    } finally {
      setUploadingLogo(false)
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
      logoUrl: logoUrl
    })
      showToastNotification(t('admin.settings.saveSuccess'))
    } catch (error) {
      console.error('Failed to save settings:', error)
      showToastNotification(t('admin.settings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
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
      <PageHeader
        title={t('admin.settings.title')}
        description={t('admin.settings.description')}
      />

      {/* Toast Notification */}
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
        {/* Business Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              {t('admin.settings.businessDetails')}
            </h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Business Name */}
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
          </div>
        </div>

        {/* Branding Card */}
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

            {/* Logo Preview */}
            {logoPreview && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-center bg-white rounded-lg p-6 border border-slate-200">
                  <img
                    src={`${API_BASE}${logoPreview}`}
                    alt="Business logo"
                    className="max-h-32 max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="relative">
              <input
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-center px-6 py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer disabled:opacity-50">
                <div className="text-center">
                  {uploadingLogo ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                      <p className="text-sm text-slate-600 font-medium">{t('common.uploading')}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm text-slate-600 font-medium mb-1">
                        {t('admin.settings.uploadLogo')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('admin.settings.logoRequirements')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Helper Text */}
            <p className="mt-3 text-xs text-slate-500">
              {t('admin.settings.logoHelper')}
            </p>
          </div>
        </div>

        {/* Services Section */}
        <ServicesSection isAdmin={isAdmin} />

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || uploadingLogo}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              saving || uploadingLogo
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
    </Container>
      )
    }
