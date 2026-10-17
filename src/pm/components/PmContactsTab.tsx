import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Pencil, Star, Receipt } from 'lucide-react'
import { getClientContacts, createClientContact, updateClientContact, deleteClientContact } from '@/api/clientContacts'
import type { ClientContact, CreateClientContactRequest } from '@/types/pm'

type Props = { clientId: string; canManage: boolean }

const emptyForm = (): CreateClientContactRequest => ({
  name: '',
  roleTitle: '',
  phone: '',
  whatsApp: '',
  email: '',
  isPrimary: false,
  isBillingContact: false,
})

export default function PmContactsTab({ clientId, canManage }: Props) {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateClientContactRequest>(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getClientContacts(clientId)
      .then(setContacts)
      .catch((error) => {
        console.error('Failed to load contacts:', error)
        setContacts([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (contact: ClientContact) => {
    setEditingId(contact.id)
    setForm({
      name: contact.name,
      roleTitle: contact.roleTitle ?? '',
      phone: contact.phone ?? '',
      whatsApp: contact.whatsApp ?? '',
      email: contact.email ?? '',
      isPrimary: contact.isPrimary,
      isBillingContact: contact.isBillingContact,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateClientContact(editingId, form)
      } else {
        await createClientContact(clientId, form)
      }
      closeModal()
      load()
    } catch (error) {
      console.error('Failed to save contact:', error)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (contact: ClientContact) => {
    if (!window.confirm(t('pm.contacts.confirmDelete', { name: contact.name }))) return
    try {
      await deleteClientContact(contact.id)
      setContacts((current) => current.filter((item) => item.id !== contact.id))
    } catch (error) {
      console.error('Failed to delete contact:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{t('pm.tabs.contacts')}</h3>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            {t('pm.contacts.new')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-500">{t('common.loading')}</div>
      ) : contacts.length === 0 ? (
        <div className="py-6 text-center text-slate-500">{t('pm.contacts.empty')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-900">{contact.name}</h4>
                  {contact.roleTitle ? <p className="text-xs text-slate-500">{contact.roleTitle}</p> : null}
                </div>
                <div className="flex gap-1.5">
                  {contact.isPrimary && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 shadow-sm">
                      <Star className="h-3 w-3" />
                      {t('pm.contacts.primary')}
                    </span>
                  )}
                  {contact.isBillingContact && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-sm">
                      <Receipt className="h-3 w-3" />
                      {t('pm.contacts.billing')}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                {contact.phone && <p>{t('pm.contacts.phone')}: <span dir="ltr" className="inline-block text-left">{contact.phone}</span></p>}
                {contact.whatsApp && <p>{t('pm.contacts.whatsApp')}: <span dir="ltr" className="inline-block text-left">{contact.whatsApp}</span></p>}
                {contact.email && <p>{t('pm.contacts.email')}: <span dir="ltr" className="inline-block text-left">{contact.email}</span></p>}
              </div>

              {canManage && (
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(contact)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(contact)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? t('pm.contacts.edit') : t('pm.contacts.new')}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-600">{t('pm.contacts.name')}</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">{t('pm.contacts.roleTitle')}</label>
                <input
                  value={form.roleTitle ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, roleTitle: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-600">{t('pm.contacts.phone')}</label>
                  <input
                    dir="ltr"
                    placeholder="+972..."
                    value={form.phone ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-left"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-600">{t('pm.contacts.whatsApp')}</label>
                  <input
                    dir="ltr"
                    placeholder="+972..."
                    value={form.whatsApp ?? ''}
                    onChange={(event) => setForm((current) => ({ ...current, whatsApp: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 p-2 text-left"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">{t('pm.contacts.email')}</label>
                <input
                  dir="ltr"
                  value={form.email ?? ''}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-left"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))}
                  />
                  {t('pm.contacts.primary')}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isBillingContact}
                    onChange={(event) => setForm((current) => ({ ...current, isBillingContact: event.target.checked }))}
                  />
                  {t('pm.contacts.billing')}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
