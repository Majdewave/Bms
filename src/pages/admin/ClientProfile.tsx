import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronDown, Download, Edit, Eye, FileCheck, FileText, Image as ImageIcon, MessageSquare, Pill, Printer, Trash2, User } from "lucide-react"
import { visitSummariesService, type VisitSummary } from '@/api/visitSummaries'
import { clientsService, imagingService, invoicesService } from '@/api'
import type { Invoice } from '@/api/invoices'
import type { ImagingStudyHierarchy, ImagingStudySummary } from '@/api/imaging'
import { useAuth } from "@/contexts/AuthContext"
import { useDepartmentFeatures } from "@/contexts/DepartmentFeatureContext"
import * as apiClient from "@/api/apiClient"
import DrugAutocomplete from '@/components/DrugAutocomplete'
import ClientBeforeAfterPhotos from '@/components/ClientBeforeAfterPhotos'
import DicomViewerErrorBoundary from '@/components/imaging/DicomViewerErrorBoundary'
import { consentsApi, type SignedConsent } from '@/api/consents'
import { getImagingModalityLabel } from '@/utils/imaging'

const DicomViewer = lazy(() => import('@/components/imaging/DicomViewer'))

interface Client {
  id: string
  fullName: string
  email: string
  phone: string
  idNumber?: string
  birthDate?: string
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
  drugs?: Array<string | { drugId?: string; name?: string; dosage?: string; frequency?: string; duration?: string; display: string }>
  instructions?: string
  notes?: string
  nationalId?: string
  signature?: string
}

type PrescriptionDrugInput = {
  drugId: string
  name: string
  dosage: string
  display: string
  frequency?: string
  duration?: string
}

const emptyPrescriptionDrug = (): PrescriptionDrugInput => ({
  drugId: '',
  name: '',
  dosage: '',
  display: '',
})

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string') {
      return value
    }
  }
  return ''
}

const normalizePrescriptionDrug = (raw: any): string | PrescriptionDrugInput | null => {
  if (typeof raw === 'string') {
    return raw.trim()
  }

  if (!raw || typeof raw !== 'object') {
    return null
  }

  const name = pickString(raw.name, raw.Name, raw.drugName, raw.DrugName)
  const dosage = pickString(raw.dosage, raw.Dosage)
  const frequency = pickString(raw.frequency, raw.Frequency)
  const duration = pickString(raw.duration, raw.Duration)
  const explicitDisplay = pickString(raw.display, raw.Display, raw.text, raw.Text)
  const compositeDisplay = [name, dosage, frequency, duration].filter(Boolean).join(' ').trim()
  const display = explicitDisplay || compositeDisplay || name

  if (!display) {
    return null
  }

  return {
    drugId: pickString(raw.drugId, raw.DrugId, raw.id, raw.Id) || 'custom',
    name: name || display,
    dosage,
    frequency,
    duration,
    display,
  }
}

const normalizePrescription = (raw: any): Prescription => {
  const item = raw?.data ?? raw
  const rawDrugs = item?.drugs ?? item?.Drugs ?? item?.medications ?? item?.Medications
  const drugs = Array.isArray(rawDrugs)
    ? rawDrugs
        .map(normalizePrescriptionDrug)
        .filter((drug): drug is string | PrescriptionDrugInput => Boolean(drug))
    : []

  return {
    id: pickString(item?.id, item?.Id),
    date: pickString(item?.date, item?.Date, item?.prescriptionDate, item?.PrescriptionDate),
    doctorName: pickString(item?.doctorName, item?.DoctorName, item?.staffName, item?.StaffName),
    drugs,
    instructions: pickString(item?.instructions, item?.Instructions, item?.usageInstructions, item?.UsageInstructions),
    notes: pickString(item?.notes, item?.Notes),
    nationalId: pickString(item?.nationalId, item?.NationalId, item?.idNumber, item?.IdNumber),
    signature: pickString(item?.signature, item?.Signature),
  }
}

