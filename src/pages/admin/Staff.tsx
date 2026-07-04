import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { staffService } from '@/api/staff'
import type { StaffMember, StaffPermission, VisibleMenuItem } from '@/api'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  Pencil,
  Ban,
  Trash2,
  Mail,
  User,
  FileText,
  Calendar,
  Folder,
  ChevronDown,
  ChevronUp,
  Check,
  X,
} from 'lucide-react'

export default function AdminStaff() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const { hasPermission } = useAuth()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [savingStaff, setSavingStaff] = useState(false)
  const [sendingLink, setSendingLink] = useState<string | null>(null)
  const [role, setRole] = useState('Staff')
  const [openMobileCards, setOpenMobileCards] = useState<Record<string, boolean>>({})
  

  // Form state
  const [formData, setFormData] = useState({
    FullName: '',
    Email: '',
    Password: '',
    RoleLabel: '',
    Permissions: [] as StaffPermission[],
    VisibleMenuItems: [] as VisibleMenuItem[],
    IsActive: true,
    UseStamp: false,
    StampUrl: '',
  })
  
  const [stampFile, setStampFile] = useState<File | null>(null)
  const [stampPreview, setStampPreview] = useState<string>('')
  const [uploadingStamp, setUploadingStamp] = useState(false)

  const permissionOptions: Array<{ permission: StaffPermission; icon: typeof User }> = [
    { permission: 'manage_clients', icon: User },
    { permission: 'manage_appointments', icon: Calendar },
    { permission: 'manage_invoices', icon: FileText },
    { permission: 'manage_notes', icon: Pencil },
    { permission: 'manage_files', icon: Folder },
  ]

  
  useEffect(() => {
    if (!hasPermission('manage_staff')) {
      navigate('/unauthorized')
      return
    }
    loadStaff()
  }, [hasPermission, navigate])

  useEffect(() => {
    if (role.toLowerCase() === 'admin') {
      setFormData((prev) => ({ ...prev, Permissions: [] }))
    }
  }, [role])

  const loadStaff = async () => {
    setLoading(true)
    try {
      const response = await staffService.getStaffMembers()
      const list = Array.isArray(response)
        ? response
        : response?.items ?? response?.data ?? [];
      setStaff(list)
    } catch (error) {
      console.error('Failed to load staff:', error)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async () => {
    if (
      !formData.FullName.trim() ||
      !formData.Email.trim() ||
      !formData.RoleLabel.trim() ||
      (!editingStaff && !formData.Password.trim())
    ) {
      console.warn('Validation failed: Missing required fields');
      console.log('Form Data:', formData);
      console.log('Editing Staff:', editingStaff);
      alert(t('admin.staff.validation.requiredFields'))
      return
    }

    setSavingStaff(true)
    try {
      const normalizedRole = role.toLowerCase() === 'admin' ? 'Admin' : 'Staff'

      if (editingStaff) {
        // UPDATE FLOW
        let updatePayload = {
          ...formData,
          role: normalizedRole,
          Permissions: normalizedRole === 'Admin' ? [] : formData.Permissions,
        }
        // If uploading a new stamp, never send UseStamp: true with empty StampUrl
        if (stampFile) {
          updatePayload = {
            ...updatePayload,
            UseStamp: false,
            StampUrl: null,
          }
        }
        await staffService.updateStaffMember(editingStaff.id, updatePayload)

        if (stampFile) {
          setUploadingStamp(true)
          try {
            await staffService.uploadStamp(editingStaff.id, stampFile)
          } catch (error) {
            console.error('Failed to upload stamp:', error)
            alert(t('admin.staff.errors.stampUploadFailed') || 'Failed to upload stamp')
          } finally {
            setUploadingStamp(false)
          }
        }
        await loadStaff()
        closeModal()
        return
      }

      // CREATE FLOW
      // Always create staff first, with UseStamp: false and no StampUrl
      const createPayload = {
        ...formData,
        UseStamp: false,
        StampUrl: '',
        role: normalizedRole,
        Permissions: normalizedRole === 'Admin' ? [] : formData.Permissions,
      }
      const created = await staffService.createStaffMember(createPayload)
      let staffId = created?.id
      let stampUrl = ''

      if (stampFile && staffId) {
        setUploadingStamp(true)
        try {
          const uploadResult = await staffService.uploadStamp(staffId, stampFile)
          stampUrl = uploadResult.stampUrl
        } catch (error) {
          console.error('Failed to upload stamp:', error)
          alert(t('admin.staff.errors.stampUploadFailed') || 'Failed to upload stamp')
        } finally {
          setUploadingStamp(false)
        }
      }

      // If stamp was uploaded, update UseStamp and StampUrl
      if (staffId && stampUrl) {
        try {
          await staffService.updateStaffMember(staffId, {
            ...formData,
            UseStamp: true,
            StampUrl: stampUrl,
            role: normalizedRole,
            Permissions: normalizedRole === 'Admin' ? [] : formData.Permissions,
          })
        } catch (error) {
          console.error('Failed to update staff with stamp:', error)
        }
      }

      await loadStaff()
      closeModal()
    } catch (error) {
      console.error('Failed to save staff:', error)
      alert(t('admin.staff.errors.saveFailed'))
    } finally {
      setSavingStaff(false)
    }
  }

  const handleToggleStatus = async (staffMember: StaffMember) => {
    try {
      await staffService.toggleStaffStatus(staffMember)
      await loadStaff()
    } catch (error) {
      console.error('Failed to toggle status:', error)
      alert(t('admin.staff.errors.toggleFailed'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.staff.confirmDelete'))) return

    try {
      await staffService.deleteStaffMember(id)
      setStaff(staff.filter(s => s.id !== id))
    } catch (error) {
      console.error('Failed to delete staff:', error)
      alert(t('admin.staff.errors.deleteFailed'))
    }
  }

  const handleSendLoginLink = async (id: string, email: string) => {
    setSendingLink(id)
    try {
      await staffService.sendLoginLink(id)
      alert(t('admin.staff.loginLinkSent', { email }))
    } catch (error) {
      console.error('Failed to send login link:', error)
      alert(t('admin.staff.errors.sendLinkFailed'))
    } finally {
      setSendingLink(null)
    }
  }

  const openEditModal = (staffMember: StaffMember) => {
    setEditingStaff(staffMember)
    setRole(staffMember.role || 'Staff')
    setFormData({
      FullName: staffMember.fullName || staffMember.name || '',
      Email: staffMember.email || '',
      Password: '',
      RoleLabel: staffMember.roleLabel || staffMember.role || '',
      Permissions: staffMember.permissions || [],
      VisibleMenuItems: staffMember.visibleMenuItems || [],
      IsActive: staffMember.isActive ?? true,
      UseStamp: staffMember.useStamp ?? false,
      StampUrl: staffMember.stampUrl || '',
    })
    setStampFile(null)
    setStampPreview(staffMember.stampUrl || '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingStaff(null)
    setRole('Staff')
    setFormData({
      FullName: '',
      Email: '',
      Password: '',
      RoleLabel: '',
      Permissions: [],
      VisibleMenuItems: [],
      IsActive: true,
      UseStamp: false,
      StampUrl: '',
    })
    setStampFile(null)
    setStampPreview('')
  }

  const togglePermission = (permission: StaffPermission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }))
  }

  const toggleMenuItem = (item: VisibleMenuItem) => {
    setFormData(prev => ({
      ...prev,
      visibleMenuItems: prev.visibleMenuItems.includes(item)
        ? prev.visibleMenuItems.filter(i => i !== item)
        : [...prev.visibleMenuItems, item],
    }))
  }

  const handleStampFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/png')) {
        alert('Please select a PNG image file')
        return
      }
      setStampFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setStampPreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const filteredStaff = (staff ?? []).filter(Boolean).filter(s =>
    (s.fullName ?? '').toLowerCase().includes((searchQuery ?? '').toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes((searchQuery ?? '').toLowerCase()) ||
    (s.roleLabel ?? '').toLowerCase().includes((searchQuery ?? '').toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.staff.title')}</h1>
            <p className="text-base text-slate-600 mt-2">{t('admin.staff.subtitle')}</p>
          </div>

          <div className="w-full md:w-auto">
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary btn-md gap-2 w-full justify-center md:w-auto"
            >
              <Plus className="w-4 h-4" />
              {t('admin.staff.addNew')}
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('admin.staff.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input ps-10 w-full"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="card">
        {filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">{t('admin.staff.noResults')}</p>
          </div>
        ) : (
          <>
            <div className="hidden max-[540px]:flex flex-col gap-2 p-3">
              {filteredStaff.map((staffMember, idx) => {
                const isOpen = Boolean(openMobileCards[staffMember.id])
                return (
                <div
                  key={staffMember.id}
                  className="rounded-xl border border-slate-200 shadow-md overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenMobileCards((current) => ({ ...current, [staffMember.id]: !current[staffMember.id] }))}
                    className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-600 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 text-start">
                        <div className="flex items-center gap-2 text-white font-bold">
                          <User className="w-4 h-4 shrink-0" />
                          <p className="truncate">{staffMember.fullName}</p>
                        </div>
                        <p className="mt-1 text-xs text-white/90 truncate">{staffMember.roleLabel}</p>
                      </div>
                      <span className={`text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </span>
                    </div>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className={`px-4 py-3 flex flex-col gap-2 ${
                      idx % 2 === 0 ? 'bg-sky-100 border-t border-sky-200' : 'bg-white border-t border-slate-100'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-slate-500">{t('admin.staff.table.role')}:</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                              {staffMember.roleLabel}
                            </span>
                            <span className="text-sm text-slate-500">{t('admin.staff.table.status')}:</span>
                            <Badge variant={staffMember.isActive ? 'success' : 'slate'}>
                              {staffMember.isActive ? t('admin.staff.status.active') : t('admin.staff.status.inactive')}
                            </Badge>
                          </div>
                        </div>
                        {staffMember.role?.toLowerCase() === 'admin' ? (
                          <span className="px-2 py-1 text-sm font-semibold bg-purple-100 text-purple-700 rounded-full shrink-0">
                            אדמין
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500 shrink-0">
                            {staffMember.permissions.length} {t('admin.staff.permissionsLabel')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-700 break-all">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm"><span className="text-slate-500">{t('admin.staff.table.email')}:</span> {staffMember.email}</span>
                      </div>

                      <div className="text-sm text-slate-700">
                        <span className="text-slate-500">{t('admin.staff.table.phone', 'Phone')}:</span> {(staffMember as any).phone || '—'}
                      </div>

                      <div className="text-sm text-slate-700">
                        <span className="text-slate-500">{t('admin.staff.table.lastLogin')}:</span> {staffMember.lastLogin ? formatDate(staffMember.lastLogin) : '—'}
                      </div>

                      <div className="text-sm text-slate-700 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">{t('admin.staff.form.stamp', 'Stamp')}:</span>
                        {staffMember.useStamp ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Enabled</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Disabled</span>
                        )}
                      </div>

                      {staffMember.useStamp && staffMember.stampUrl && (
                        <div className="border border-slate-200 rounded-lg bg-white p-3 w-fit">
                          <img src={staffMember.stampUrl} alt="Staff stamp" className="max-h-14 object-contain" />
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => openEditModal(staffMember)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title={t('admin.staff.actions.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(staffMember)}
                          className={`p-2 rounded-lg transition-colors ${
                            staffMember.isActive
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title={t(`admin.staff.actions.${staffMember.isActive ? 'block' : 'unblock'}`)}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(staffMember.id)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                          title={t('admin.staff.actions.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>

            <div className="max-[540px]:hidden overflow-x-auto">
              <table dir={isRTL ? 'rtl' : 'ltr'} className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    {isRTL ? (
                      <>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.name')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.email')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.role')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.status')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.lastLogin')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.actions')}
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.name')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.email')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.role')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.status')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.lastLogin')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                          {t('admin.staff.table.actions')}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStaff.map((staffMember) => (
                    <tr key={staffMember.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{staffMember.fullName}</p>
                            {staffMember.role?.toLowerCase() === 'admin' ? (
                              <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                                אדמין
                              </span>
                            ) : (
                              <span className="text-sm text-slate-500">
                                {staffMember.permissions.length} {t('admin.staff.permissionsLabel')}
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {staffMember.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {staffMember.roleLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={staffMember.isActive ? 'success' : 'slate'}>
                          {staffMember.isActive ? t('admin.staff.status.active') : t('admin.staff.status.inactive')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {staffMember.lastLogin ? formatDate(staffMember.lastLogin) : '—'}
                      </td>
                      <td className={`px-6 py-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          <button
                            onClick={() => openEditModal(staffMember)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                            title={t('admin.staff.actions.edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(staffMember)}
                            className={`p-2 rounded-lg transition-colors ${
                              staffMember.isActive
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={t(`admin.staff.actions.${staffMember.isActive ? 'block' : 'unblock'}`)}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(staffMember.id)}
                            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                            title={t('admin.staff.actions.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingStaff ? t('admin.staff.editTitle') : t('admin.staff.createTitle')}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  {t('admin.staff.form.basicInfo')}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('admin.staff.form.name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.FullName}
                    onChange={(e) => setFormData({ ...formData, FullName: e.target.value })}
                    className="input w-full"
                    placeholder={t('admin.staff.form.namePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('admin.staff.form.email')} *
                  </label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="input w-full"
                    placeholder={t('admin.staff.form.emailPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('admin.staff.form.password')} *
                  </label>
                  <input
                    type="password"
                    value={formData.Password}
                    onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                    className="input w-full"
                    placeholder={t('admin.staff.form.passwordPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('admin.staff.form.role')}
                  </label>
                  <input
                    type="text"
                    value={formData.RoleLabel}
                    onChange={(e) => setFormData({ ...formData, RoleLabel: e.target.value })}
                    className="input w-full"
                    placeholder={t('admin.staff.form.rolePlaceholder')}
                  />
                  <p className="text-xs text-slate-500 mt-1">{t('admin.staff.form.roleHint')}</p>
                </div>

                <div>
                  <label className="block mb-2 font-medium">סוג משתמש</label>
                  <select
                    value={role.toLowerCase() === 'admin' ? 'Admin' : 'Staff'}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border rounded p-2"
                  >
                    <option value="Staff">צוות</option>
                    <option value="Admin">אדמין</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              {role.toLowerCase() !== 'admin' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  {t('admin.staff.form.permissions')}
                </h3>
                <p className="text-sm text-slate-600">{t('admin.staff.form.permissionsHint')}</p>

                <div className="space-y-3">
                  {permissionOptions.map(({ permission, icon: PermissionIcon }) => (
                    <label
                      key={permission}
                      className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.Permissions.includes(permission)}
                        onChange={() => setFormData(prev => ({ ...prev, Permissions: prev.Permissions.includes(permission) ? prev.Permissions.filter(p => p !== permission) : [...prev.Permissions, permission] }))}
                        className="mt-0.5 w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 inline-flex items-center gap-2">
                          <PermissionIcon className="w-4 h-4 text-slate-500" />
                          {t(`admin.staff.permissions.${permission}.title`)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t(`admin.staff.permissions.${permission}.description`)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              )}

              {/* Menu Visibility */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  {t('admin.staff.form.menuVisibility')}
                </h3>
                <p className="text-sm text-slate-600">{t('admin.staff.form.menuVisibilityHint')}</p>

                <div className="space-y-3">
                  {(['clients', 'appointments'] as VisibleMenuItem[]).map((item) => (
                    <label
                      key={item}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.VisibleMenuItems.includes(item)}
                        onChange={() => setFormData(prev => ({ ...prev, VisibleMenuItems: prev.VisibleMenuItems.includes(item) ? prev.VisibleMenuItems.filter(i => i !== item) : [...prev.VisibleMenuItems, item] }))}
                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="font-medium text-slate-900">
                        {t(`admin.staff.menuItems.${item}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Stamp Settings */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Stamp Settings
                </h3>

                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.UseStamp}
                    onChange={(e) => setFormData(prev => ({ ...prev, UseStamp: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="font-medium text-slate-900">
                    Use stamp in documents
                  </span>
                </label>

                {formData.UseStamp && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Upload Stamp (PNG only)
                      </label>
                      <input
                        type="file"
                        accept="image/png"
                        onChange={handleStampFileChange}
                        disabled={uploadingStamp}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Maximum 5MB, PNG format only
                      </p>
                    </div>

                    {stampPreview && (
                      <div className="flex items-center justify-center p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <img
                          src={stampPreview}
                          alt="Stamp preview"
                          className="max-h-32 max-w-32 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={closeModal}
                className="btn-ghost"
                disabled={savingStaff}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateOrUpdate}
                className="btn-primary btn-md gap-2"
                disabled={savingStaff}
              >
                {savingStaff ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingStaff ? t('admin.staff.update') : t('admin.staff.create')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
