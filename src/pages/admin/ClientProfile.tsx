import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronDown, FileText } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useFeatures } from "@/contexts/FeatureContext"
import * as apiClient from "@/api/apiClient"

interface Client {
  id: string
  fullName: string
  email: string
  phone: string
  idNumber?: string
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
  drugs?: string[]
}

interface Drug {
  id: string
  name: string
}

interface CurrentStaff {
  id: string
  stampUrl?: string
  useStamp?: boolean
}

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const isAdmin = user?.role === "admin"
  const isRTL = i18n.language === "he" || i18n.language === "ar"
  const { features } = useFeatures()
  const [currentStaff, setCurrentStaff] = useState<CurrentStaff | null>(null)
  const stampSrc = currentStaff?.stampUrl
    ? (currentStaff.stampUrl.startsWith('http')
      ? currentStaff.stampUrl
      : `${(import.meta as any).env.VITE_API_URL || 'http://localhost:5146'}${currentStaff.stampUrl}`)
    : null

  const [client, setClient] = useState<Client | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [availableDrugs, setAvailableDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [drugs, setDrugs] = useState<string[]>([''])
  const [instructions, setInstructions] = useState("")
  const [errors, setErrors] = useState({
    drugs: false,
    instructions: false,
  })
  const [openSections, setOpenSections] = useState<string[]>([])
  const [prescriptionForm, setPrescriptionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    nationalId: '',
    doctorName: '',
    signature: '',
  })

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  useEffect(() => {
    if (!showPrescriptionModal || !client) return

    setPrescriptionForm((prev) => ({
      ...prev,
      nationalId: client.idNumber ?? '',
    }))
  }, [showPrescriptionModal, client])

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

        setClient(
          clientData
            ? {
                ...clientData,
                idNumber: clientData.idNumber ?? "",
              }
            : null
        )

        const notesData = await apiClient.get<Note[]>(
          `/api/notes?clientId=${id}`
        )

        const prescriptionsData = await apiClient.get<Prescription[]>(
          `/api/prescriptions/client/${id}`
        )

        setNotes(Array.isArray(notesData) ? notesData : [])
        
        // Remove duplicates from fetched prescriptions
        const unique = Array.isArray(prescriptionsData)
          ? prescriptionsData.filter(
              (v, i, arr) => arr.findIndex(x => x.id === v.id) === i
            )
          : []
        
        setPrescriptions(unique)

      } catch (err) {
        console.error("Load client failed:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  useEffect(() => {
    apiClient.get<Drug[]>('/api/drugs')
      .then((data) => setAvailableDrugs(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Load drugs failed:', err))
  }, [])

  useEffect(() => {
    const loadCurrentStaff = async () => {
      if (!user?.id) {
        setCurrentStaff(null)
        return
      }

      try {
        const staffData = await apiClient.get<CurrentStaff>(`/api/staff/${user.id}`)
        setCurrentStaff(staffData ?? null)
      } catch (error) {
        console.error('Load current staff failed:', error)
        setCurrentStaff(null)
      }
    }

    loadCurrentStaff()
  }, [user?.id])

  const addDrug = () => {
    setDrugs(prev => [...prev, ''])
  }

  const removeDrug = (index: number) => {
    setDrugs(prev => {
      if (prev.length === 1) return ['']
      return prev.filter((_, i) => i !== index)
    })
  }

  const updateDrug = (index: number, value: string) => {
    setDrugs(prev => prev.map((drug, i) => (i === index ? value : drug)))
  }

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
      await apiClient.put(`/api/clients/${client.id}`, {
        ...client,
        idNumber: client.idNumber,
      })
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
    setDrugs([''])
    setInstructions("")
    setErrors({
      drugs: false,
      instructions: false,
    })
    setPrescriptionForm({
      date: new Date().toISOString().split('T')[0],
      nationalId: '',
      doctorName: '',
      signature: '',
    })
  }

  const savePrescription = async () => {
    if (!client) return

    // Validation: at least one of drugs or instructions must be filled
    const hasDrugs = drugs.some(d => d.trim().length > 0)
    const hasInstructions = instructions.trim().length > 0

    if (!hasDrugs && !hasInstructions) {
      setErrors({
        drugs: true,
        instructions: true,
      })
      return
    }

    setSavingPrescription(true)
    try {
      const filteredDrugs = drugs.filter(d => d.trim() !== '')

      const extraNotes = [
        prescriptionForm.nationalId ? `ת.ז: ${prescriptionForm.nationalId}` : null,
        prescriptionForm.signature ? `חתימה: ${prescriptionForm.signature}` : null,
      ].filter(Boolean).join(' | ')

      await apiClient.post('/api/prescriptions', {
        clientId: client.id,
        staffId: user?.id,
        date: prescriptionForm.date,
        drugs: filteredDrugs,
        instructions: instructions,
        doctorName: prescriptionForm.doctorName,
        notes: extraNotes,
      })

      if (id) {
        const prescriptionsData = await apiClient.get<Prescription[]>(
          `/api/prescriptions/client/${id}`
        )
        
        // Remove duplicates from fetched data
        const unique = Array.isArray(prescriptionsData)
          ? prescriptionsData.filter(
              (v, i, arr) => arr.findIndex(x => x.id === v.id) === i
            )
          : []
        
        setPrescriptions(unique)
      }

      closePrescriptionModal()
    } catch (err) {
      console.error('Save prescription failed:', err)
    } finally {
      setSavingPrescription(false)
    }
  }

  const handleDrugChange = (index: number, value: string) => {
    updateDrug(index, value)
    if (errors.drugs) {
      const hasDrugs = drugs.some((d, i) => (i === index ? value.trim() : d.trim()).length > 0)
      const hasInstructions = instructions.trim().length > 0
      if (hasDrugs || hasInstructions) {
        setErrors(prev => ({ ...prev, drugs: false }))
      }
    }
  }

  const handleInstructionsChange = (value: string) => {
    setInstructions(value)
    if (errors.instructions) {
      const hasDrugs = drugs.some(d => d.trim().length > 0)
      const hasInstructions = value.trim().length > 0
      if (hasDrugs || hasInstructions) {
        setErrors(prev => ({ ...prev, instructions: false }))
      }
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
    const token = localStorage.getItem('authToken')
    if (!token) {
      alert('אין הרשאה להורדת הקובץ')
      return
    }

    try {
      const blob = await apiClient.getBlob(`/api/prescriptions/${id}/pdf`)
      const url = window.URL.createObjectURL(blob)
       window.open(url);
       /* for download PDF
      // const link = document.createElement('a')
      // link.href = url
      // link.download = `prescription-${id}.pdf`
      // document.body.appendChild(link)
      // link.click()
      // link.remove()
      // window.URL.revokeObjectURL(url)
      */
    } catch (error) {
      console.error('Failed to download prescription PDF:', error)
      alert('שגיאה בהורדת קובץ המרשם')
    }
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

          {features?.prescriptionsEnabled !== false && (
          <button
            onClick={() => setShowPrescriptionModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl shadow-md hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg"
          >
            <FileText className="w-4 h-4" />
            <span>כתוב מרשם</span>
          </button>
          )}

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

        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {t("admin.clientProfile.title")}
          </h3>
        </div>

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

        <div>
          <label className={`block text-sm text-slate-500 mb-2 ${isRTL ? "text-right" : "text-left"}`}>
            תעודת זהות
          </label>
          <input
            type="text"
            value={client.idNumber || ''}
            onChange={(e) => setClient({ ...client, idNumber: e.target.value })}
            disabled={!editingClient}
            className={`w-full border rounded-lg p-3 ${
              isRTL ? "text-right" : "text-left"
            } ${!editingClient ? "bg-slate-50 text-slate-500" : ""}`}
          />
        </div>

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

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("notes")}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? "text-right" : "text-left"}`}>
              {t("admin.clientProfile.notesTitle")}
            </h3>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {notes.length}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
              openSections.includes("notes") ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {openSections.includes("notes") && (
          <div className="px-6 pb-6 space-y-6">
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
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("prescriptions")}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? "text-right" : "text-left"}`}>
              מרשמים
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {prescriptions.length}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
              openSections.includes("prescriptions") ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {openSections.includes("prescriptions") && (
          <div className="px-6 pb-6 space-y-4">
        <table className="w-full border mt-4">
          <thead>
            <tr>
              <th className="text-right p-2">תאריך</th>
              <th className="text-right p-2">תרופות</th>
              <th className="text-right p-2">רופא</th>
              <th className="text-right p-2">פעולות</th>
            </tr>
          </thead>

          <tbody>
            {prescriptions.map((p, index) => (
              <tr key={`${p.id}-${index}`} className="border-t">
                <td className="p-2 text-right">
                  {new Date(p.date).toLocaleDateString()}
                </td>

                <td className="p-2 text-right">
                  {p.drugs && p.drugs.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {p.drugs.map((drug, drugIndex) => (
                        <li key={`${p.id}-drug-${drugIndex}`}>{drug}</li>
                      ))}
                    </ul>
                  ) : (
                    "-"
                  )}
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
        )}
      </div>

      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <h3 className="text-xl font-bold sticky top-0 bg-white z-10 pb-2">כתיבת מרשם</h3>

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
              <label className="block text-sm mb-1">תרופות</label>
              <div className="space-y-2">
                {drugs.map((drug, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={drug}
                      onChange={(e) => handleDrugChange(index, e.target.value)}
                      className={`w-full border p-2 rounded ${errors.drugs ? 'border-red-500 border-2' : ''}`}
                      list="drug-options"
                      placeholder="בחר או כתוב תרופה"
                    />
                    <button
                      type="button"
                      onClick={() => removeDrug(index)}
                      className="px-3 py-2 rounded bg-red-100 text-red-700"
                    >
                      X
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addDrug}
                  className="px-3 py-2 rounded bg-slate-100 text-slate-700"
                >
                  +
                </button>
                <datalist id="drug-options">
                  {availableDrugs.map((d) => (
                    <option key={d.id} value={d.name} />
                  ))}
                </datalist>
              </div>

              <label className="mt-4 block text-sm mb-1">הוראות שימוש</label>
              <textarea
                value={instructions}
                onChange={(e) => handleInstructionsChange(e.target.value)}
                className={`w-full border p-2 rounded h-24 ${errors.instructions ? 'border-red-500 border-2' : ''}`}
              />
              {(errors.drugs || errors.instructions) && (
                <p className="text-red-500 text-sm mt-2">יש להזין לפחות תרופה אחת או הוראות שימוש</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">שם הרופא *</label>
                <input
                  type="text"
                  value={prescriptionForm.doctorName}
                  onChange={(e) => setPrescriptionForm(prev => ({ ...prev, doctorName: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                {currentStaff?.useStamp && stampSrc && (
                  <div className="mb-2 flex justify-end">
                    <img
                      src={stampSrc}
                      alt="חותמת"
                      className="h-16 object-contain border-b pb-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white z-10">
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
                disabled={savingPrescription || (!drugs.some(d => d.trim()) && !instructions.trim()) || !prescriptionForm.doctorName.trim()}
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