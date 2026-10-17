import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/contexts/TenantContext'
import { Pencil, Trash2 } from 'lucide-react'
import { getClientNotes, createNote, updateNote, deleteNote, type Note } from '@/api/notes'

type Props = { clientId: string }

// PM Phase 2 - Notes remain Client-scoped; reuses the existing Notes API/behavior exactly.
export default function PmNotesTab({ clientId }: Props) {
  const { t, i18n } = useTranslation()
  const { productType } = useTenant()
  const isBusiness = productType === 'business'
  const isRtl = i18n.dir() === 'rtl'
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const load = () => {
    setLoading(true)
    getClientNotes(clientId)
      .then(setNotes)
      .catch((error) => {
        console.error('Failed to load client notes:', error)
        setNotes([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const addNote = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      const created = await createNote({ clientId, content: newNote.trim() })
      setNotes((current) => [created, ...current])
      setNewNote('')
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      setSaving(false)
    }
  }

  const removeNote = async (id: string) => {
    try {
      await deleteNote(id)
      setNotes((current) => current.filter((note) => note.id !== id))
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingNoteId(null)
    setEditContent('')
  }

  const saveEdit = async (noteId: string) => {
    const content = editContent.trim()
    if (!content || savingEdit) return
    setSavingEdit(true)
    try {
      await updateNote(noteId, { content })
      setNotes((current) => current.map((note) => note.id === noteId ? { ...note, content } : note))
      cancelEdit()
    } catch (error) {
      console.error('Failed to update note:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">{t('pm.tabs.notes')}</h3>

      <div className="space-y-2">
        <textarea
          value={newNote}
          onChange={(event) => setNewNote(event.target.value)}
          className="w-full rounded-lg border border-slate-300 p-3"
          placeholder={t('admin.clients.notes.placeholder')}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={addNote}
            disabled={saving || !newNote.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {t('admin.clients.notes.add')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-slate-500">{t('common.loading')}</div>
      ) : notes.length === 0 ? (
        <div className="py-6 text-center text-slate-500">{t('admin.clientProfile.noNotes')}</div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                {editingNoteId === note.id ? (
                  <div className="w-full space-y-2">
                    <textarea
                      autoFocus
                      dir={isRtl ? 'rtl' : 'ltr'}
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      className={`w-full rounded-lg border border-slate-300 p-3 text-sm ${isRtl ? 'text-right' : 'text-left'}`}
                      aria-label={t('admin.clients.notes.editComment')}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={cancelEdit} disabled={savingEdit} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                        {t('admin.clients.notes.cancel')}
                      </button>
                      <button type="button" onClick={() => void saveEdit(note.id)} disabled={savingEdit || !editContent.trim()} className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                        {savingEdit ? t('common.saving') : t('admin.clients.notes.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm text-slate-800">{note.content}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(note.createdAt).toLocaleString()}</p>
                  </>
                )}
              </div>
              {editingNoteId !== note.id && <div className="flex shrink-0 items-center gap-2">
                {isBusiness && <button
                  type="button"
                  onClick={() => startEdit(note)}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                  title={t('admin.clients.notes.edit')}
                  aria-label={t('admin.clients.notes.edit')}
                >
                  <Pencil className="h-4 w-4" />
                </button>}
                <button
                  type="button"
                  onClick={() => void removeNote(note.id)}
                  className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
