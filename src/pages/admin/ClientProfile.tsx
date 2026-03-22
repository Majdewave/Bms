import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/contexts/AuthContext"
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

interface Prescription {
  id: string
  date: string
  doctorName: string
}

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const isAdmin = user?.role === "admin"
  const isRTL = i18n.language === "he" || i18n.language === "ar"

  const [client, setClient] = useState<Client | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [prescriptionForm, setPrescriptionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    nationalId: '',
    instructions: '',
    doctorName: '',
    signature: '',
  })

  /* ================================
     LOAD DATA
  ================================ */

  useEffect(() => {
    const loadData = async () => {

      if (!id) {
        setLoading(false)
        return
      }

      /* חשוב: אם זה /clients/new לא לקרוא ל-API */
      if (id === "new") {
        setLoading(false)
        return
      }

      try {
        const clientData = await apiClient.get<Client>(
          `/api/clients/${id}`
        )

        setClient(clientData ?? null)

        const notesData = await apiClient.get<Note[]>(
          `/api/notes?clientId=${id}`
        )

        const prescriptionsData = await apiClient.get<Prescription[]>(
          `/api/prescriptions/client/${id}`
        )

        setNotes(Array.isArray(notesData) ? notesData : [])
        setPrescriptions(Array.isArray(prescriptionsData) ? prescriptionsData : [])

      } catch (err) {
        console.error("Load client failed:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

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
    if (!newNote.trim() || !id || id === "new") return

    try {
      const created = await apiClient.post<Note>(`/api/notes`, {
        clientId: id,
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

  const closePrescriptionModal = () => {
    setShowPrescriptionModal(false)
    setPrescriptionForm({
      date: new Date().toISOString().split('T')[0],
      nationalId: '',
      instructions: '',
      doctorName: '',
      signature: '',
    })
  }

  const savePrescription = async () => {
    if (!client) return

    setSavingPrescription(true)
    try {
      const extraNotes = [
        prescriptionForm.nationalId ? `ת.ז: ${prescriptionForm.nationalId}` : null,
        prescriptionForm.signature ? `חתימה: ${prescriptionForm.signature}` : null,
      ].filter(Boolean).join(' | ')

      await apiClient.post('/api/prescriptions', {
        clientId: client.id,
        date: prescriptionForm.date,
        instructions: prescriptionForm.instructions,
        doctorName: prescriptionForm.doctorName,
        notes: extraNotes,
      })

      if (id) {
        const prescriptionsData = await apiClient.get<Prescription[]>(
          `/api/prescriptions/client/${id}`
        )
        setPrescriptions(Array.isArray(prescriptionsData) ? prescriptionsData : [])
      }

      closePrescriptionModal()
    } catch (err) {
      console.error('Save prescription failed:', err)
    } finally {
      setSavingPrescription(false)
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

  const downloadPrescription = async (id: string) => {
    const token = localStorage.getItem('token')

    const res = await fetch(
      `http://localhost:5146/api/prescriptions/${id}/pdf`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    window.open(url)
  }

  const deletePrescription = async (id: string) => {
    const token = localStorage.getItem('token')

    const confirmed = confirm("למחוק מרשם?")
    if (!confirmed) return

    await fetch(
      `http://localhost:5146/api/prescriptions/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    setPrescriptions(prev => prev.filter(p => p.id !== id))
    alert("המרשם נמחק")
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
            onClick={() => setShowPrescriptionModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            כתוב מרשם
          </button>

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

        <Display
          label="Notes"
          value={client.internalNote || (client as any)?.notes || "-"}
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

        {/* Admin-only actions */}
        {isAdmin && !editingClient && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 rounded-lg ${client.isActive ? "bg-yellow-500 text-white" : "bg-green-600 text-white"}`}
            >
              {client.isActive ? t("admin.clients.deactivateButton") : t("admin.clients.activateButton")}
            </button>
            <button
              onClick={() => {/* send code logic here */}}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {t("admin.clients.sendLink")}
            </button>
          </div>
        )}

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

      <div className="bg-white rounded-2xl shadow-md p-8 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">מרשמים</h3>

        <table className="w-full border mt-4">
          <thead>
            <tr>
              <th className="text-right p-2">תאריך</th>
              <th className="text-right p-2">רופא</th>
              <th className="text-right p-2">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {prescriptions.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 text-right">
                  {new Date(p.date).toLocaleDateString()}
                </td>

                <td className="p-2 text-right">
                  {p.doctorName}
                </td>

                <td className="p-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => downloadPrescription(p.id)}
                      className="text-blue-600"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => deletePrescription(p.id)}
                      className="text-red-600"
                    >
                      מחק
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {prescriptions.length === 0 && (
          <div className="mt-4 text-gray-500">
            אין מרשמים
          </div>
        )}
      </div>

      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4" dir="rtl">
            <h3 className="text-xl font-bold">כתיבת מרשם</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">תאריך</label>
                <input
                  type="date"
                  value={prescriptionForm.date}
                  onChange={(e) => setPrescriptionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">שם המטופל</label>
                <input
                  type="text"
                  value={client.fullName}
                  readOnly
                  className="w-full border rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">ת.ז</label>
                <input
                  type="text"
                  value={prescriptionForm.nationalId}
                  onChange={(e) => setPrescriptionForm(prev => ({ ...prev, nationalId: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">טלפון</label>
                <input
                  type="text"
                  value={client.phone || ''}
                  readOnly
                  className="w-full border rounded-lg p-2 bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">הוראות שימוש</label>
              <textarea
                rows={4}
                value={prescriptionForm.instructions}
                onChange={(e) => setPrescriptionForm(prev => ({ ...prev, instructions: e.target.value }))}
                className="w-full border rounded-lg p-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">שם הרופא</label>
                <input
                  type="text"
                  value={prescriptionForm.doctorName}
                  onChange={(e) => setPrescriptionForm(prev => ({ ...prev, doctorName: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">חתימה</label>
                <input
                  type="text"
                  placeholder="חתימת הרופא"
                  value={prescriptionForm.signature}
                  onChange={(e) => setPrescriptionForm(prev => ({ ...prev, signature: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closePrescriptionModal}
                className="px-4 py-2 rounded-lg bg-slate-200"
                disabled={savingPrescription}
              >
                ביטול
              </button>
              <button
                onClick={savePrescription}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
                disabled={savingPrescription || !prescriptionForm.instructions.trim() || !prescriptionForm.doctorName.trim()}
              >
                {savingPrescription ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}
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