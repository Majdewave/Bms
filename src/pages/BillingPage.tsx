import { useEffect, useState } from 'react'
import {
  CreditCard,
  AlertTriangle,
  Check,
  Loader,
  Clock,
  Users,
  MessageSquare,
} from 'lucide-react'
import { dashboardService } from '@/api'
import type { BillingStatus } from '@/api/dashboardService'

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)

  useEffect(() => {
    const fetchBillingStatus = async () => {
      try {
        setLoading(true)
        const data = await dashboardService.getBillingStatus()
        setBilling(data)
        setError(null)
      } catch (err) {
        setError('Failed to load billing information. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBillingStatus()
  }, [])

  const handleUpgrade = async (planType: number, billingCycle: number) => {
    setUpgradingPlan(`${planType}-${billingCycle}`)
    try {
      const response = await dashboardService.upgrade(planType, billingCycle)
      if (response.url) {
        window.location.href = response.url
      }
    } catch (err) {
      setError('Failed to initiate upgrade. Please try again.')
      console.error(err)
      setUpgradingPlan(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Trial':
        return 'bg-blue-50 border-blue-200'
      case 'Basic':
        return 'bg-emerald-50 border-emerald-200'
      case 'Pro':
        return 'bg-purple-50 border-purple-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getUpgradeOptions = (plan: string) => {
    if (plan === 'Trial') {
      return [
        { name: 'Basic - Monthly', planType: 1, billingCycle: 0, price: '₪39/month' },
        { name: 'Pro - Monthly', planType: 2, billingCycle: 0, price: '₪69/month' },
        { name: 'Pro - Yearly', planType: 2, billingCycle: 1, price: '₪690/year' },
      ]
    }
    if (plan === 'Basic') {
      return [
        { name: 'Pro - Monthly', planType: 2, billingCycle: 0, price: '₪69/month' },
        { name: 'Pro - Yearly', planType: 2, billingCycle: 1, price: '₪690/year' },
      ]
    }
    return []
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading billing information...</p>
        </div>
      </div>
    )
  }

  if (error || !billing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 font-semibold">{error || 'Unable to load billing information'}</p>
          </div>
        </div>
      </div>
    )
  }

  const upgradeOptions = getUpgradeOptions(billing.plan)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-10 h-10 text-blue-600" />
            Billing & Subscription
          </h1>
          <p className="text-gray-600 mt-2">Manage your account plan and billing settings</p>
        </div>

        {/* Suspension Warning */}
        {billing.isSuspended && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Account Suspended</h3>
                <p className="text-red-700 text-sm mt-1">
                  Your account has been suspended due to non-payment or policy violation. Please update your billing information to restore access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className={`bg-white border rounded-lg p-8 mb-6 ${getPlanColor(billing.plan)}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div>
              <h2 className="text-sm uppercase text-gray-600 font-semibold tracking-wide mb-2">
                Current Plan
              </h2>
              <h3 className="text-4xl font-bold text-gray-900 mb-4">{billing.plan}</h3>

              {/* Trial Info */}
              {billing.plan === 'Trial' && (
                <div className="bg-white/50 rounded-lg p-4 space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Trial Ends</p>
                      <p className="font-semibold text-gray-900">{formatDate(billing.trialEndsAt)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/30">
                    <p className="text-sm font-semibold text-gray-700">
                      {billing.daysRemaining} day{billing.daysRemaining !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Plan Details */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Billing Cycle</p>
                  <p className="font-semibold text-gray-900">{billing.billingCycle}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Status</p>
                  <p className="font-semibold text-gray-900">{billing.subscriptionStatus}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Features/Usage */}
            <div>
              <h4 className="text-sm uppercase text-gray-600 font-semibold tracking-wide mb-4">
                Plan Features
              </h4>
              <div className="space-y-4">
                <div className="bg-white/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-700">Users</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {billing.features.maxUsers === 2147483647
                      ? 'Unlimited'
                      : billing.features.maxUsers}
                  </p>
                </div>

                <div className="bg-white/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">Messages</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {billing.features.maxMessages === 2147483647
                      ? 'Unlimited'
                      : billing.features.maxMessages.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Check className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-gray-700">Support</span>
                  </div>
                  <p className="font-semibold text-gray-900">{billing.features.support}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        {upgradeOptions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upgrade Options</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upgradeOptions.map((option, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{option.name}</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-4">{option.price}</p>

                  <ul className="space-y-2 mb-6 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>All features included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Custom branding</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleUpgrade(option.planType, option.billingCycle)}
                    disabled={upgradingPlan === `${option.planType}-${option.billingCycle}`}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {upgradingPlan === `${option.planType}-${option.billingCycle}` ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Upgrade Now'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Pro Plan Message */}
        {billing.plan === 'Pro' && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're on Pro Plan</h2>
            <p className="text-gray-600">
              You have access to all premium features. Thank you for your subscription!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
