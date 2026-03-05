import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import * as apiClient from "@/api/apiClient"

interface Client {
  id: string
  fullName: string
  email: string
  phone: string
  address?: string
  internalNote?: string
  lastVisit?: string | null
  createdAt?: string
  isActive: boolean
}

interface Note {
  id: string
  content: string
  createdAt: string
}

export default function ClientProfile() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const isRTL = i18n.language === "he" || i18n.language === "ar"

  const [client, setClient] = useState<Client | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [newNote, setNewNote] = useState("")

  /* ================================
     LOAD DATA
  ================================ */

  useEffect(() => {
    const loadData = async () => {

      if (!clientId) {
        setLoading(false)
        return
      }

      /* חשוב: אם זה /clients/new לא לקרוא ל-API */
      if (clientId === "new") {
        setLoading(false)
        return
      }

      try {
        const clientData = await apiClient.get<Client>(
          `/api/clients/${clientId}`
        )

        setClient(clientData ?? null)

        const notesData = await apiClient.get<Note[]>(
          `/api/notes?clientId=${clientId}`
        )

        setNotes(Array.isArray(notesData) ? notesData : [])

      } catch (err) {
        console.error("Load client failed:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [clientId])

  const formatDate = (date?: string | null) =>
    date ? new Date(date).toLocaleString(i18n.language) : "-"

  /* ================================
     EDIT CLIENT
  ================================ */

  const handleClientChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!client) return
    const { name, value } = e.target
    setClient({ ...client, [name]: value })
  }

  const saveClient = async () => {
    if (!client) return
    setSavingClient(true)

    try {
      await apiClient.put(`/api/clients/${client.id}`, client)
      setEditingClient(false)
    } catch (err) {
      console.error("Save failed", err)
    } finally {
      setSavingClient(false)
    }
  }

  /* ================================
     STATUS TOGGLE
  ================================ */

  const handleToggleStatus = async () => {
    if (!client) return

    try {
      const updated = {
        ...client,
        isActive: !client.isActive,
      }

      await apiClient.put(`/api/clients/${client.id}`, updated)
      setClient(updated)
    } catch (err) {
      console.error("Status update failed", err)
    }
  }

  /* ================================
     NOTES
  ================================ */

  const addNote = async () => {
    if (!newNote.trim() || !clientId || clientId === "new") return

    try {
      const created = await apiClient.post<Note>(`/api/notes`, {
        clientId,
        content: newNote.trim(),
      })

      if (created) {
        setNotes(prev => [created, ...prev])
      }

      setNewNote("")
    } catch (err) {
      console.error("Add note failed:", err)
    }
  }

  const updateNote = async (id: string, content: string) => {
    await apiClient.put(`/api/notes/${id}`, { content })
    setNotes(prev =>
      prev.map(n => (n.id === id ? { ...n, content } : n))
    )
  }

  const deleteNote = async (id: string) => {
    await apiClient.del(`/api/notes/${id}`)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  /* ================================
     RENDER
  ================================ */

  if (loading)
    return (
      <div className="p-10 text-center text-gray-500">
        {t("common.loading")}
      </div>
    )

  if (!client)
    return (
      <div className="p-10 text-center text-red-500">
        {t("admin.clientProfile.notFound")}
      </div>
    )

  return (
    <div
      className="max-w-4xl mx-auto p-8 space-y-8"
      dir={isRTL ? "rtl" : "ltr"}
    >

      {/* HEADER */}

      <div className="flex justify-between items-center">

        <h1 className="text-2xl font-bold text-slate-800">
          {t("admin.clientProfile.title")}
        </h1>

        <div className="flex gap-3">

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-200 rounded-lg"
          >
            {t("common.back")}
          </button>

          {!editingClient && (
            <button
              onClick={() => setEditingClient(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {t("common.edit")}
            </button>
          )}

        </div>
      </div>

      {/* CLIENT CARD */}

      <div className="bg-white rounded-2xl shadow-md p-8 space-y-6">

        <Field
          label={t("admin.clientProfile.fullName")}
          name="fullName"
          value={client.fullName}
          editing={editingClient}
          onChange={handleClientChange}
          isRTL={isRTL}
        />

        <Field
          label={t("admin.clientProfile.email")}
          name="email"
          value={client.email}
          editing={editingClient}
          onChange={handleClientChange}
          isRTL={isRTL}
        />

        <Field
          label={t("admin.clientProfile.phone")}
          name="phone"
          value={client.phone}
          editing={editingClient}
          onChange={handleClientChange}
          isRTL={isRTL}
        />

        <Field
          label={t("admin.clientProfile.address")}
          name="address"
          value={client.address}
          editing={editingClient}
          onChange={handleClientChange}
          isRTL={isRTL}
        />

        <Display
          label={t("admin.clientProfile.createdAt")}
          value={formatDate(client.createdAt)}
          isRTL={isRTL}
        />

        <Display
          label={t("admin.clientProfile.lastVisit")}
          value={formatDate(client.lastVisit)}
          isRTL={isRTL}
        />

        <Display
          label={t("common.status")}
          value={
            client.isActive
              ? t("admin.clients.statusActive")
              : t("admin.clients.statusInactive")
          }
          isRTL={isRTL}
        />

        {editingClient && (
          <div className="flex justify-end gap-3 pt-4">

            <button
              onClick={() => setEditingClient(false)}
              className="px-4 py-2 bg-gray-300 rounded-lg"
            >
              {t("common.cancel")}
            </button>

            <button
              onClick={saveClient}
              disabled={savingClient}
              className="px-6 py-2 bg-green-600 text-white rounded-lg"
            >
              {savingClient ? t("common.saving") : t("common.save")}
            </button>

          </div>
        )}
      </div>

      {/* NOTES */}

      <div className="bg-white rounded-2xl shadow-md p-8 space-y-6">

        <h3 className="text-lg font-semibold text-slate-800">
          {t("admin.clientProfile.notesTitle")}
        </h3>

        <div className="space-y-3">

          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className={`w-full border rounded-lg p-3 ${
              isRTL ? "text-right" : "text-left"
            }`}
            placeholder={t("admin.clients.notes.placeholder")}
          />

          <div className="flex justify-end">
            <button
              onClick={addNote}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg"
            >
              {t("admin.clients.notes.add")}
            </button>
          </div>

        </div>

        <div className="space-y-4">

          {notes.length === 0 && (
            <div className="text-slate-400">
              {t("admin.clientProfile.noNotes")}
            </div>
          )}

          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={updateNote}
              onDelete={deleteNote}
              t={t}
              language={i18n.language}
              isRTL={isRTL}
            />
          ))}

        </div>
      </div>
    </div>
  )
}

/* ================= COMPONENTS ================= */

function Field({ label, name, value, editing, onChange, isRTL }: any) {

  if (!editing)
    return <Display label={label} value={value || "-"} isRTL={isRTL} />

  return (
    <div>
      <label className={`block text-sm text-slate-500 mb-2 ${isRTL ? "text-right" : "text-left"}`}>
        {label}
      </label>

      <input
        name={name}
        value={value || ""}
        onChange={onChange}
        className={`w-full border rounded-lg p-3 ${
          isRTL ? "text-right" : "text-left"
        }`}
      />
    </div>
  )
}

function Display({ label, value, isRTL }: any) {
  return (
    <div className={isRTL ? "text-right" : "text-left"}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-base font-medium text-slate-800">{value}</p>
    </div>
  )
}

function NoteCard({ note, onUpdate, onDelete, t, language, isRTL }: any) {

  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)

  return (
    <div className="border rounded-xl p-4 bg-slate-50 space-y-3">

      {editing ? (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`w-full border rounded p-2 ${
              isRTL ? "text-right" : "text-left"
            }`}
          />

          <div className="flex justify-end gap-2">

            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              {t("common.cancel")}
            </button>

            <button
              onClick={() => {
                onUpdate(note.id, content)
                setEditing(false)
              }}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              {t("common.save")}
            </button>

          </div>
        </>
      ) : (
        <>
          <p className={isRTL ? "text-right" : "text-left"}>
            {note.content}
          </p>

          <div className="flex justify-between text-xs text-slate-400">

            <span>
              {new Date(note.createdAt).toLocaleString(language)}
            </span>

            <div className="flex gap-3">

              <button
                onClick={() => setEditing(true)}
                className="text-blue-600"
              >
                {t("common.edit")}
              </button>

              <button
                onClick={() => onDelete(note.id)}
                className="text-red-600"
              >
                {t("common.delete")}
              </button>

            </div>

          </div>
        </>
      )}
    </div>
  )
}