import { useTenant } from '@/hooks/useTenant'
import { useState } from 'react'
import { createBillingPortal } from '@/services/billingService'
import { Alert } from '@/components/UI'
import { useTranslation } from 'react-i18next'
import { createCheckoutSession } from '@/services/billingService'

export default function BillingPage() {
  const { tenant, daysLeft, loading, error } = useTenant()
  const isCanceling =
  tenant?.subscriptionStatus === 'Active' &&
  tenant?.subscriptionEndsAt &&
  new Date(tenant.subscriptionEndsAt) > new Date();

  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'he'

  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly')


const handleManageSubscription = async () => {
  try {
    setIsLoadingCheckout(true)

    const res = await createBillingPortal()

    window.location.href = res.url
  } catch (err) {
    console.error(err)
  } finally {
    setIsLoadingCheckout(false)
  }
}


const handleUpgrade = async () => {
  try {

    setIsLoadingCheckout(true)

    const res = await createCheckoutSession(
      billingCycle
    )

    window.location.href = res.url

  } catch (err) {
    console.error(err)
  } finally {
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
        <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc] px-6">
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">

            <img
              src="/clienta-logo.png"
              className="h-14 mx-auto mb-4"
            />

            <h1 className="text-xl font-semibold text-gray-900">
              {isCanceling
                ? 'המנוי יבוטל בסוף התקופה'
                : t('billing.activeTitle')}
            </h1>

              {isCanceling && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                  <div className="font-medium text-amber-800">
                    המנוי פעיל עד
                  </div>

                  <div className="text-amber-700">
                    {new Date(
                      tenant.subscriptionEndsAt!
                    ).toLocaleDateString('he-IL')}
                  </div>
                </div>
              )}
            <p className="text-gray-500 mt-2 mb-6">
              {t('billing.activeSubtitle')}
            </p>
            

            <button
              onClick={handleManageSubscription}
              disabled={isLoadingCheckout}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-medium transition ${
                isLoadingCheckout
                  ? 'opacity-60 cursor-not-allowed'
                  : ''
              }`}
            >
              {isLoadingCheckout
                ? t('billing.redirect')
                : 'ניהול מנוי'}
            </button>

            {portalError && (
              <div className="mt-4">
                <Alert
                  type="error"
                  message={portalError}
                />
              </div>
            )}
          </div>
        </div>
      )
    }



  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#f7f9fc] flex flex-col items-center px-6 pt-6 pb-20"
    >

      {/* LOGO */}

      {/* LOGO - moved up, less spacing */}
      <div className="mb-1 mt-2">
        <img
          src="/clienta-logo.png"
          className="h-16 md:h-20 mx-auto object-contain"
          alt="Clienta Logo"
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
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="mb-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
            {t('billing.popular')}
          </span>
        </div>

        <h2 className="text-[26px] font-semibold text-gray-900 mb-1">
          {t('billing.plan') || 'PRO'}
        </h2>



      <div className="flex items-center justify-center mb-6">
        <div className="bg-gray-100 rounded-xl p-1 flex">

          <button
            onClick={() => setBillingCycle('Monthly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              billingCycle === 'Monthly'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-500'
            }`}
          >
            חודשי
          </button>

          <button
            onClick={() => setBillingCycle('Yearly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              billingCycle === 'Yearly'
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-500'
            }`}
          >
            שנתי
          </button>

        </div>
      </div>




        <div className="mb-5">
          <div className="text-[42px] font-semibold text-gray-900">
            {billingCycle === 'Monthly' ? '₪186' : '₪1860'}
          </div>
          <div className="text-gray-500 text-base">
            {t('billing.perMonth')}
          </div>
          <div className="text-base text-gray-500 mt-1">
            {billingCycle === 'Monthly' ? t('billing.perMonth') : t('billing.yearly')}
          </div>
        </div>

        <div className="space-y-2 text-gray-700 mb-7 text-[17px]">
          <div><span className="text-blue-600 font-semibold">✔</span> {t('billing.features.clients').replace(/^✔\s*/, '')}</div>
          <div><span className="text-blue-600 font-semibold">✔</span> {t('billing.features.appointments').replace(/^✔\s*/, '')}</div>
          <div><span className="text-blue-600 font-semibold">✔</span> {t('billing.features.staff').replace(/^✔\s*/, '')}</div>
          <div><span className="text-blue-600 font-semibold">✔</span> {t('billing.features.full').replace(/^✔\s*/, '')}</div>
        </div>


        {/* Stripe Billing Portal Button */}
        <button
          onClick={handleUpgrade}
          disabled={isLoadingCheckout}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg font-medium transition ${isLoadingCheckout ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isLoadingCheckout ? t('billing.redirect') : 'שדרג עכשיו'}
        </button>

        {portalError && (
          <div className="mt-4">
            <Alert type="error" message={portalError} />
          </div>
        )}

        <p className="text-base text-gray-400 mt-4">
          {t('billing.footer')}
        </p>
      </div>
    </div>
  )
}