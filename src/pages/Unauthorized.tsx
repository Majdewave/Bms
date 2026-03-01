import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function Unauthorized() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const getDashboardPath = () => {
    if (!user?.role) return '/'
    return `/${user.role}/dashboard`
  }

  const getRoleDisplayName = () => {
    switch (user?.role) {
      case 'admin':
        return t('login.demoAdmin')
      case 'staff':
        return t('login.demoStaff')
      case 'client':
        return t('login.demoClient')
      default:
        return user?.role
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">
          {t('unauthorized.title')}
        </h1>

        {/* Description */}
        <p className="text-slate-600 text-center mb-2">
          {t('unauthorized.subtitle')}
        </p>

        {/* Role Info */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-600 mb-1">{t('unauthorized.yourRole')}:</p>
          <p className="text-lg font-semibold text-slate-900">
            {getRoleDisplayName()}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {t('unauthorized.insufficientPermissions')}
          </p>
        </div>

        {/* Action Button */}
        <Link
          to={getDashboardPath()}
          className="inline-flex items-center justify-center gap-2 w-full btn btn-primary btn-md"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('unauthorized.backToDashboard')}
        </Link>

        {/* Help Text */}
        <p className="text-xs text-slate-500 text-center mt-4">
          {t('unauthorized.contactAdmin')}
        </p>
      </div>
    </div>
  )
}
