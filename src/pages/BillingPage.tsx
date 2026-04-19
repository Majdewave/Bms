import { useTenant } from '@/hooks/useTenant'
import { useState } from 'react'

export default function BillingPage() {
  const { tenant, daysLeft, loading, error } = useTenant()
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false)

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
      alert('Something went wrong. Please try again.')
      setIsLoadingCheckout(false)
    }
  }

  // 🔄 LOADING
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    )
  }

  // ❌ ERROR
  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-red-600 text-lg">Unable to load billing info.</div>
      </div>
    )
  }

  // ✅ ACTIVE
  if (tenant.subscriptionStatus === 'Active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-green-700 mb-2">
            Pro Plan Active
          </h1>
          <p className="text-gray-600">
            Your subscription is active.
          </p>
        </div>
      </div>
    )
  }

  // ⏳ TRIAL
  if (tenant.trialEndsAt) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          {/* Trial Banner */}
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl mb-8 flex justify-between items-center">
            <span>🚨 Trial · {daysLeft} days left</span>
            <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full ml-2">Trial</span>
          </div>

          {/* Pro Plan Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-lg mx-auto">
            <div className="flex flex-col items-center mb-4">
              <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full mb-2">Most popular</span>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Pro Plan</h2>
              <div className="text-4xl font-extrabold text-blue-700 mb-2">₪39<span className="text-lg font-medium text-gray-600">/month</span></div>
            </div>
            <ul className="text-gray-700 text-left mb-6 space-y-2">
              <li className="flex items-center gap-2"><span className="text-green-600">✔</span> Unlimited clients</li>
              <li className="flex items-center gap-2"><span className="text-green-600">✔</span> Automation</li>
              <li className="flex items-center gap-2"><span className="text-green-600">✔</span> Premium support</li>
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={isLoadingCheckout}
              className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoadingCheckout ? 'Redirecting...' : '🚀 Upgrade'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ❌ EXPIRED
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <h1 className="text-3xl font-bold text-red-700 mb-2">
          Subscription expired
        </h1>

        <button
          onClick={handleUpgrade}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Upgrade now
        </button>
      </div>
    </div>
  )
}