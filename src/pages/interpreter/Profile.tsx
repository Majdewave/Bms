import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ImagePlus, Loader2, Trash2, UserRound } from 'lucide-react'
import {
  deleteInterpreterStamp,
  getInterpreterProfile,
  getInterpreterStamp,
  updateInterpreterProfile,
  uploadInterpreterStamp,
  type InterpreterProfile as InterpreterProfileData,
} from '@/api/interpreterProfile'

const MAX_STAMP_SIZE = 2 * 1024 * 1024

export default function InterpreterProfile() {
  const { t, i18n } = useTranslation()
  const [profile, setProfile] = useState<InterpreterProfileData | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [stampUrl, setStampUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = await getInterpreterProfile()
        if (cancelled) return
        setProfile(data)
        setFullName(data.fullName)
        setPhone(data.phone ?? '')
        setLicenseNumber(data.licenseNumber ?? '')
        if (data.hasStamp) {
          const blob = await getInterpreterStamp()
          if (!cancelled) setStampUrl(URL.createObjectURL(blob))
        }
      } catch {
        if (!cancelled) setError(t('interpreter.profileLoadedError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError(t('interpreter.fullNameRequired'))
      return
    }
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const updated = await updateInterpreterProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        licenseNumber: licenseNumber.trim() || null,
      })
      setProfile(updated)
      setFullName(updated.fullName)
      setPhone(updated.phone ?? '')
      setLicenseNumber(updated.licenseNumber ?? '')
      setMessage(t('interpreter.profileSaved'))
    } catch {
      setError(t('interpreter.profileSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleStampChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type) || !['.png', '.jpg', '.jpeg'].includes(file.name.slice(file.name.lastIndexOf('.')).toLowerCase())) {
      setError(t('interpreter.invalidStamp'))
      return
    }
    if (file.size > MAX_STAMP_SIZE) {
      setError(t('interpreter.stampTooLarge'))
      return
    }

    setUploading(true)
    setMessage(null)
    setError(null)
    try {
      const updated = await uploadInterpreterStamp(file)
      setProfile(updated)
      const blob = await getInterpreterStamp()
      setStampUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(blob)
      })
      setMessage(t('interpreter.stampUploaded'))
    } catch {
      setError(t('interpreter.stampUploadError'))
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteStamp = async () => {
    if (!confirm(t('interpreter.confirmRemoveStamp'))) return
    setUploading(true)
    setMessage(null)
    setError(null)
    try {
      await deleteInterpreterStamp()
      setProfile((current) => current ? { ...current, hasStamp: false } : current)
      setStampUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return null
      })
      setMessage(t('interpreter.stampRemoved'))
    } catch {
      setError(t('interpreter.stampRemoveError'))
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <div dir={i18n.dir()} className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
  }

  return (
    <div dir={i18n.dir()} className="mx-auto max-w-3xl space-y-5 px-1 sm:px-0">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-blue-600"><UserRound className="h-5 w-5" /><span className="text-sm font-semibold">{t('interpreter.portalTitle')}</span></div>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">{t('interpreter.profileTitle')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('interpreter.profileSubtitle')}</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">{t('interpreter.personalDetails')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">{t('interpreter.fullName')}<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium text-slate-700">{t('interpreter.email')}<input value={profile?.email ?? ''} readOnly className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" /></label>
          <label className="text-sm font-medium text-slate-700">{t('interpreter.phone')}<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium text-slate-700">{t('interpreter.licenseNumber')}<input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('interpreter.saveChanges')}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-950">{t('interpreter.stampTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('interpreter.stampHint')}</p>
        <div className="mt-4 flex min-h-36 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          {stampUrl ? <img src={stampUrl} alt={t('interpreter.stampTitle')} className="max-h-28 max-w-full object-contain" /> : <div className="text-center text-sm text-slate-400"><ImagePlus className="mx-auto mb-2 h-7 w-7" />{t('interpreter.noStamp')}</div>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {stampUrl ? t('interpreter.replaceStamp') : t('interpreter.uploadStamp')}
            <input type="file" accept="image/png,image/jpeg" onChange={handleStampChange} disabled={uploading} className="sr-only" />
          </label>
          {stampUrl && <button type="button" onClick={() => void handleDeleteStamp()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-4 w-4" />{t('interpreter.removeStamp')}</button>}
        </div>
      </section>

      {message && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    </div>
  )
}
