import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Badge } from '@/components'
import { useAuth } from '@/contexts/AuthContext'
import { staffService } from '@/api/staff'
import type { StaffMember, StaffPermission, VisibleMenuItem } from '@/api'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  Search,
  Edit,
  Ban,
  Trash2,
  Mail,
  Check,
  X,
} from 'lucide-react'

export default function AdminStaff() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [savingStaff, setSavingStaff] = useState(false)
  const [sendingLink, setSendingLink] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    FullName: '',
    Email: '',
    Password: '',
    RoleLabel: '',
    Permissions: [] as StaffPermission[],
    VisibleMenuItems: [] as VisibleMenuItem[],
     IsActive: true
  })

  
  useEffect(() => {
    if (!hasPermission('manage_staff')) {
      navigate('/unauthorized')
      return
    }
    loadStaff()
  }, [hasPermission, navigate])

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
    if (!formData.FullName.trim() || !formData.Email.trim() || !formData.Password.trim() || !formData.RoleLabel.trim()) {
      alert(t('admin.staff.validation.requiredFields'))
      return
    }

    setSavingStaff(true)
    try {
      if (editingStaff) {
        await staffService.updateStaffMember(editingStaff.id, formData)
        await loadStaff()
      } else {
        await staffService.createStaffMember(formData)
        await loadStaff()
      }
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
    setFormData({
      FullName: staffMember.fullName || staffMember.name || '',
      Email: staffMember.email || '',
      Password: '',
      RoleLabel: staffMember.roleLabel || staffMember.role || '',
      Permissions: staffMember.permissions || [],
      VisibleMenuItems: staffMember.visibleMenuItems || [],
        IsActive: staffMember.isActive ?? true
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingStaff(null)
    setFormData({
      FullName: '',
      Email: '',
      Password: '',
      RoleLabel: '',
      Permissions: [],
      VisibleMenuItems: [],
    })
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
      <PageHeader
        title={t('admin.staff.title')}
        description={t('admin.staff.subtitle')}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary btn-md gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('admin.staff.addNew')}
          </button>
        }
      />

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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-600 uppercase">
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
                  <th className="px-6 py-3 text-end text-xs font-semibold text-slate-600 uppercase">
                    {t('admin.staff.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStaff.map((staffMember) => (
                  <tr key={staffMember.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{staffMember.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {staffMember.permissions.length} {t('admin.staff.permissionsLabel')}
                        </p>
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
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(staffMember)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title={t('admin.staff.actions.edit')}
                        >
                          <Edit className="w-4 h-4" />
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
                          onClick={() => handleSendLoginLink(staffMember.id, staffMember.email)}
                          disabled={sendingLink === staffMember.id}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title={t('admin.staff.actions.sendLink')}
                        >
                          {sendingLink === staffMember.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(staffMember.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  {t('admin.staff.form.permissions')}
                </h3>
                <p className="text-sm text-slate-600">{t('admin.staff.form.permissionsHint')}</p>

                <div className="space-y-3">
                  {(['manage_clients', 'manage_appointments', 'manage_notes', 'manage_files'] as StaffPermission[]).map((permission) => (
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
                        <p className="font-medium text-slate-900">
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
