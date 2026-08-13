import { useRef, useState } from 'react'
import { clientsService } from '@/api'
import { useTranslation } from 'react-i18next'

export default function CreateClientModal({ onClose, onCreated }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    idNumber: '',
    birthDate: '',
    internalNote: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checkingIdNumber, setCheckingIdNumber] = useState(false)
  const [duplicateClientName, setDuplicateClientName] = useState<string | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const lastCheckedIdNumber = useRef('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const isDuplicateConflictError = (err: any) => {
    return err?.status === 409 && err?.response?.code === 'DUPLICATE_CLIENT_ID_NUMBER'
  }

  const applyDuplicateValidation = (clientName?: string | null) => {
    setDuplicateClientName(clientName || null)
    setErrors((prev) => ({
      ...prev,
      idNumber: t('admin.clients.form.duplicateIdNumberInline'),
    }))
    setShowDuplicateModal(true)
  }

  const clearDuplicateValidation = () => {
    setDuplicateClientName(null)
    setErrors((prev) => {
      const next = { ...prev }
      if (next.idNumber === t('admin.clients.form.duplicateIdNumberInline')) {
        delete next.idNumber
      }
      return next
    })
  }

  const checkDuplicateIdNumber = async (rawValue: string) => {
    const normalizedIdNumber = rawValue.trim()

    if (!normalizedIdNumber) {
      clearDuplicateValidation()
      lastCheckedIdNumber.current = ''
      return false
    }

    if (checkingIdNumber || lastCheckedIdNumber.current === normalizedIdNumber) {
      return Boolean(errors.idNumber)
    }

    setCheckingIdNumber(true)
    try {
      const result = await clientsService.checkDuplicateClientIdNumber(normalizedIdNumber)
      lastCheckedIdNumber.current = normalizedIdNumber

      if (result?.exists) {
        applyDuplicateValidation(result.clientName)
        return true
      }

      clearDuplicateValidation()
      return false
    } catch (err: any) {
      if (isDuplicateConflictError(err)) {
        applyDuplicateValidation(err?.response?.clientName)
        return true
      }
      return false
    } finally {
      setCheckingIdNumber(false)
    }
  }


  const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!form.fullName.trim()) {
    newErrors.fullName = t('validation.required')
  }

  if (!form.phone.trim()) {
    newErrors.phone = t('validation.required')
  }

  if (errors.idNumber === t('admin.clients.form.duplicateIdNumberInline')) {
    newErrors.idNumber = t('admin.clients.form.duplicateIdNumberInline')
  }
    // if (!form.idNumber.trim()) {
    // newErrors.idNumber = t('validation.required')
    //   }

  setErrors(newErrors)

  return Object.keys(newErrors).length === 0
}

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    const duplicateFound = await checkDuplicateIdNumber(form.idNumber || '')
    if (duplicateFound) {
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
          ...form,
          idNumber: form.idNumber?.trim() || null,
          birthDate: form.birthDate ? form.birthDate : null,
        }

      const client = await clientsService.createClient(payload)
      onCreated(client)
    } catch (err: any) {
      if (isDuplicateConflictError(err)) {
        applyDuplicateValidation(err?.response?.clientName)
        return
      }
      setError(t('admin.clients.createError') || 'Failed to create client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 md:p-0">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 md:p-6 relative">
        <button
          className="absolute top-3 left-3 text-2xl leading-none text-slate-400 hover:text-slate-600 p-1"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">{t('admin.clients.add')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder={t('admin.clients.form.namePlaceholder')}
              className={`w-full rounded-lg px-3 py-2 border ${
                errors.fullName
                  ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />

            {errors.fullName && (
              <p className="text-sm text-red-500 mt-1">
                {errors.fullName}
              </p>
            )}
          </div>        
          <div>
            <input
              name="idNumber"
              type="text"
              value={form.idNumber || ''}
              onChange={(e) => {
                const nextValue = e.target.value
                setForm(prev => ({ ...prev, idNumber: nextValue }))
                lastCheckedIdNumber.current = ''
                clearDuplicateValidation()
              }}
              onBlur={() => void checkDuplicateIdNumber(form.idNumber || '')}
              placeholder={t('admin.clients.form.idNumberPlaceholder')}
              className={`w-full rounded-lg px-3 py-2 border ${
                errors.idNumber
                  ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
            />
            {checkingIdNumber && (
              <p className="text-xs text-slate-500 mt-1">{t('admin.clients.form.checkingIdNumber')}</p>
            )}
            {errors.idNumber && (
              <p className="text-sm text-red-500 mt-1">
                {errors.idNumber}
              </p>
            )}
          </div>

          <div>
            <input
              name="birthDate"
              type="date"
              value={form.birthDate || ''}
              onChange={handleChange}
              className="w-full rounded-lg px-3 py-2 border border-slate-300"
            />
        </div>

          <input name="email" value={form.email} onChange={handleChange} type="email" placeholder={t('admin.clients.form.emailPlaceholder')} className="input w-full" />
          <div> 
            <input
                type="text"
                value={form.phone || ''}
                onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t('admin.clients.form.phonePlaceholder')}
                className={`w-full rounded-lg px-3 py-2 border ${
                  errors.phone
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.phone}
                </p>
            )}
          </div>
           <input name="address" value={form.address} onChange={handleChange} placeholder={t('admin.clients.form.addressPlaceholder')} className="input w-full" />
          <textarea name="internalNote" value={form.internalNote} onChange={handleChange} placeholder={t('admin.clients.form.notePlaceholder')} className="input w-full" />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={saving || checkingIdNumber}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-600 text-white font-medium shadow-sm hover:bg-primary-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t('common.saving') : t('admin.clients.form.submit')}
            </button>
          </div>
        </form>

        {showDuplicateModal && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 rounded-lg">
            <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-white p-4 shadow-lg">
              <h3 className="text-base font-semibold text-slate-900">{t('admin.clients.form.duplicateIdNumberTitle')}</h3>
              <p className="mt-2 text-sm text-slate-700">{t('admin.clients.form.duplicateIdNumberMessage')}</p>
              {duplicateClientName ? (
                <p className="mt-1 text-sm text-slate-600">{t('admin.clients.form.duplicateIdNumberClientName', { clientName: duplicateClientName })}</p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium"
                  onClick={() => setShowDuplicateModal(false)}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
