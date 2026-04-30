import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronDown, FileCheck, FileText, Image as ImageIcon, MessageSquare, Pill, User } from "lucide-react"
import { visitSummariesService, type VisitSummary } from '@/api/visitSummaries'
import { useAuth } from "@/contexts/AuthContext"
import { useFeatures } from "@/contexts/FeatureContext"
import * as apiClient from "@/api/apiClient"
import DrugAutocomplete from '@/components/DrugAutocomplete'
import ClientBeforeAfterPhotos from '@/components/ClientBeforeAfterPhotos'
import { consentsApi, type SignedConsent } from '@/api/consents'

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
  drugs?: Array<string | { display: string }>
}

interface CurrentStaff {
  id: string
   fullName?: string
  stampUrl?: string
  useStamp?: boolean
}

type ConsentViewRecord = SignedConsent & {
  clientSignatureUrl?: string | null
  doctorSignatureUrl?: string | null
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
  const [photosCount, setPhotosCount] = useState(0)
  const [signedConsents, setSignedConsents] = useState<SignedConsent[]>([])
  const [selectedConsent, setSelectedConsent] = useState<ConsentViewRecord | null>(null)
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
  const [drugs, setDrugs] = useState([
    { drugId: '', name: '', dosage: '', display: '' }
  ])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [instructions, setInstructions] = useState("")
  const [errors, setErrors] = useState({
    drugs: false,
    instructions: false,
  })
  const [openSections, setOpenSections] = useState<string[]>([])
  const [visitSummaries, setVisitSummaries] = useState<VisitSummary[]>([])
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

  const reloadConsents = async (clientId = id) => {
    if (!clientId || clientId === 'new') return

    try {
      const consentsData = await consentsApi.getSignedByClient(clientId)
      setSignedConsents(Array.isArray(consentsData) ? consentsData : [])
    } catch (error) {
      console.error('Failed loading consents:', error)
      setSignedConsents([])
    }
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
        await reloadConsents(id)

      } catch (err) {
        console.error("Load client failed:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  useEffect(() => {
  if (currentStaff?.fullName && !prescriptionForm.doctorName) {
    setPrescriptionForm(prev => ({
      ...prev,
      doctorName: currentStaff.fullName!,
    }))
  }
}, [currentStaff])

  useEffect(() => {
  if (currentStaff && !prescriptionForm.doctorName) {
    setPrescriptionForm(prev => ({
      ...prev,
      doctorName: user?.name || "", // או currentStaff.fullName אם יש לך
    }))
  }
}, [currentStaff])

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
    setDrugs(prev => [...prev, { drugId: '', name: '', dosage: '', display: '' }]);
  }

  const removeDrug = (index: number) => {
    setDrugs(prev => prev.length === 1 ? [{ drugId: '', name: '', dosage: '', display: '' }] : prev.filter((_, i) => i !== index));
  }

  const updateDrug = (index: number, drugObj: { drugId: string; name: string; dosage: string; display: string }) => {
    setDrugs(prev => prev.map((d, i) => (i === index ? drugObj : d)));
  }

  const formatDate = (date?: string | null) =>
    date ? new Date(date).toLocaleString(i18n.language) : "-"

  const getCounterClass = (count: number) =>
    `text-xs px-2 py-0.5 rounded-full ${
      count > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
    }`

  // Visit Summaries count
  const visitSummariesCount = visitSummaries.length
  // Load visit summaries when section is expanded
useEffect(() => {
  if (!client?.id) return;

  visitSummariesService.getByClientId(client.id)
    .then((data) => {
      console.log('VISIT SUMMARIES:', data); // לבדיקה
      setVisitSummaries(Array.isArray(data) ? data : []);
    })
    .catch((err) => {
      console.error('Visit summaries failed:', err);
      setVisitSummaries([]);
    });
}, [client?.id]);


