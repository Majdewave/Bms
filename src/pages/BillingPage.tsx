import { useTenant } from '@/hooks/useTenant'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function BillingPage() {
  const { tenant, daysLeft, loading, error } = useTenant()
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false)
  const { t, i18n } = useTranslation()

  const isRTL = i18n.language === 'he'

  const handleUpgrade = async () => {
    try {
      setIsLoadingCheckout(true)

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!res.ok) throw new Error('Failed to create checkout session')

      const data = await res.json()

      if (!data.url) throw new Error('No checkout URL returned')

      window.location.href = data.url
    } catch (err) {
      console.error(err)
      alert(t('billing.error'))
      setIsLoadingCheckout(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
        <div className="text-gray-500">{t('billing.loading')}</div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
        <div className="text-red-600">{t('billing.loadError')}</div>
      </div>
    )
  }

  if (tenant.subscriptionStatus === 'Active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <img src="/clienta-logo.png" className="h-14 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">
            {t('billing.activeTitle')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('billing.activeSubtitle')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#f7f9fc] flex flex-col items-center px-6 py-16"
    >

      {/* LOGO */}
      <div className="mb-10">
        <img
          src="/clienta-logo.png"
          className="h-16 mx-auto object-contain"
        />
      </div>

      {/* TRIAL */}
      {tenant.trialEndsAt && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl mb-10 text-center max-w-md w-full">
          <div className="font-medium">
            ⚡ {t('billing.trial', { days: daysLeft })}
          </div>

          <div className="text-sm mt-1 text-blue-700">
            {t('billing.trialSubtitle')}
          </div>
        </div>
      )}

      {/* PLAN */}
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">

        <div className="mb-4">
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
            {t('billing.popular')}
          </span>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {t('billing.plan')}
        </h2>

        <div className="mb-6">
          <div className="text-4xl font-semibold text-gray-900">
            ₪39
          </div>

          <div className="text-gray-500 text-sm">
            {t('billing.perMonth')}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            {t('billing.yearly')}
          </div>
        </div>

        <div className="space-y-3 text-gray-700 mb-8 text-sm">
          <div>{t('billing.features.clients')}</div>
          <div>{t('billing.features.appointments')}</div>
          <div>{t('billing.features.staff')}</div>
          <div>{t('billing.features.full')}</div>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={isLoadingCheckout}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-medium transition"
        >
          {isLoadingCheckout
            ? t('billing.redirect')
            : t('billing.upgrade')}
        </button>

        <p className="text-xs text-gray-400 mt-4">
          {t('billing.footer')}
        </p>
      </div>
    </div>
  )
}