const parsePrescriptionNotes = (rawNotes?: string | null) => {
  const parts = (rawNotes || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)

  let nationalId = ''
  let signature = ''
  const freeNotes: string[] = []

  for (const part of parts) {
    if (part.startsWith('ת.ז:')) {
      nationalId = part.replace('ת.ז:', '').trim()
      continue
    }

    if (part.toLowerCase().startsWith('id:')) {
      nationalId = part.slice(3).trim()
      continue
    }

    if (part.startsWith('חתימה:')) {
      signature = part.replace('חתימה:', '').trim()
      continue
    }

    if (part.toLowerCase().startsWith('signature:')) {
      signature = part.slice(10).trim()
      continue
    }

    freeNotes.push(part)
  }

  return {
    nationalId,
    signature,
    notes: freeNotes.join(' | '),
  }
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
  const { departmentFeatures } = useDepartmentFeatures()
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
  const [drugs, setDrugs] = useState<PrescriptionDrugInput[]>([emptyPrescriptionDrug()])
  const [loading, setLoading] = useState(true)
  const [editingClient, setEditingClient] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [checkingClientIdNumber, setCheckingClientIdNumber] = useState(false)
  const [duplicateClientName, setDuplicateClientName] = useState<string | null>(null)
  const [showDuplicateClientModal, setShowDuplicateClientModal] = useState(false)
  const [clientIdNumberError, setClientIdNumberError] = useState<string | null>(null)
  const lastCheckedClientIdNumber = useRef('')
  const [newNote, setNewNote] = useState("")
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false)
  const [prescriptionMode, setPrescriptionMode] = useState<'create' | 'edit'>('create')
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null)
  const [loadingPrescriptionData, setLoadingPrescriptionData] = useState(false)
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [instructions, setInstructions] = useState("")
  const [prescriptionNotes, setPrescriptionNotes] = useState("")
  // drugs input validation state
  const [errors, setErrors] = useState({
    drugs: false
  })
  const [openSections, setOpenSections] = useState<string[]>([])
  const [visitSummaries, setVisitSummaries] = useState<VisitSummary[]>([])
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([])
  const [imagingStudies, setImagingStudies] = useState<ImagingStudySummary[]>([])
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudyHierarchy | null>(null)
  const [selectedSeriesIndex, setSelectedSeriesIndex] = useState(0)
  const [selectedInstanceIndex, setSelectedInstanceIndex] = useState(0)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [imagingLoading, setImagingLoading] = useState(false)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
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
    if (!showPrescriptionModal || !client || prescriptionMode === 'edit') return

    setPrescriptionForm((prev) => ({
      ...prev,
      nationalId: client.idNumber ?? '',
    }))
  }, [showPrescriptionModal, client, prescriptionMode])

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

        const prescriptionsData = departmentFeatures?.prescriptionsEnabled
          ? await apiClient.get<Prescription[]>(`/api/prescriptions/client/${id}`)
          : []
        setNotes(Array.isArray(notesData) ? notesData : [])
        
        // Remove duplicates from fetched prescriptions
        const unique = Array.isArray(prescriptionsData)
          ? prescriptionsData.filter(
              (v, i, arr) => arr.findIndex(x => x.id === v.id) === i
            )
          : []

        setPrescriptions(unique.map(normalizePrescription))
        if (departmentFeatures?.consentFormsEnabled) {
          await reloadConsents(id)
        } else {
          setSignedConsents([])
        }

      } catch (err) {
        console.error("Load client failed:", err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, departmentFeatures?.prescriptionsEnabled, departmentFeatures?.consentFormsEnabled])

  useEffect(() => {
  if (prescriptionMode !== 'edit' && currentStaff?.fullName && !prescriptionForm.doctorName) {
    setPrescriptionForm(prev => ({
      ...prev,
      doctorName: currentStaff.fullName!,
    }))
  }
}, [currentStaff, prescriptionForm.doctorName, prescriptionMode])


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
    setDrugs(prev => [...prev, emptyPrescriptionDrug()]);
  }

  const removeDrug = (index: number) => {
    setDrugs(prev => {
      const updated =
        prev.length === 1
          ? [emptyPrescriptionDrug()]
          : prev.filter((_, i) => i !== index);

      const hasDrug = updated.some(d => d.display.trim() !== '');

      if (hasDrug) {
        setErrors({ drugs: false });
      }

      return updated;
    });
  }

  const updateDrug = (index: number, drugObj: PrescriptionDrugInput) => {
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
  if (!departmentFeatures?.visitSummariesEnabled) {
    setVisitSummaries([]);
    return;
  }

  if (!client?.id) return;

  visitSummariesService.getByClientId(client.id)
    .then((data) => {
      setVisitSummaries(Array.isArray(data) ? data : []);
    })
    .catch((err) => {
      console.error('Visit summaries failed:', err);
      setVisitSummaries([]);
    });
}, [client?.id, departmentFeatures?.visitSummariesEnabled]);


