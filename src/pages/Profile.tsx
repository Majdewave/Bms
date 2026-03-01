import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { profileService } from '@/api'
import type { UserProfile, PasswordChangeRequest } from '@/api/profileService'

interface FormErrors {
  name?: string
  phone?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  passwordMatch?: string
  passwordLength?: string
  general?: string
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [editData, setEditData] = useState({
    name: '',
    phone: '',
  })

  const [passwordData, setPasswordData] = useState<PasswordChangeRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.getProfile()
        setProfile(data)
        setEditData({
          name: data.name,
          phone: data.phone,
        })
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  const validateEditForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!editData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!editData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^\+?[\d\s\-()]+$/.test(editData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (passwordData.newPassword.length < 8) {
      newErrors.passwordLength = 'Password must be at least 8 characters'
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required'
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.passwordMatch = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveProfile = async () => {
    if (!validateEditForm()) {
      return
    }

    setSaveLoading(true)
    setSaveSuccess(false)

    try {
      if (profile) {
        const updatedProfile = await profileService.updateProfile({
          name: editData.name,
          phone: editData.phone,
        })
        setProfile(updatedProfile)
        setSaveSuccess(true)
        setIsEditing(false)

        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      setErrors({
        general: 'Failed to save profile. Please try again.',
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return
    }

    setSaveLoading(true)
    setPasswordChangeSuccess(false)

    try {
      await profileService.changePassword(passwordData)
      setPasswordChangeSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordForm(false)

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordChangeSuccess(false), 3000)
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to change password',
      })
    } finally {
      setSaveLoading(false)
    }
  }

  const handleEditChange = (field: 'name' | 'phone', value: string) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  const handlePasswordChange = (
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    value: string,
  ) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Loading your profile...</p>
        </div>

        {/* Skeleton Loading */}
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4" />
          <div className="space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Failed to load profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account information and security.</p>
      </div>

      {/* Success Messages */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Profile updated successfully</p>
            <p className="text-sm text-green-700 mt-0.5">Your changes have been saved</p>
          </div>
        </div>
      )}

      {passwordChangeSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900">Password changed successfully</p>
            <p className="text-sm text-green-700 mt-0.5">Your password has been updated</p>
          </div>
        </div>
      )}

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-700">{errors.general}</p>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {/* Header Banner */}
        <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-400" />

        {/* Profile Content */}
        <div className="px-6 pb-6">
          {/* Avatar and Info */}
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 mb-8">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg border-4 border-white flex items-center justify-center shadow-lg">
                <User className="w-16 h-16 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
              <p className="text-gray-600 text-sm mt-1">{profile.role}</p>
              <p className="text-gray-500 text-xs mt-2">
                Member since {new Date(profile.joinDate).toLocaleDateString()}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                aria-label="Edit profile"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Contact Information</h3>

            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-6 max-w-2xl">
                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Contact support to change email</p>
                </div>

                {/* Name (Editable) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                        errors.name
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-600 mt-1.5 font-semibold">{errors.name}</p>
                  )}
                </div>

                {/* Phone (Editable) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => handleEditChange('phone', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                        errors.phone
                          ? 'border-red-300 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-600 mt-1.5 font-semibold">{errors.phone}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saveLoading}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {saveLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditData({ name: profile.name, phone: profile.phone })
                      setErrors({})
                    }}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <Mail className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Email Address</p>
                    <p className="text-base text-gray-900 mt-1">{profile.email}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Phone Number</p>
                    <p className="text-base text-gray-900 mt-1">{profile.phone}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Location</p>
                    <p className="text-base text-gray-900 mt-1">{profile.location}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Security</h3>
                <p className="text-sm text-gray-600">Change your password</p>
              </div>
            </div>
            {!showPasswordForm && (
              <button
                onClick={() => {
                  setShowPasswordForm(true)
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })
                  setErrors({})
                }}
                className="text-primary-600 hover:text-primary-700 font-semibold text-sm"
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm ? (
            /* Password Change Form */
            <div className="space-y-6 max-w-2xl border-t border-gray-200 pt-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className={`w-full pl-10 pr-12 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                      errors.currentPassword
                        ? 'border-red-300 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-primary-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs text-red-600 mt-1.5 font-semibold">
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className={`w-full pl-10 pr-12 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                      errors.newPassword || errors.passwordLength
                        ? 'border-red-300 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-primary-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-red-600 mt-1.5 font-semibold">{errors.newPassword}</p>
                )}
                {errors.passwordLength && (
                  <p className="text-xs text-red-600 mt-1.5 font-semibold">
                    {errors.passwordLength}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1.5">At least 8 characters required</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-12 py-2.5 border rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                      errors.confirmPassword || errors.passwordMatch
                        ? 'border-red-300 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-primary-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1.5 font-semibold">
                    {errors.confirmPassword}
                  </p>
                )}
                {errors.passwordMatch && (
                  <p className="text-xs text-red-600 mt-1.5 font-semibold">{errors.passwordMatch}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleChangePassword}
                  disabled={saveLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {saveLoading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    })
                    setErrors({})
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Protect your account with a strong password. We recommend changing it every few months.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
