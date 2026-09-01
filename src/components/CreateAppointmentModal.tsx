import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { appointmentsService, type Appointment, type AppointmentClient } from '@/api'
import { consentsApi, type SignedConsent } from '@/api/consents'
import { servicesService, type BusinessService } from '@/api/servicesService'
import { staffService, type StaffMember } from '@/api/staff'
import {
  deleteImagingOrderReferralDocument,
  getImagingOrderReferral,
  getImagingOrderReferralDocument,
  updateImagingOrderReferral,
  uploadImagingOrderReferralDocument,
  type ImagingOrderReferral,
} from '@/api/imaging'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import SignConsentModal from './SignConsentModal'
import Autocomplete from './Autocomplete'

type EditableAppointment = {
  id: string
  clientId?: string
  serviceId?: string | null
  staffId?: string | null
  imagingOrderId?: string | null
  departmentName?: string | null
  departmentColor?: string | null
  startTime: string
  notes?: string | null
  status?: string
}

interface CreateAppointmentModalProps {
  onClose: () => void
  onSuccess?: (appointment?: Appointment) => void
  defaultClientId?: string
  mode?: 'create' | 'edit'
  appointment?: EditableAppointment
}

export default function CreateAppointmentModal({
  onClose,
  onSuccess,
  defaultClientId,
  mode = 'create',
  appointment
}: CreateAppointmentModalProps) {

  const { t } = useTranslation()
  const { user } = useAuth()

  const [clients, setClients] = useState<AppointmentClient[]>([])
  const [services, setServices] = useState<BusinessService[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [signedConsents, setSignedConsents] = useState<SignedConsent[]>([])
  const [saving, setSaving] = useState(false)
  const [referringDoctorName, setReferringDoctorName] = useState('')
  const [referralFile, setReferralFile] = useState<File | null>(null)
  const [referralUploadError, setReferralUploadError] = useState<string | null>(null)
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null)
  const [existingReferral, setExistingReferral] = useState<ImagingOrderReferral | null>(null)
  const [loadedReferringDoctorName, setLoadedReferringDoctorName] = useState('')
  const [loadingReferral, setLoadingReferral] = useState(false)
  const [appointmentEditSaved, setAppointmentEditSaved] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [pendingEditServiceId, setPendingEditServiceId] = useState<string | null>(null)
  const hasNotifiedSuccess = useRef(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clientQuery, setClientQuery] = useState('')
  const [serviceQuery, setServiceQuery] = useState('')

  const [formData, setFormData] = useState({
    clientId: defaultClientId || '',
    serviceId: '',
    staffId: '',
    date: '',
    time: '',
    duration: '',
    description: '',
    status: 'Scheduled'
  })

  const selectedStaffMember = staffMembers.find((staff) => staff.id === formData.staffId)
  const selectedStaffDepartmentIds = selectedStaffMember?.departmentIds ?? []
  const filteredServices = selectedStaffDepartmentIds.length > 0
    ? services.filter((service) =>
        !service.departmentId || selectedStaffDepartmentIds.includes(service.departmentId))
    : services

  const isStaffContextReadyForEdit = !formData.staffId || staffMembers.some((staff) => staff.id === formData.staffId)
  const selectedService = services.find(s => s.id === formData.serviceId)
  const isUsAppointment = selectedService?.imagingModality === 'US'
  const editImagingOrderId = mode === 'edit' ? appointment?.imagingOrderId : null

  useEffect(() => {
    loadServices()
    loadStaffMembers()
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadClients(clientQuery)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [clientQuery])

  useEffect(() => {
    if (mode === 'edit' && appointment) {
      const start = new Date(appointment.startTime)
      const initialServiceId = appointment.serviceId ?? ''

      setFormData({
        clientId: appointment.clientId ?? '',
        serviceId: '',
        staffId: (appointment as any).staffId ?? '',
        date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
        time: start.toTimeString().slice(0,5),
        duration: '',
        description: appointment.notes ?? '',
        status: appointment.status ?? 'Scheduled'
      })

      setPendingEditServiceId(initialServiceId || null)
      setServiceQuery('')
      return
    }

    setPendingEditServiceId(null)
  }, [mode, appointment])

  useEffect(() => {
    if (mode !== 'edit' || !pendingEditServiceId) {
      return
    }

    if (!services.length || !isStaffContextReadyForEdit) {
      return
    }

    const matchingService = filteredServices.find((service) => service.id === pendingEditServiceId)
    if (!matchingService) {
      setPendingEditServiceId(null)
      return
    }

    setFormData((previous) => ({
      ...previous,
      serviceId: matchingService.id
    }))
    setServiceQuery(matchingService.name || '')
    setErrors((previous) => ({ ...previous, serviceId: '' }))
    setPendingEditServiceId(null)
  }, [mode, pendingEditServiceId, services.length, isStaffContextReadyForEdit, filteredServices])

  useEffect(() => {
    if (!clients.length) {
      return
    }

    const selectedClient = clients.find((client) => client.id === formData.clientId)
    if (selectedClient) {
      setClientQuery(selectedClient.fullName || selectedClient.email || '')
    }
  }, [clients, formData.clientId])

  useEffect(() => {
    if (!services.length) {
      return
    }

    const selectedService = services.find((service) => service.id === formData.serviceId)
    if (selectedService) {
      setServiceQuery(selectedService.name || '')
    }
  }, [services, formData.serviceId])

  useEffect(() => {
    if (formData.serviceId) {
      const selected = services.find(s => s.id === formData.serviceId)
      if (selected) {
        setFormData(prev => ({
          ...prev,
          duration: String(selected.defaultDurationMinutes)
        }))
      }
    }
  }, [formData.serviceId, services])

  useEffect(() => {
    if (!formData.serviceId) {
      return
    }

    const selectedServiceStillAvailable = filteredServices.some(
      (service) => service.id === formData.serviceId
    )

    if (!selectedServiceStillAvailable) {
      setFormData((previous) => ({
        ...previous,
        serviceId: '',
        duration: ''
      }))
      setServiceQuery('')
    }
  }, [filteredServices, formData.serviceId])

  useEffect(() => {
    if (user?.role !== 'staff' || !user.email || staffMembers.length === 0 || formData.staffId) {
      return
    }

    const normalizedEmail = user.email.trim().toLowerCase()
    const currentStaff = staffMembers.find((staff) =>
      staff.email?.trim().toLowerCase() === normalizedEmail
    )

    if (currentStaff) {
      setFormData((previous) => ({ ...previous, staffId: currentStaff.id }))
      setErrors((previous) => ({ ...previous, staffId: '' }))
    }
  }, [user, staffMembers, formData.staffId])

  useEffect(() => {
    const loadSignedConsents = async () => {
      if (mode !== 'edit' || !formData.clientId) {
        setSignedConsents([])
        return
      }

      try {
        const data = await consentsApi.getSignedByClient(formData.clientId)
        setSignedConsents(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed loading signed consents:', error)
        setSignedConsents([])
      }
    }

    loadSignedConsents()
  }, [mode, formData.clientId])

  useEffect(() => {
    if (!editImagingOrderId || !isUsAppointment) {
      setExistingReferral(null)
      setLoadedReferringDoctorName('')
      return
    }

    let cancelled = false
    const loadReferral = async () => {
      setLoadingReferral(true)
      try {
        const referral = await getImagingOrderReferral(editImagingOrderId)
        if (cancelled) return
        setExistingReferral(referral)
        const doctorName = referral.referringDoctorName ?? ''
        setReferringDoctorName(doctorName)
        setLoadedReferringDoctorName(doctorName)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load referral:', error)
          setReferralUploadError('לא ניתן היה לטעון את פרטי ההפניה.')
        }
      } finally {
        if (!cancelled) setLoadingReferral(false)
      }
    }

    void loadReferral()
    return () => { cancelled = true }
  }, [editImagingOrderId, isUsAppointment])

  const loadClients = async (searchTerm?: string) => {
    const data = await appointmentsService.getClientsForAppointment(searchTerm)
    setClients(Array.isArray(data) ? data : [])
  }

  const buildClientSecondaryText = (client: AppointmentClient) => {
    const details: string[] = []

    if (client.idNumber?.trim()) {
      details.push(`${t('appointments.form.idNumberShort')}: ${client.idNumber.trim()}`)
    }

    if (client.phone?.trim()) {
      details.push(client.phone.trim())
    }

    return details.length > 0 ? details.join(' • ') : undefined
  }

  const loadServices = async () => {
    const data = await servicesService.getServices()
    setServices(Array.isArray(data) ? data : [])
  }

  const loadStaffMembers = async () => {
    try {
      const staff = await staffService.getStaffMembers()
      setStaffMembers(Array.isArray(staff) ? staff : [])
    } catch {
      setStaffMembers([])
    }
  }

  const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.clientId) {
    newErrors.clientId = t('validation.required')
  }

  if (!formData.serviceId) {
    newErrors.serviceId = t('validation.required')
  }

  if (!formData.staffId) {
    newErrors.staffId = t('validation.required')
  }

if (!formData.date || !formData.time) {
  newErrors.dateTime = t('validation.dateTimeRequired')
}

  setErrors(newErrors)

  return Object.keys(newErrors).length === 0
}

  const validateReferralFile = (file: File) => {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()

    if (!allowedExtensions.includes(extension)) {
      return 'ניתן להעלות קובץ PDF, JPG או PNG בלבד.'
    }

    if (file.size > 5 * 1024 * 1024) {
      return 'גודל קובץ ההפניה חייב להיות עד 5MB.'
    }

    return null
  }

  const completeSuccess = (savedAppointment: Appointment) => {
    if (!hasNotifiedSuccess.current) {
      hasNotifiedSuccess.current = true
      onSuccess?.(savedAppointment)
    }
    onClose()
  }

  const handleClose = () => {
    if (createdAppointment && !hasNotifiedSuccess.current) {
      hasNotifiedSuccess.current = true
      onSuccess?.(createdAppointment)
    }
    if (appointmentEditSaved && appointment && !hasNotifiedSuccess.current) {
      hasNotifiedSuccess.current = true
      onSuccess?.(appointment as Appointment)
    }
    onClose()
  }

  const retryReferralUpload = async () => {
    if (!createdAppointment?.imagingOrderId || !referralFile) return

    try {
      setSaving(true)
      setReferralUploadError(null)
      await uploadImagingOrderReferralDocument(createdAppointment.imagingOrderId, referralFile)
      completeSuccess(createdAppointment)
    } catch (error) {
      console.error('Referral upload failed:', error)
      setReferralUploadError('התור נשמר בהצלחה, אך העלאת ההפניה נכשלה.')
    } finally {
      setSaving(false)
    }
  }

  const saveEditReferralChanges = async (imagingOrderId: string) => {
    const doctorName = referringDoctorName.trim()
    let referral = existingReferral

    if (doctorName !== loadedReferringDoctorName) {
      referral = await updateImagingOrderReferral(imagingOrderId, doctorName || null)
      setExistingReferral(referral)
      setLoadedReferringDoctorName(doctorName)
    }

    if (referralFile) {
      await uploadImagingOrderReferralDocument(imagingOrderId, referralFile)
      referral = await getImagingOrderReferral(imagingOrderId)
      setExistingReferral(referral)
      setReferralFile(null)
    }
  }

  const retryEditReferralChanges = async () => {
    if (!editImagingOrderId || !appointmentEditSaved) return

    try {
      setSaving(true)
      setReferralUploadError(null)
      await saveEditReferralChanges(editImagingOrderId)
      completeSuccess(appointment as Appointment)
    } catch (error) {
      console.error('Referral update failed:', error)
      setReferralUploadError('התור נשמר בהצלחה, אך עדכון ההפניה נכשל.')
    } finally {
      setSaving(false)
    }
  }

  const handleViewExistingReferral = async () => {
    if (!editImagingOrderId) return
    try {
      setSaving(true)
      const blob = await getImagingOrderReferralDocument(editImagingOrderId)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (error) {
      console.error('Failed to view referral:', error)
      setReferralUploadError('לא ניתן היה להציג את ההפניה.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteReferral = async () => {
    if (!editImagingOrderId || !existingReferral?.document || !confirm('למחוק את ההפניה?')) return
    try {
      setSaving(true)
      setReferralUploadError(null)
      await deleteImagingOrderReferralDocument(editImagingOrderId)
      setExistingReferral((previous) => previous ? { ...previous, document: null } : previous)
    } catch (error) {
      console.error('Referral deletion failed:', error)
      setReferralUploadError('מחיקת ההפניה נכשלה.')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createdAppointment) return
    if (!validateForm()) {
       return
}

    try {
      setSaving(true)

      const startLocal = new Date(`${formData.date}T${formData.time}`)
      const durationMinutes = parseInt(formData.duration) || 60
      const endLocal = new Date(startLocal.getTime() + durationMinutes * 60000)

      const payload = {
        clientId: formData.clientId,
        serviceId: formData.serviceId || undefined,
        staffId: formData.staffId || undefined,
        startTime: `${formData.date}T${formData.time}:00`,
        endTime: endLocal.toLocaleString('sv-SE').replace(' ', 'T'),
        status: formData.status,
        notes: formData.description || undefined,
        ...(mode === 'create' && isUsAppointment && referringDoctorName.trim()
          ? { referringDoctorName: referringDoctorName.trim() }
          : {})
      }

      if (mode === 'edit' && appointment) {
        await appointmentsService.updateAppointment(appointment.id, payload)
        setAppointmentEditSaved(true)
        if (isUsAppointment && editImagingOrderId) {
          try {
            await saveEditReferralChanges(editImagingOrderId)
          } catch (error) {
            console.error('Referral update failed:', error)
            setReferralUploadError('התור נשמר בהצלחה, אך עדכון ההפניה נכשל.')
            return
          }
        }
        completeSuccess(appointment as Appointment)
        return
      } else {
        const createdAppointment = await appointmentsService.createAppointment(payload)
        if (!isUsAppointment || !referralFile) {
          completeSuccess(createdAppointment)
          return
        }

        setCreatedAppointment(createdAppointment)
        if (!createdAppointment.imagingOrderId) {
          setReferralUploadError('התור נשמר, אך לא ניתן היה לקשר את ההפניה לבדיקת האולטרסאונד.')
          return
        }

        try {
          await uploadImagingOrderReferralDocument(createdAppointment.imagingOrderId, referralFile)
          completeSuccess(createdAppointment)
          return
        } catch (error) {
          console.error('Referral upload failed:', error)
          setReferralUploadError('התור נשמר בהצלחה, אך העלאת ההפניה נכשלה.')
          return
        }
      }

      onClose()

    } catch (err) {
      console.error(err)
      alert('Error saving appointment')
    } finally {
      setSaving(false)
    }
  }

  const selectedClient = clients.find(c => c.id === formData.clientId)
  const selectedDepartmentName = selectedService?.departmentName || appointment?.departmentName || ''
  const selectedDepartmentColor = selectedService?.departmentColor || appointment?.departmentColor || ''
  const hasConsent = !!appointment?.id && signedConsents.some(c => c.appointmentId === appointment.id)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-scroll flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {mode === 'edit'
              ? t('appointments.editTitle')
              : t('appointments.createTitle')}
          </h2>
          <button onClick={handleClose} disabled={saving}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="create-appointment-form"
          onSubmit={handleSubmit}
          className="flex flex-col flex-1"
        >

          {/* BODY */}
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <label className="block text-sm font-semibold">
            {t('appointments.form.client')}
            <span className="text-red-500 ml-1">*</span>
          </label>
            <Autocomplete
                items={clients}
                query={clientQuery}
                onQueryChange={(value) => {
                  setClientQuery(value)
                  setFormData((previous) => ({ ...previous, clientId: '' }))
                }}
                onSelect={(client) => {
                  setClientQuery(client.fullName || client.email || '')
                  setFormData((previous) => ({ ...previous, clientId: client.id }))
                  setErrors((previous) => ({ ...previous, clientId: '' }))
                }}
                getItemId={(client) => client.id}
                getItemLabel={(client) => client.fullName || client.email || ''}
                getItemSecondaryText={(client) => buildClientSecondaryText(client)}
                getItemSearchText={(client) => `${client.fullName || ''} ${client.idNumber || ''}`}
                secondaryTextBelow={true}
                placeholder={t('appointments.form.clientSearchPlaceholder')}
                inputClassName={`w-full rounded-lg px-3 py-2 border ${
                  errors.clientId
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                noResultsText={t('common.noResults')}
                minQueryLength={0}
                emptyQueryShowsAll={true}
                maxResults={30}
            />

            {errors.clientId && (
            <p className="text-sm text-red-500 mt-1">
              {errors.clientId}
            </p>
               )}

            <label className="block text-sm font-semibold">
              {t('appointments.form.service')}
              <span className="text-red-500 ml-1">*</span>  
            </label>
            <Autocomplete
              items={filteredServices}
              query={serviceQuery}
              onQueryChange={(value) => {
                setServiceQuery(value)
                setFormData((previous) => ({ ...previous, serviceId: '' }))
              }}
              onSelect={(service) => {
                setServiceQuery(service.name || '')
                setFormData((previous) => ({ ...previous, serviceId: service.id }))
                setErrors((previous) => ({ ...previous, serviceId: '' }))
              }}
              getItemId={(service) => service.id}
              getItemLabel={(service) => service.name || ''}
              getItemSearchText={(service) => service.name || ''}
              placeholder={t('appointments.form.selectService')}
              inputClassName={`w-full rounded-lg px-3 py-2 border ${
                errors.serviceId
                  ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-300'
              }`}
              noResultsText={
                selectedStaffDepartmentIds.length > 0
                  ? t('appointments.form.noServicesForStaff')
                  : t('services.empty', 'לא נמצאו שירותים')
              }
              minQueryLength={0}
              emptyQueryShowsAll={true}
              maxResults={30}
            />

            {mode === 'edit' && (
              <>
                <label className="block text-sm font-semibold">
                  {t('appointments.form.department')}
                </label>
                <div className="border rounded-lg px-3 py-2 bg-gray-100 flex items-center gap-2 min-h-[42px]">
                  {selectedDepartmentName ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold bg-white"
                      style={selectedDepartmentColor
                        ? { color: selectedDepartmentColor, borderColor: selectedDepartmentColor }
                        : undefined}
                    >
                      {selectedDepartmentName}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">-</span>
                  )}
                </div>
              </>
            )}

            {mode === 'edit' && appointment?.id && formData.clientId && formData.serviceId && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={hasConsent}
                  title={hasConsent ? 'הסכמה כבר נחתמה' : undefined}
                  onClick={!hasConsent ? () => setShowConsentModal(true) : undefined}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm flex items-center gap-1
                    ${hasConsent
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}
                  `}
                >
                  {hasConsent ? 'נחתם ✔' : 'חתום על הסכמה ▶'}
                </button>
              </div>
            )}

            {isUsAppointment && (
              <div className="space-y-3 border-t border-slate-200 pt-4" dir="rtl">
                <div>
                  <label className="block text-sm font-semibold mb-1">רופא מפנה</label>
                  <input
                    type="text"
                    value={referringDoctorName}
                    onChange={(event) => setReferringDoctorName(event.target.value)}
                    disabled={Boolean(createdAppointment)}
                    className="w-full rounded-lg px-3 py-2 border border-slate-300 text-right disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">הפניה</label>
                  {loadingReferral ? (
                    <p className="text-sm text-slate-500">{t('common.loading')}</p>
                  ) : existingReferral?.document ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-slate-700">{existingReferral.document.originalFileName}</span>
                      <button
                        type="button"
                        onClick={() => void handleViewExistingReferral()}
                        disabled={saving}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        צפייה בהפניה
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteReferral()}
                        disabled={saving}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        מחיקת הפניה
                      </button>
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={Boolean(createdAppointment)}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      if (!file) return

                      const validationMessage = validateReferralFile(file)
                      if (validationMessage) {
                        setReferralFile(null)
                        setErrors((previous) => ({ ...previous, referralFile: validationMessage }))
                        event.target.value = ''
                        return
                      }

                      setReferralFile(file)
                      setErrors((previous) => {
                        const { referralFile, ...remainingErrors } = previous
                        return remainingErrors
                      })
                    }}
                    className="w-full rounded-lg px-3 py-2 border border-slate-300 text-right disabled:bg-slate-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">PDF / JPG / PNG עד 5MB</p>
                  {mode === 'edit' && existingReferral?.document && (
                    <p className="mt-1 text-xs text-slate-500">בחירת קובץ חדש תחליף את ההפניה הקיימת.</p>
                  )}
                  {referralFile && <p className="mt-1 text-sm text-slate-700">{referralFile.name}</p>}
                  {errors.referralFile && <p className="mt-1 text-sm text-red-500">{errors.referralFile}</p>}
                  {referralUploadError && <p className="mt-2 text-sm text-red-600">{referralUploadError}</p>}
                </div>
              </div>
            )}

            <label className="block text-sm font-semibold">
              {t('appointments.form.date')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.date}
                min={
                  mode === 'create'
                    ? new Date().toISOString().split('T')[0]
                    : undefined
                }
                  onChange={e =>
                    setFormData({
                      ...formData,
                      date: e.target.value
                    })
                  }
                  className="border rounded-lg px-3 py-2"
              />
              <input
                type="time"
                value={formData.time}
                min={
                  mode === 'create' &&
                  formData.date === new Date().toISOString().split('T')[0]
                    ? new Date().toTimeString().slice(0, 5)
                    : undefined
                }
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
            </div>
              {errors.dateTime && (
                <p className="text-sm text-red-500">
                  {errors.dateTime}
                </p>
              )}

            <label className="block text-sm font-semibold">
              {t('appointments.form.staff')}
            </label>
            <select
              value={formData.staffId}
              onChange={e => setFormData({ ...formData, staffId: e.target.value })}
              className={`w-full rounded-lg px-3 py-2 border ${
                  errors.staffId
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                >
              <option value="">{t('appointments.form.staffPlaceholder')}</option>
              {staffMembers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
            {errors.staffId && (
              <p className="text-sm text-red-500 mt-1">
                {errors.staffId}
              </p>
            )}

            {/* STATUS */}
            <label className="block text-sm font-semibold mb-1">
              {t('appointments.form.status')}
            </label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className={`w-full rounded-lg px-3 py-2 border ${
                  errors.status
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
                >
              <option value="Scheduled">{t('appointments.status.scheduled')}</option>
              <option value="Completed">{t('appointments.status.completed')}</option>
              <option value="Cancelled">{t('appointments.status.cancelled')}</option>
              <option value="NoShow">{t('appointments.status.noshow')}</option>
            </select>

            <label className="block text-sm font-semibold">
              {t('appointments.form.duration')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="border rounded-lg px-3 py-2 bg-gray-100">
              {formData.duration
                ? t('appointments.duration', { minutes: formData.duration })
                : '-'}
            </div>

            <label className="block text-sm font-semibold">
              {t('appointments.form.description')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`w-full rounded-lg px-3 py-2 border ${
                  errors.description
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-300'
                }`}
              placeholder={t('appointments.form.descriptionPlaceholder')}
            />

          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 p-4 border-t bg-white shrink-0">

            <button
              type="button"
              className="px-4 py-2 rounded-lg border"
              onClick={handleClose}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>

            {(createdAppointment && referralUploadError && createdAppointment.imagingOrderId) ||
            (mode === 'edit' && appointmentEditSaved && referralUploadError && editImagingOrderId) ? (
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={() => {
                  if (createdAppointment?.imagingOrderId) {
                    void retryReferralUpload()
                  } else {
                    void retryEditReferralChanges()
                  }
                }}
                disabled={saving}
              >
                {saving ? t('common.saving') : 'נסה להעלות שוב'}
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={saving || Boolean(createdAppointment)}
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            )}

          </div>

        </form>

      </div>

      {showConsentModal && mode === 'edit' && appointment?.id && (
        <SignConsentModal
          isOpen={showConsentModal}
          appointmentId={appointment.id}
          clientId={formData.clientId}
          clientName={(selectedClient as any)?.fullName || (selectedClient as any)?.email || ''}
          serviceId={formData.serviceId}
          serviceName={selectedService?.name || ''}
          onClose={() => setShowConsentModal(false)}
          onSigned={async () => {
            setShowConsentModal(false)
            if (formData.clientId) {
              const data = await consentsApi.getSignedByClient(formData.clientId)
              setSignedConsents(Array.isArray(data) ? data : [])
            }
          }}
        />
      )}
    </div>
  )
}