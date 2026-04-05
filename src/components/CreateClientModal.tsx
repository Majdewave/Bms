import { useState } from 'react'
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
    internalNote: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const client = await clientsService.createClient(form)
      onCreated(client)
    } catch (err) {
      setError(t('admin.clients.createError') || 'Failed to create client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">{t('admin.clients.add')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="fullName" value={form.fullName} onChange={handleChange} required placeholder={t('admin.clients.form.namePlaceholder')} className="input w-full" />
          <input type="text" value={form.idNumber || ''} onChange={(e) => setForm(prev => ({ ...prev, idNumber: e.target.value }))  } className="w-full border rounded-lg p-2" placeholder={t('admin.clients.form.idNumberPlaceholder')} />
          <input name="email" value={form.email} onChange={handleChange} type="email" placeholder={t('admin.clients.form.emailPlaceholder')} className="input w-full" />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder={t('admin.clients.form.phonePlaceholder')} className="input w-full" />
          <input name="address" value={form.address} onChange={handleChange} placeholder={t('admin.clients.form.addressPlaceholder')} className="input w-full" />
          <textarea name="internalNote" value={form.internalNote} onChange={handleChange} placeholder={t('admin.clients.form.notePlaceholder')} className="input w-full" />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-600 text-white font-medium shadow-sm hover:bg-primary-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? t('common.saving') : t('admin.clients.form.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