useEffect(() => {
  if (!client?.id) return;
  if (!openSections.includes('visitSummaries')) return;

  visitSummariesService.getByClientId(client.id)
    .then((data) => setVisitSummaries(Array.isArray(data) ? data : []))
    .catch(() => setVisitSummaries([]));
}, [openSections]);
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
   setDrugs([{ drugId: '', name: '', dosage: '', display: '' }])
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
    const hasDrugs = drugs.some(d => (d.display || '').trim().length > 0)
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
      const filteredDrugs = drugs.filter(d => (d.display || '').trim() !== '')

      const extraNotes = [
        prescriptionForm.nationalId ? `ת.ז: ${prescriptionForm.nationalId}` : null,
        prescriptionForm.signature ? `חתימה: ${prescriptionForm.signature}` : null,
      ].filter(Boolean).join(' | ')

      await apiClient.post('/api/prescriptions', {
        clientId: client.id,
        staffId: user?.id,
        date: prescriptionForm.date,
        drugs: filteredDrugs.map(d => d.display),
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

  const handleInstructionsChange = (value: string) => {
    setInstructions(value)
    if (errors.instructions) {
      const hasDrugs = drugs.some(d => (d.display || '').trim().length > 0)
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
    const token = localStorage.getItem('token')
    if (!token) {
      alert('אין הרשאה להורדת הקובץ')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `${(import.meta as any).env.VITE_API_URL}/api/prescriptions/${id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      // 👇 קריטי
      if (!response.ok) {
        const text = await response.text()
        console.error('NOT PDF RESPONSE:', text)
        alert('Server returned error instead of PDF')
        return
      }

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `prescription-${id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
   
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
      `${(import.meta as any).env.VITE_API_URL}/api/prescriptions/${id}`,
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

  const resolveAssetUrl = (url?: string | null) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    const baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5146'
    return `${baseUrl}${url}`
  }

  const openConsent = async (consentId: string) => {
    try {
      const consent = await consentsApi.getById(consentId)
      setSelectedConsent(consent)
      setIsConsentModalOpen(true)
    } catch (err) {
      console.error('Failed loading consent:', err)
    }
  }

  const handleDeleteConsent = async (consentId: string) => {
    if (!confirm(t('are_you_sure'))) return

    try {
      await consentsApi.deleteConsent(consentId)

      if (selectedConsent?.id === consentId) {
        setSelectedConsent(null)
        setIsConsentModalOpen(false)
      }

      await reloadConsents()
    } catch (error) {
      console.error('Failed deleting consent:', error)
    }
  }

  const downloadConsentPdf = async (consentId: string) => {
    try {
      const blob = await consentsApi.downloadPdf(consentId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'consent.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed downloading consent PDF:', error)
      alert('Failed to download consent PDF')
    }
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
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            <h3 className="text-lg font-semibold text-slate-800">
              {t("admin.clientProfile.title")}
            </h3>
          </div>
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

    <div>
      <label className="block text-sm text-slate-500 mb-2">
        Notes
      </label>

      {editingClient ? (
        <textarea
          value={client.internalNote || ''}
          onChange={(e) =>
            setClient(prev => ({
              ...prev!,
              internalNote: e.target.value
            }))
          }
          className="w-full border rounded-lg p-3"
        />
      ) : (
        <div className="text-slate-800">
          {client.internalNote || "-"}
        </div>
      )}
    </div>

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
          value={client.lastVisit 
          ? new Date(client.lastVisit).toLocaleDateString() : "-"}
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

      {features?.visitSummariesEnabled && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("visitSummaries")}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? "text-right" : "text-left"}`}>
                סיכומי ביקור
              </h3>
              <span className={getCounterClass(visitSummariesCount)}>
                {visitSummariesCount}
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                openSections.includes("visitSummaries") ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>

          {openSections.includes("visitSummaries") && (
            <div className="px-6 pb-6 space-y-4">
              <div>
                <button
                  className="btn btn-primary mb-3"
                  onClick={() => client && navigate(`/staff/visit-summary/${client.id}`)}
                >
                  סיכום ביקור חדש
                </button>
              </div>
              {visitSummaries.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  אין סיכומי ביקור
                </div>
              ) : (
                <div className="space-y-3">
                  {visitSummaries.map((summary) => (
                    <div
                      key={summary.id}
                      className="border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="text-right">
                        <div className="font-medium">
                          {summary.createdAt ? new Date(summary.createdAt).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {summary.examination?.slice(0, 40)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => visitSummariesService.openPdf(summary.id)}
                          className="btn btn-sm"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("notes")}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? "text-right" : "text-left"}`}>
              {t("admin.clientProfile.notesTitle")}
            </h3>
            <span className={getCounterClass(notes.length)}>
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
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-green-400" />
            <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? "text-right" : "text-left"}`}>
              מרשמים
            </h3>
            <span className={getCounterClass(prescriptions.length)}>
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
                        <li key={`${p.id}-drug-${drugIndex}`}>
                        {typeof drug === 'string' ? drug : drug.display}
                      </li>
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

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("consents")}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
        >
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-purple-400" />
            <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? "text-right" : "text-left"}`}>
              {t('consents')}
            </h3>
            <span className={getCounterClass(signedConsents.length)}>
              {signedConsents.length}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
              openSections.includes("consents") ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>

        {openSections.includes("consents") && (
          <div className="px-6 pb-6 space-y-4">
            {signedConsents.length === 0 ? (
              <div className="text-gray-500">{t('common.noResults')}</div>
            ) : (
              <div className="space-y-3">
                {signedConsents.map((consent) => {
                  console.log('CONSENT DATA:', consent)

                  return (
                    <div
                      key={consent.id}
                      className="border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">
                          {consent.templateName || (consent.serviceName ? `${t('consent_document')} - ${consent.serviceName}` : t('consent_document'))}
                        </div>
                        <div className="text-xs text-slate-500">
                          {t('signed_on')} {formatDate(consent.signedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ActionButton
                          label={t('view')}
                          variant="secondary"
                          onClick={() => openConsent(consent.id)}
                        />
                        <ActionButton
                          label={t('download_pdf')}
                          variant="primary"
                          onClick={() => downloadConsentPdf(consent.id)}
                        />
                        <ActionButton
                          label={t('delete')}
                          variant="danger"
                          onClick={() => handleDeleteConsent(consent.id)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {features?.beforeAfterPhotosEnabled === true && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('beforeAfterPhotos')}
            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-400" />
              <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('clientPhotos.title')}
              </h3>
              <span className={getCounterClass(photosCount)}>
                {photosCount}
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
                openSections.includes('beforeAfterPhotos') ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>

          {openSections.includes('beforeAfterPhotos') && (
            <div className="px-6 pb-6">
              <ClientBeforeAfterPhotos clientId={client.id} onCountChange={setPhotosCount} />
            </div>
          )}
        </div>
      )}

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
                    <DrugAutocomplete
                      onSelect={(drugData) => {
                        const display = `${drugData.name} ${drugData.dosage || ''}`.trim();
                        updateDrug(index, {
                          drugId: drugData.id,
                          name: drugData.name,
                          dosage: drugData.dosage || '',
                          display
                        });
                      }}
                      placeholder={t('drugs.searchPlaceholder')}
                      className="w-full"
                    />
                    <input
                      type="text"
                      value={drug.display}
                      readOnly
                      className={`w-full border p-2 rounded bg-gray-100 ${errors.drugs ? 'border-red-500 border-2' : ''}`}
                      placeholder={t('drugs.searchPlaceholder')}
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
                <label className="block text-sm mb-1">שם הרופא </label>
                <input
                  type="text"
                  value={prescriptionForm.doctorName || currentStaff?.fullName || ""}
                  onChange={(e) =>
                    setPrescriptionForm(prev => ({
                      ...prev,
                      doctorName: e.target.value
                    }))
                  }
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
                disabled={savingPrescription || (!drugs.some(d => (d.display || '').trim()) && !instructions.trim()) || !prescriptionForm.doctorName.trim()}
              >
                {savingPrescription ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConsentViewModal
        isOpen={isConsentModalOpen}
        consent={selectedConsent}
        onClose={() => setIsConsentModalOpen(false)}
        onDownload={() => selectedConsent && downloadConsentPdf(selectedConsent.id)}
        resolveAssetUrl={resolveAssetUrl}
        t={t}
      />
    </div>
  )
}

/* ================= COMPONENTS ================= */

function ActionButton({ label, onClick, variant, disabled }: any) {
  const base = 'px-3 py-1.5 rounded-lg text-sm flex items-center gap-1'

  const styles = {
    primary: 'bg-blue-600 text-white',
    secondary: 'border border-slate-300 text-slate-700',
    danger: 'text-red-500',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant as keyof typeof styles] || styles.secondary} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  )
}

function ConsentViewModal({ isOpen, consent, onClose, onDownload, resolveAssetUrl, t }: any) {
  if (!isOpen || !consent) return null

  console.log('Doctor signature:', consent.doctorSignatureUrl)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            {consent.templateName || (consent.serviceName ? `${t('consent_document')} - ${consent.serviceName}` : t('consent_document'))}
          </h3>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700"
          >
            {t('common.close')}
          </button>
        </div>

        <div
          className="border border-slate-200 rounded-xl p-5 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: consent.consentContent }}
        />

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="text-center">
            <div className="text-sm text-slate-500 mb-2">חתימת רופא</div>
            {consent.doctorSignatureUrl ? (
              <img
                src={resolveAssetUrl(consent.doctorSignatureUrl) || consent.doctorSignatureUrl}
                alt="Doctor signature"
                className="h-16 object-contain mx-auto"
              />
            ) : (
              <span className="text-slate-400">אין</span>
            )}
          </div>

          <div className="text-center">
            <div className="text-sm text-slate-500 mb-2">חתימת לקוח</div>
            {consent.clientSignatureUrl ? (
              <img
                src={resolveAssetUrl(consent.clientSignatureUrl) || consent.clientSignatureUrl}
                alt="Client signature"
                className="h-16 object-contain mx-auto"
              />
            ) : (
              <span className="text-slate-400">אין</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <ActionButton
            label={t('download_pdf')}
            variant="primary"
            onClick={onDownload}
          />
        </div>
      </div>
    </div>
  )
}

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