useEffect(() => {
  if (!departmentFeatures?.visitSummariesEnabled) {
    return;
  }

  if (!client?.id) return;
  if (!openSections.includes('visitSummaries')) return;

  visitSummariesService.getByClientId(client.id)
    .then((data) => setVisitSummaries(Array.isArray(data) ? data : []))
    .catch(() => setVisitSummaries([]));
}, [openSections, client?.id, departmentFeatures?.visitSummariesEnabled]);

  useEffect(() => {
    const loadClientInvoices = async () => {
      if (!client?.id || !openSections.includes('invoices')) {
        return
      }

      setInvoicesLoading(true)
      try {
        const invoices = await invoicesService.getInvoices()
        const filtered = invoices
          .filter((invoice) => invoice.clientId === client.id)
          .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())

        setClientInvoices(filtered)
      } catch (error) {
        console.error('Failed to load client invoices:', error)
        setClientInvoices([])
      } finally {
        setInvoicesLoading(false)
      }
    }

    void loadClientInvoices()
  }, [client?.id, openSections])

  useEffect(() => {
    const loadImagingStudies = async () => {
      if (!client?.id || !openSections.includes('imaging')) {
        return
      }

      setImagingLoading(true)
      try {
        const studies = await imagingService.getClientImagingStudies(client.id)
        const sortedStudies = Array.isArray(studies) ? studies : []
        setImagingStudies(sortedStudies)

        if (sortedStudies.length === 0) {
          setSelectedStudy(null)
          setSelectedSeriesIndex(0)
          setSelectedInstanceIndex(0)
          return
        }

        const firstStudy = sortedStudies[0]
        const hierarchy = await imagingService.getStudyHierarchy(firstStudy.id)
        setSelectedStudy(hierarchy)
        setSelectedSeriesIndex(0)
        setSelectedInstanceIndex(0)
      } catch (error) {
        console.error('Failed to load imaging studies:', error)
        setImagingStudies([])
        setSelectedStudy(null)
      } finally {
        setImagingLoading(false)
      }
    }

    void loadImagingStudies()
  }, [client?.id, openSections])

  const getInvoiceStatusLabel = (status: Invoice['status']) => {
    if (status === 'paid') return t('admin.invoices.status.paid')
    if (status === 'pending') return t('admin.invoices.status.pending')
    if (status === 'partially_paid') return i18n.language === 'he' ? 'שולם חלקית' : i18n.language === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid'
    if (status === 'cancelled') return i18n.language === 'he' ? 'בוטל' : i18n.language === 'ar' ? 'ملغي' : 'Cancelled'
    return t('common.status')
  }

  const handleInvoiceDocumentAction = async (invoice: Invoice, action: 'view' | 'download' | 'print') => {
    try {
      const blob = await invoicesService.downloadInvoice(invoice.id)
      const url = window.URL.createObjectURL(blob)

      if (action === 'download') {
        const link = document.createElement('a')
        link.href = url
        link.download = `${invoice.number}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        return
      }

      const targetWindow = window.open(url, '_blank')
      if (targetWindow && action === 'print') {
        targetWindow.onload = () => targetWindow.print()
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 10000)
    } catch (error) {
      console.error(`Failed to ${action} invoice:`, error)
    }
  }

  const performPdfAction = (blob: Blob, fileName: string, action: 'view' | 'download' | 'print') => {
    const url = window.URL.createObjectURL(blob)

    if (action === 'download') {
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return
    }

    const targetWindow = window.open(url, '_blank')
    if (targetWindow && action === 'print') {
      targetWindow.onload = () => targetWindow.print()
    }

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url)
    }, 10000)
  }

  const fetchProtectedPdfBlob = async (url: string) => {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Missing auth token')
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Failed to load document')
    }

    return response.blob()
  }

  const handlePrescriptionDocumentAction = async (prescriptionId: string, action: 'view' | 'download' | 'print') => {
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5146'
      const blob = await fetchProtectedPdfBlob(`${baseUrl}/api/prescriptions/${prescriptionId}/pdf`)
      performPdfAction(blob, `prescription-${prescriptionId}.pdf`, action)
    } catch (error) {
      console.error(`Failed to ${action} prescription PDF:`, error)
    }
  }

  const handleVisitSummaryDocumentAction = async (summaryId: string, action: 'view' | 'download' | 'print') => {
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5146'
      const blob = await fetchProtectedPdfBlob(`${baseUrl}/api/VisitSummary/${summaryId}/pdf`)
      performPdfAction(blob, `visit-summary-${summaryId}.pdf`, action)
    } catch (error) {
      console.error(`Failed to ${action} visit summary PDF:`, error)
    }
  }
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

  const isDuplicateConflictError = (err: any) => {
    return err?.status === 409 && err?.response?.code === 'DUPLICATE_CLIENT_ID_NUMBER'
  }

  const clearClientIdDuplicateState = () => {
    setDuplicateClientName(null)
    setClientIdNumberError(null)
  }

  const applyClientIdDuplicateState = (clientName?: string | null) => {
    setDuplicateClientName(clientName || null)
    setClientIdNumberError(t('admin.clients.form.duplicateIdNumberInline'))
    setShowDuplicateClientModal(true)
  }

  const checkDuplicateClientIdNumber = async (rawIdNumber?: string | null) => {
    if (!client?.id) return false

    const normalizedIdNumber = (rawIdNumber || '').trim()

    if (!normalizedIdNumber) {
      clearClientIdDuplicateState()
      lastCheckedClientIdNumber.current = ''
      return false
    }

    if (checkingClientIdNumber || lastCheckedClientIdNumber.current === normalizedIdNumber) {
      return Boolean(clientIdNumberError)
    }

    setCheckingClientIdNumber(true)
    try {
      const result = await clientsService.checkDuplicateClientIdNumber(normalizedIdNumber, client.id)
      lastCheckedClientIdNumber.current = normalizedIdNumber
      if (result?.exists) {
        applyClientIdDuplicateState(result.clientName)
        return true
      }

      clearClientIdDuplicateState()
      return false
    } catch (err: any) {
      if (isDuplicateConflictError(err)) {
        applyClientIdDuplicateState(err?.response?.clientName)
        return true
      }
      return false
    } finally {
      setCheckingClientIdNumber(false)
    }
  }

const saveClient = async () => {
  if (!client) return

  const hasDuplicateIdNumber = await checkDuplicateClientIdNumber(client.idNumber)
  if (hasDuplicateIdNumber) {
    return
  }

  setSavingClient(true)

  try {
    const payload = {
      ...client,
      idNumber: client.idNumber?.trim() || null,
      birthDate: client.birthDate || null,
      email: client.email?.trim() || null,
      address: client.address?.trim() || null,
      internalNote: client.internalNote?.trim() || null,
    }

    await apiClient.put(`/api/clients/${client.id}`, payload)

    setEditingClient(false)
  } catch (err: any) {
    if (isDuplicateConflictError(err)) {
      applyClientIdDuplicateState(err?.response?.clientName)
      return
    }
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
    setLoadingPrescriptionData(false)
    setPrescriptionMode('create')
    setEditingPrescriptionId(null)
    setShowPrescriptionModal(false);
  }

  const openCreatePrescriptionModal = () => {
    if (!client) return

    setPrescriptionMode('create')
    setEditingPrescriptionId(null)
    setLoadingPrescriptionData(false)
    setPrescriptionForm({
      date: new Date().toISOString().split('T')[0],
      nationalId: client.idNumber ?? '',
      doctorName: currentStaff?.fullName ?? '',
      signature: '',
    })
    setDrugs([emptyPrescriptionDrug()])
    setInstructions('')
    setPrescriptionNotes('')
    setErrors({ drugs: false })
    setShowPrescriptionModal(true)
  }

  const mapDrugsForForm = (sourceDrugs?: Prescription['drugs']) => {
    const normalized = Array.isArray(sourceDrugs)
      ? sourceDrugs
          .map(normalizePrescriptionDrug)
          .filter((drug): drug is string | PrescriptionDrugInput => Boolean(drug))
      : []

    if (normalized.length === 0) {
      return [emptyPrescriptionDrug()]
    }

    return normalized.map((drug) => {
      if (typeof drug === 'string') {
        return {
          drugId: 'custom',
          name: drug,
          dosage: '',
          display: drug,
        }
      }

      return {
        drugId: drug.drugId || 'custom',
        name: drug.name || drug.display,
        dosage: drug.dosage || '',
        frequency: drug.frequency || '',
        duration: drug.duration || '',
        display: drug.display,
      }
    })
  }

  const applyPrescriptionToForm = (prescription: Prescription) => {
    const parsedNotes = parsePrescriptionNotes(prescription.notes)
    const dateOnly = (prescription.date || '').includes('T')
      ? prescription.date.split('T')[0]
      : prescription.date || new Date().toISOString().split('T')[0]

    setPrescriptionForm({
      date: dateOnly,
      nationalId: prescription.nationalId || parsedNotes.nationalId || client?.idNumber || '',
      doctorName: prescription.doctorName || currentStaff?.fullName || '',
      signature: prescription.signature || parsedNotes.signature || '',
    })
    setInstructions(prescription.instructions || '')
    setPrescriptionNotes(parsedNotes.notes)
    setDrugs(mapDrugsForForm(prescription.drugs))
    setErrors({ drugs: false })
  }

  const openEditPrescriptionModal = async (prescription: Prescription) => {
    if (!prescription?.id) return

    setPrescriptionMode('edit')
    setEditingPrescriptionId(prescription.id)
    setLoadingPrescriptionData(true)
    setShowPrescriptionModal(true)

    try {
      const response = await apiClient.get<any>(`/api/prescriptions/${prescription.id}`)
      const normalized = normalizePrescription(response)
      applyPrescriptionToForm(normalized.id ? normalized : normalizePrescription(prescription))
    } catch (error) {
      console.error('Load prescription for edit failed:', error)
      applyPrescriptionToForm(normalizePrescription(prescription))
    } finally {
      setLoadingPrescriptionData(false)
    }
  }

  const savePrescription = async () => {
    if (!client) return

    // Validation: drugs must be filled
      const hasDrugs = drugs.some(d => (d.display || '').trim().length > 0);
      if (!hasDrugs) {
        setErrors({
          drugs: true,
        });
        return;
      }
      setErrors({
        drugs: false,
      });

    setSavingPrescription(true)
    try {
      const filteredDrugs = drugs.filter(d => (d.display || '').trim() !== '')

      const extraNotes = [
        prescriptionForm.nationalId ? `ת.ז: ${prescriptionForm.nationalId}` : null,
        prescriptionForm.signature ? `חתימה: ${prescriptionForm.signature}` : null,
        prescriptionNotes.trim() ? prescriptionNotes.trim() : null,
      ].filter(Boolean).join(' | ')

      const payload = {
        clientId: client.id,
        staffId: user?.id,
        date: prescriptionForm.date,
        drugs: filteredDrugs.map(d => d.display),
        instructions: instructions,
        doctorName: prescriptionForm.doctorName,
        notes: extraNotes,
      }

      if (prescriptionMode === 'edit' && editingPrescriptionId) {
        await apiClient.put(`/api/prescriptions/${editingPrescriptionId}`, payload)
      } else {
        await apiClient.post('/api/prescriptions', payload)
      }

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

        setPrescriptions(unique.map(normalizePrescription))
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

  const handleImagingStudyClick = async (studyId: string) => {
    try {
      setImagingLoading(true)
      const hierarchy = await imagingService.getStudyHierarchy(studyId)
      setSelectedStudy(hierarchy)
      setSelectedSeriesIndex(0)
      setSelectedInstanceIndex(0)
    } catch (error) {
      console.error('Failed to load imaging study hierarchy:', error)
    } finally {
      setImagingLoading(false)
    }
  }

  const currentSeries = selectedStudy?.series?.[selectedSeriesIndex] ?? null
  const viewableInstances = currentSeries?.instances?.filter((instance) => instance.storageStatus === 'LocalAndS3') ?? []

  const handleSeriesSelect = (index: number) => {
    setSelectedSeriesIndex(index)
    setSelectedInstanceIndex(0)
    setIsViewerOpen(false)
  }

  const handleOpenViewer = () => {
    console.log('[Imaging] user requested viewer')
    setSelectedInstanceIndex(0)
    setIsViewerOpen(true)
  }

  const handleViewerSeriesChange = (index: number) => {
    setSelectedSeriesIndex(index)
    setSelectedInstanceIndex(0)
  }

  const handleCloseViewer = () => {
    setIsViewerOpen(false)
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
      const fileName = client?.idNumber
            ? `Consent_${client.idNumber}.pdf`
            : `Consent_${consentId}.pdf`

      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed downloading consent PDF:', error)
      alert('Failed to download consent PDF')
    }
  }

   // --- Visit Summary Actions ---
  const handleDelete = async (id: string) => {
    if (!confirm('למחוק את הסיכום?')) return;
    try {
      await visitSummariesService.delete(id);
      setVisitSummaries(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error(e);
      alert('שגיאה במחיקה');
    }
  };

  const handleEditSummary = (summary: VisitSummary) => {
    if (!client?.id) return
    const params = new URLSearchParams()
    if (summary.appointmentId) {
      params.set('appointmentId', summary.appointmentId)
    }
    params.set('summaryId', summary.id)
    params.set('mode', 'edit')
    navigate(`/staff/visit-summary/${client.id}?${params.toString()}`)
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

    if (!departmentFeatures)
      return null;
    

  return (
    <div
      className="max-w-4xl mx-auto p-2 md:p-8 space-y-6 md:space-y-8"
      dir={isRTL ? "rtl" : "ltr"}
    >

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">

        <h1 className="text-2xl font-bold text-slate-800">
          {t("admin.clientProfile.title")}
        </h1>

        <div className="flex flex-wrap gap-2 md:gap-3">

          {departmentFeatures.prescriptionsEnabled === true && (
          <button
            onClick={openCreatePrescriptionModal}
            className="flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl shadow-md hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg text-sm"
          >
            <FileText className="w-4 h-4" />
            <span>כתוב מרשם</span>
          </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-200 rounded-lg text-sm"
          >
            {t("common.back")}
          </button>

          {!editingClient && (
            <button
              onClick={() => setEditingClient(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              {t("common.edit")}
            </button>
          )}

        </div>
      </div>


      {/* CLIENT CARD */}

      <div className="bg-white rounded-2xl shadow-md p-3 md:p-8 space-y-6">

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
            onChange={(e) => {
              const nextValue = e.target.value
              setClient({ ...client, idNumber: nextValue })
              clearClientIdDuplicateState()
              lastCheckedClientIdNumber.current = ''
            }}
            onBlur={() => {
              if (editingClient) {
                void checkDuplicateClientIdNumber(client.idNumber)
              }
            }}
            disabled={!editingClient}
            className={`w-full border rounded-lg p-3 ${
              isRTL ? "text-right" : "text-left"
            } ${!editingClient ? "bg-slate-50 text-slate-500" : ""} ${clientIdNumberError ? 'border-red-500' : ''}`}
          />
          {checkingClientIdNumber && editingClient && (
            <p className="text-xs text-slate-500 mt-1">
              {t('admin.clients.form.checkingIdNumber')}
            </p>
          )}
          {clientIdNumberError && editingClient && (
            <p className="text-sm text-red-500 mt-1">
              {clientIdNumberError}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-500 mb-2">
            תאריך לידה
          </label>

          <input
            type="date"
            value={
              client.birthDate
                ? client.birthDate.split('T')[0]
                : ''
            }
            onChange={(e) =>
              setClient({
                ...client,
                birthDate: e.target.value
              })
            }
            disabled={!editingClient}
            className={`w-full border rounded-lg p-3 ${
              !editingClient ? 'bg-slate-50 text-slate-500' : ''
            }`}
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
              disabled={savingClient || checkingClientIdNumber}
              className="px-6 py-2 bg-green-600 text-white rounded-lg"
            >
              {savingClient ? t("common.saving") : t("common.save")}
            </button>
          </div>
        )}

        {showDuplicateClientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
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
                  onClick={() => setShowDuplicateClientModal(false)}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NOTES */}

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('imaging')}
          className="w-full p-3 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-violet-400" />
            <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('imaging.title')}
            </h3>
            <span className={getCounterClass(imagingStudies.length)}>
              {imagingStudies.length}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
              openSections.includes('imaging') ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        {openSections.includes('imaging') && (
          <div className="px-3 md:px-6 pb-4 md:pb-6 space-y-4">
            {imagingLoading ? (
              <div className="py-6 text-slate-500">{t('imaging.loading')}</div>
            ) : imagingStudies.length === 0 ? (
              <div className="py-6 text-slate-500">{t('imaging.noStudies')}</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
                  {imagingStudies.map((study) => (
                    <button
                      key={study.id}
                      type="button"
                      onClick={() => void handleImagingStudyClick(study.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${
                        selectedStudy?.id === study.id
                          ? 'border-violet-500 bg-violet-50 text-violet-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-semibold">{study.accessionNumber}</div>
                      <div className="text-xs text-slate-500">{getImagingModalityLabel(study.modality, t)}</div>
                      <div className="text-xs text-slate-500">{new Date(study.receivedAt).toLocaleDateString(i18n.language)}</div>
                    </button>
                  ))}
                </div>

                {selectedStudy && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm text-slate-500">{t('imaging.accession')}</div>
                        <div className="font-semibold text-slate-800">{selectedStudy.accessionNumber}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">{t('imaging.modality')}</div>
                        <div className="font-semibold text-slate-800">{getImagingModalityLabel(selectedStudy.modality, t)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">{t('imaging.storage')}</div>
                        <div className="font-semibold text-slate-800">{selectedStudy.storageStatus}</div>
                      </div>
                    </div>

                    {selectedStudy.series.length > 1 && (
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-slate-700">{t('imaging.selectSeries')}</div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedStudy.series.map((series, index) => {
                            const isSelected = index === selectedSeriesIndex

                            return (
                              <button
                                key={series.id}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => handleSeriesSelect(index)}
                                className={`rounded-xl border p-4 text-left transition ${
                                  isSelected
                                    ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                                    : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40'
                                }`}
                              >
                                <div className="text-sm font-semibold text-slate-800">
                                  {t('imaging.seriesX', { number: series.seriesNumber ?? index + 1 })}
                                </div>
                                <div className="mt-1 text-sm text-slate-700">
                                  {series.seriesDescription || `${t('imaging.series')} ${index + 1}`}
                                </div>
                                <div className="mt-2 text-xs text-slate-500">
                                  {getImagingModalityLabel(series.modality, t)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {series.instances.length} {t('imaging.images')}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {currentSeries && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-slate-500">{t('imaging.series')}</div>
                              <div className="font-semibold text-slate-800">
                                {currentSeries.seriesDescription || `${t('imaging.series')} ${selectedSeriesIndex + 1}`}
                              </div>
                            </div>
                            <div className="text-right text-sm text-slate-500">
                              {selectedSeriesIndex + 1} / {selectedStudy.series.length}
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
                            <div><strong>{t('imaging.series')}:</strong> {currentSeries.seriesNumber ?? selectedSeriesIndex + 1}</div>
                            <div><strong>{t('imaging.modality')}:</strong> {getImagingModalityLabel(currentSeries.modality, t)}</div>
                            <div><strong>{t('imaging.instances')}:</strong> {currentSeries.instances.length}</div>
                            <div><strong>{t('imaging.viewable')}:</strong> {viewableInstances.length}</div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={handleOpenViewer}
                              disabled={viewableInstances.length === 0}
                              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {viewableInstances.length === 0
                                ? t('imaging.notAvailableForViewing')
                                : viewableInstances.length === 1
                                  ? t('imaging.viewImage')
                                  : t('imaging.viewImages')}
                            </button>

                            {isViewerOpen && (
                              <button
                                type="button"
                                onClick={handleCloseViewer}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                {t('common.close')}
                              </button>
                            )}
                          </div>

                          {isViewerOpen && viewableInstances.length === 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                              {t('imaging.notAvailableForViewing')}
                            </div>
                          )}
                        </div>

                        {isViewerOpen && viewableInstances.length > 0 && (
                          <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{t('imaging.loadingImage')}</div>}>
                            <DicomViewerErrorBoundary>
                              <DicomViewer
                                instances={viewableInstances}
                                currentIndex={selectedInstanceIndex}
                                onCurrentIndexChange={setSelectedInstanceIndex}
                                study={selectedStudy}
                                series={selectedStudy.series}
                                selectedSeriesIndex={selectedSeriesIndex}
                                onSeriesChange={handleViewerSeriesChange}
                              />
                            </DicomViewerErrorBoundary>
                          </Suspense>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {departmentFeatures.visitSummariesEnabled === true && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("visitSummaries")}
            className="w-full p-3 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition"
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
                  {visitSummaries.map((summary,index) => (
                                  <div
                className={`
                  flex items-center justify-between rounded-lg px-4 py-3 border
                  ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                `}
                key={summary.id}
              >
                
                {/* צד שמאל — פעולות */}
                <div className="flex items-center gap-3 text-sm">
                  <ActionIconButton
                    title={t('view')}
                    onClick={() => void handleVisitSummaryDocumentAction(summary.id, 'view')}
                    tone="default"
                    icon={<Eye className="w-4 h-4" />}
                  />
                  <ActionIconButton
                    title={t('download_pdf')}
                    onClick={() => void handleVisitSummaryDocumentAction(summary.id, 'download')}
                    tone="info"
                    icon={<Download className="w-4 h-4" />}
                  />
                  <ActionIconButton
                    title={t('common.print')}
                    onClick={() => void handleVisitSummaryDocumentAction(summary.id, 'print')}
                    tone="default"
                    icon={<Printer className="w-4 h-4" />}
                  />
                  <ActionIconButton
                    title={t('common.edit')}
                    onClick={() => handleEditSummary(summary)}
                    tone="info"
                    icon={<Edit className="w-4 h-4" />}
                  />
                  <ActionIconButton
                    title={t('delete')}
                    onClick={() => void handleDelete(summary.id)}
                    tone="danger"
                    icon={<Trash2 className="w-4 h-4" />}
                  />
                </div>

                {/* צד ימין — תאריך בלבד */}
                <div className="text-right font-medium">
                  {summary.createdAt ? new Date(summary.createdAt).toLocaleDateString() : '-'}
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
          onClick={() => toggleSection('invoices')}
          className="w-full p-3 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className={`text-lg font-semibold text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>
              חשבוניות
            </h3>
            <span className={getCounterClass(clientInvoices.length)}>
              {clientInvoices.length}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${
              openSections.includes('invoices') ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>

        {openSections.includes('invoices') && (
          <div className="px-3 md:px-6 pb-4 md:pb-6 space-y-4">
            {invoicesLoading ? (
              <div className="py-6 text-slate-500">{t('common.loading')}</div>
            ) : clientInvoices.length === 0 ? (
              <div className="py-6 text-slate-500">לא נמצאו חשבוניות</div>
            ) : (
              <>
                <div className="flex flex-col gap-3 md:hidden">
                  {clientInvoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="text-sm text-slate-500">{t('admin.clientProfile.invoiceNumber')} <span className="font-semibold text-slate-800">{invoice.number}</span></div>
                      <div className="text-sm text-slate-500">{t('admin.clientProfile.date')} <span className="font-semibold text-slate-800">{new Date(invoice.invoiceDate).toLocaleDateString(i18n.language)}</span></div>
                      <div className="text-sm text-slate-500">{t('admin.clientProfile.amount')} <span className="font-semibold text-slate-800">{invoice.totalAmount.toFixed(2)}</span></div>
                      <div className="text-sm text-slate-500">{t('common.status')} <span className="font-semibold text-slate-800">{getInvoiceStatusLabel(invoice.status)}</span></div>
                      <div className="flex items-center gap-2 pt-1">
                        <ActionButton label={t('view')} variant="secondary" onClick={() => void handleInvoiceDocumentAction(invoice, 'view')} />
                        <ActionButton label={t('admin.clientProfile.download')} variant="primary" onClick={() => void handleInvoiceDocumentAction(invoice, 'download')} />
                        <ActionButton label={t('common.print')} variant="secondary" onClick={() => void handleInvoiceDocumentAction(invoice, 'print')} />
                      </div>
                    </div>
                  ))}
                </div>

                <table className="hidden md:table w-full border mt-2">
                  <thead>
                    <tr>
                      <th className="text-right p-2">{t('admin.clientProfile.invoiceNumber')}</th>
                      <th className="text-right p-2">{t('admin.clientProfile.date')}</th>
                      <th className="text-right p-2">{t('admin.clientProfile.amount')}</th>
                      <th className="text-right p-2">{t('common.status')}</th>
                      <th className="text-right p-2">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t">
                        <td className="p-2 text-right font-medium">{invoice.number}</td>
                        <td className="p-2 text-right">{new Date(invoice.invoiceDate).toLocaleDateString(i18n.language)}</td>
                        <td className="p-2 text-right">{invoice.totalAmount.toFixed(2)}</td>
                        <td className="p-2 text-right">{getInvoiceStatusLabel(invoice.status)}</td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <ActionIconButton
                              title={t('view')}
                              onClick={() => void handleInvoiceDocumentAction(invoice, 'view')}
                              tone="default"
                              icon={<Eye className="w-4 h-4" />}
                            />
                            <ActionIconButton
                              title={t('admin.clientProfile.download')}
                              onClick={() => void handleInvoiceDocumentAction(invoice, 'download')}
                              tone="info"
                              icon={<Download className="w-4 h-4" />}
                            />
                            <ActionIconButton
                              title={t('common.print')}
                              onClick={() => void handleInvoiceDocumentAction(invoice, 'print')}
                              tone="default"
                              icon={<Printer className="w-4 h-4" />}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("notes")}
          className="w-full p-3 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
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

      {departmentFeatures.prescriptionsEnabled === true && (
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("prescriptions")}
          className="w-full p-3 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
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
          <div className="px-3 md:px-6 pb-4 md:pb-6 space-y-4">

            {/* Mobile: cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {prescriptions.length === 0 ? (
                <div className="text-gray-500">אין מרשמים</div>
              ) : (
                prescriptions.map((p, index) => (
                  <div key={`${p.id}-${index}`} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                    <div className="text-sm text-slate-500">תאריך: <span className="font-semibold text-slate-800">{new Date(p.date).toLocaleDateString()}</span></div>
                    <div className="text-sm text-slate-500">תרופות:
                      {p.drugs && p.drugs.length > 0 ? (
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {p.drugs.map((drug, drugIndex) => (
                            <li key={`${p.id}-drug-${drugIndex}`} className="text-slate-800">{typeof drug === 'string' ? drug : drug.display}</li>
                          ))}
                        </ul>
                      ) : <span className="text-slate-800"> -</span>}
                    </div>
                    <div className="text-sm text-slate-500">איש צוות מטפל: <span className="font-semibold text-slate-800">{p.doctorName}</span></div>
                    <div className="flex items-center gap-3 pt-1">
                      <ActionIconButton
                        title={t('view')}
                        onClick={() => void handlePrescriptionDocumentAction(p.id, 'view')}
                        tone="default"
                        icon={<Eye className="w-4 h-4" />}
                      />
                      <ActionIconButton
                        title={t('download_pdf')}
                        onClick={() => void handlePrescriptionDocumentAction(p.id, 'download')}
                        tone="info"
                        icon={<Download className="w-4 h-4" />}
                      />
                      <ActionIconButton
                        title={t('common.print')}
                        onClick={() => void handlePrescriptionDocumentAction(p.id, 'print')}
                        tone="default"
                        icon={<Printer className="w-4 h-4" />}
                      />
                      <ActionIconButton
                        title={t('common.edit')}
                        onClick={() => void openEditPrescriptionModal(p)}
                        tone="info"
                        icon={<Edit className="w-4 h-4" />}
                      />
                      <ActionIconButton
                        title={t('delete')}
                        onClick={() => void deletePrescription(p.id)}
                        tone="danger"
                        icon={<Trash2 className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop: table */}
            <table className="hidden md:table w-full border mt-4">
              <thead>
                <tr>
                  <th className="text-right p-2">תאריך</th>
                  <th className="text-right p-2">תרופות</th>
                  <th className="text-right p-2">איש צוות מטפל</th>
                  <th className="text-right p-2">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p, index) => (
                  <tr key={`${p.id}-${index}`} className="border-t">
                    <td className="p-2 text-right">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="p-2 text-right">
                      {p.drugs && p.drugs.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {p.drugs.map((drug, drugIndex) => (
                            <li key={`${p.id}-drug-${drugIndex}`}>{typeof drug === 'string' ? drug : drug.display}</li>
                          ))}
                        </ul>
                      ) : "-"}
                    </td>
                    <td className="p-2 text-right">{p.doctorName}</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <ActionIconButton
                          title={t('view')}
                          onClick={() => void handlePrescriptionDocumentAction(p.id, 'view')}
                          tone="default"
                          icon={<Eye className="w-4 h-4" />}
                        />
                        <ActionIconButton
                          title={t('download_pdf')}
                          onClick={() => void handlePrescriptionDocumentAction(p.id, 'download')}
                          tone="info"
                          icon={<Download className="w-4 h-4" />}
                        />
                        <ActionIconButton
                          title={t('common.print')}
                          onClick={() => void handlePrescriptionDocumentAction(p.id, 'print')}
                          tone="default"
                          icon={<Printer className="w-4 h-4" />}
                        />
                        <ActionIconButton
                          title={t('common.edit')}
                          onClick={() => void openEditPrescriptionModal(p)}
                          tone="info"
                          icon={<Edit className="w-4 h-4" />}
                        />
                        <ActionIconButton
                          title={t('delete')}
                          onClick={() => void deletePrescription(p.id)}
                          tone="danger"
                          icon={<Trash2 className="w-4 h-4" />}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {prescriptions.length === 0 && <div className="hidden md:block mt-4 text-gray-500">אין מרשמים</div>}
          </div>
        )}
      </div>
      )}

      {departmentFeatures.consentFormsEnabled === true && (
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("consents")}
          className="w-full p-3 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
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
                  return (
                    <div
                      key={consent.id}
                      className="border border-slate-200 rounded-xl p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">
                          {consent.templateName || (consent.serviceName ? `${t('consent_document')} - ${consent.serviceName}` : t('consent_document'))}
                        </div>
                        <div className="text-xs text-slate-500">
                          {t('signed_on')} {formatDate(consent.signedAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
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
      )}

      {departmentFeatures.beforeAfterPhotosEnabled === true && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('beforeAfterPhotos')}
            className="w-full p-3 md:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors duration-300"
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

            <div
              className={
                openSections.includes('beforeAfterPhotos')
                  ? 'px-6 pb-6'
                  : 'hidden'
              }
            >
              <ClientBeforeAfterPhotos
                clientId={client.id}
                onCountChange={setPhotosCount}
              />
            </div>
        </div>
      )}

      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <h3 className="text-xl font-bold sticky top-0 bg-white z-10 pb-2">
              {prescriptionMode === 'edit' ? 'עריכת מרשם' : 'כתיבת מרשם'}
            </h3>

            {loadingPrescriptionData ? (
              <div className="py-10 text-center text-gray-500">טוען פרטי מרשם...</div>
            ) : (
              <>

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
                         setErrors(prev => ({
                          ...prev,
                          drugs: false,
                         }));
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
                  {errors.drugs && (
                    <p className="text-red-500 text-sm mt-2">
                      שדה חובה: יש לבחור תרופה מתוך הרשימה או להוסיף כטקסט חופשי.
                    </p>
                 )}
              </div>

              <label className="mt-4 block text-sm mb-1">הוראות שימוש</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full border p-2 rounded h-24"
              />

              {prescriptionMode === 'edit' && (
                <>
                  <label className="mt-4 block text-sm mb-1">הערות</label>
                  <textarea
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    className="w-full border p-2 rounded h-20"
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">איש הצוות המטפל </label>
                <input
                  type="text"
                  value={prescriptionForm.doctorName}
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
                disabled={savingPrescription || !prescriptionForm.doctorName.trim()}
              >
                {savingPrescription ? 'שומר...' : prescriptionMode === 'edit' ? 'עדכן מרשם' : 'שמירה'}
              </button>
            </div>
              </>
            )}
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

function ActionIconButton({ title, onClick, icon, tone = 'default', disabled = false }: any) {
  const toneClasses =
    tone === 'info'
      ? 'text-blue-600 hover:text-blue-800'
      : tone === 'danger'
      ? 'text-red-600 hover:text-red-700'
      : 'text-slate-600 hover:text-slate-900'

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`${toneClasses} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}
    </button>
  )
}

function ConsentViewModal({ isOpen, consent, onClose, onDownload, resolveAssetUrl, t }: any) {
  if (!isOpen || !consent) return null

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
            <div className="text-sm text-slate-500 mb-2">חתימת איש צוות מטפל</div>
            {consent.doctorSignatureUrl ? (
              <img
                src={resolveAssetUrl(consent.doctorSignatureUrl) || consent.doctorSignatureUrl}
                alt="Staff Member signature"
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
