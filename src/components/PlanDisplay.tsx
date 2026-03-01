import { useState } from 'react'
import { Zap, ArrowRight, Loader } from 'lucide-react'
import type { BillingStatus } from '@/api/dashboardService'

interface PlanDisplayProps {
  billingStatus: BillingStatus
  currentUsers?: number
  currentMessages?: number
  onUpgrade?: (planType: number, billingCycle: number) => Promise<void>
}

export default function PlanDisplay({
  billingStatus,
  currentUsers = 0,
  currentMessages = 0,
  onUpgrade,
}: PlanDisplayProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const planName = billingStatus.plan

  const handleUpgradeClick = async () => {
    if (!onUpgrade) return

    setIsUpgrading(true)
    try {
      // Upgrade to Basic for Trial, or to Pro for Basic
      const planType = planName === 'Trial' ? 1 : 2 // 1 = Basic, 2 = Pro
      const billingCycle = 0 // Monthly
      await onUpgrade(planType, billingCycle)
    } catch (error) {
      console.error('Upgrade failed:', error)
    } finally {
      setIsUpgrading(false)
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Trial':
        return {
          icon: 'bg-blue-100 text-blue-600',
          badge: 'bg-blue-100 text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-200',
          textColor: 'text-blue-600',
        }
      case 'Basic':
        return {
          icon: 'bg-emerald-100 text-emerald-600',
          badge: 'bg-emerald-100 text-emerald-700',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          border: 'border-emerald-200',
          textColor: 'text-emerald-600',
        }
      case 'Pro':
        return {
          icon: 'bg-purple-100 text-purple-600',
          badge: 'bg-purple-100 text-purple-700',
          button: 'bg-purple-600 hover:bg-purple-700 text-white',
          border: 'border-purple-200',
          textColor: 'text-purple-600',
        }
      default:
        return {
          icon: 'bg-gray-100 text-gray-600',
          badge: 'bg-gray-100 text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
          border: 'border-gray-200',
          textColor: 'text-gray-600',
        }
    }
  }

  const colors = getPlanColor(planName)

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className={`bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 border ${colors.border}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
            Current Plan
          </p>
          <p className="text-gray-400 text-xs mt-1">Usage & subscription</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
          <Zap className="w-6 h-6" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Plan Info */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{planName}</h3>
              {planName === 'Trial' && (
                <p className="text-sm text-gray-600 mt-1">
                  Trial ends in <span className="font-semibold">{billingStatus.daysRemaining} days</span>
                </p>
              )}
              {planName === 'Basic' && (
                <p className="text-sm text-gray-600 mt-1">₪39/month</p>
              )}
              {planName === 'Pro' && (
                <p className="text-sm text-gray-600 mt-1">₪69/month</p>
              )}
            </div>
            {planName === 'Trial' && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                Active
              </span>
            )}
          </div>
        </div>

        {/* Usage Counters */}
        <div className="space-y-5">
          {/* Users Counter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Users</span>
              <span className="text-sm font-bold text-gray-900">
                {currentUsers} / {billingStatus.userLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getUsageBarColor(
                  billingStatus.userLimit > 0 ? (currentUsers * 100) / billingStatus.userLimit : 0
                )}`}
                style={{
                  width: `${Math.min(
                    billingStatus.userLimit > 0 ? (currentUsers * 100) / billingStatus.userLimit : 0,
                    100
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(billingStatus.userLimit > 0 ? (currentUsers * 100) / billingStatus.userLimit : 0)}% of plan limit
            </p>
          </div>

          {/* Messages Counter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Messages</span>
              <span className="text-sm font-bold text-gray-900">
                {currentMessages.toLocaleString()} / {billingStatus.messageLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getUsageBarColor(
                  billingStatus.messageLimit > 0 ? (currentMessages * 100) / billingStatus.messageLimit : 0
                )}`}
                style={{
                  width: `${Math.min(
                    billingStatus.messageLimit > 0 ? (currentMessages * 100) / billingStatus.messageLimit : 0,
                    100
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(billingStatus.messageLimit > 0 ? (currentMessages * 100) / billingStatus.messageLimit : 0)}% of plan limit
            </p>
          </div>
        </div>

        {/* Trial Countdown (if active) */}
        {planName === 'Trial' && (
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border border-gray-200" style={{ borderLeftColor: 'currentColor' }}>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Trial Period:</span> Ends {formatDate(billingStatus.trialEndsAt)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {billingStatus.daysRemaining} days remaining
            </p>
          </div>
        )}

        {/* Call to Action */}
        {(planName === 'Trial' || planName === 'Basic') && (
          <div className="pt-4 border-t border-gray-300">
            <button
              onClick={handleUpgradeClick}
              disabled={isUpgrading || !onUpgrade}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${colors.button} ${
                isUpgrading || !onUpgrade ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <span>{planName === 'Trial' ? 'Upgrade Now' : 'Upgrade to Pro'}</span>
              {isUpgrading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Plan Features */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase">Plan Features</p>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${colors.textColor}`} />
              <span>Support: {billingStatus.features.support}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${colors.textColor}`} />
              <span>Priority: {billingStatus.features.priority}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${colors.textColor}`} />
              <span>Custom Branding: {billingStatus.features.customBranding ? 'Included' : 'Not included'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
