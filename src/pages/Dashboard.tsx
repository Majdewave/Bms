import { useEffect, useState } from 'react'
import {
  Calendar,
  DollarSign,
  FileText,
  FolderOpen,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { dashboardService } from '@/api'
import { PlanDisplay } from '@/components'
import type {
  NextAppointment,
  OutstandingBalance,
  LastInvoice,
  LastFile,
  PlanData,
  BillingStatus,
} from '@/api/dashboardService'

export default function Dashboard() {
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [plan, billing] = await Promise.all([
          dashboardService.getPlanData(),
          dashboardService.getBillingStatus(),
        ])

        setPlanData(plan)
        setBillingStatus(billing)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data'
        if (errorMessage === 'Unauthorized') {
          // User will be redirected to login by the service
          return
        }
        setError(errorMessage)
        alert('Failed to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const handleUpgrade = async (planType: number, billingCycle: number) => {
    try {
      const response = await dashboardService.upgrade(planType, billingCycle)
      // Redirect to Stripe checkout
      if (response.url) {
        window.location.href = response.url
      }
    } catch (error) {
      console.error('Upgrade failed:', error)
      alert('Failed to initiate upgrade. Please try again.')
    }
  }

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: 'text-green-600',
        }
      case 'pending':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: 'text-yellow-600',
        }
      case 'overdue':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-600',
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-600',
        }
    }
  }

  const invoiceStatus = lastInvoice ? getInvoiceStatusColor(lastInvoice.status) : null

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Loading your data...</p>
        </div>

        {/* Skeleton Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4" />
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Here's your account overview at a glance.</p>
      </div>

      {/* Suspension Warning Banner */}
      {billingStatus?.isSuspended && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">Account Suspended</h3>
            <p className="text-red-700 mt-1">
              Your account has been suspended due to non-payment or policy violation. Please contact support or upgrade your plan to restore access.
            </p>
            <button className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Display Card - Show at top spanning full width */}
        {billingStatus && (
          <div className="md:col-span-1">
            <PlanDisplay
              billingStatus={billingStatus}
              currentUsers={0}
              currentMessages={0}
              onUpgrade={handleUpgrade}
            />
          </div>
        )}

        {/* Next Appointment Card */}
        <div className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Next Appointment
              </p>
              <p className="text-gray-400 text-xs mt-1">Scheduled meeting</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {nextAppointment ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{nextAppointment.title}</h3>
                <p className="text-sm text-gray-600 mt-1">with {nextAppointment.attendee}</p>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-semibold">{nextAppointment.date}</span>
                <span className="text-gray-500">at</span>
                <span className="font-semibold">{nextAppointment.time}</span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors font-semibold text-blue-600 text-sm">
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No upcoming appointments</p>
              <p className="text-gray-500 text-sm mt-1">Schedule one to get started</p>
            </div>
          )}
        </div>

        {/* Outstanding Balance Card */}
        <div className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Outstanding Balance
              </p>
              <p className="text-gray-400 text-xs mt-1">Amount due</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-amber-600" />
            </div>
          </div>

          {outstandingBalance ? (
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  ${outstandingBalance.amount.toFixed(2)}
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Due: <span className="font-semibold">{outstandingBalance.dueDate}</span>
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <span className="text-sm font-semibold text-gray-700">
                  {outstandingBalance.invoiceCount} invoice(s) pending
                </span>
                <span className="text-xs font-bold text-amber-600 px-2 py-1 bg-amber-200 rounded">
                  {outstandingBalance.invoiceCount === 1 ? 'Action' : 'Review'}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors font-semibold text-amber-600 text-sm">
                  <span>Pay Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No outstanding balance</p>
              <p className="text-gray-500 text-sm mt-1">You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Last Invoice Card */}
        <div className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Last Invoice
              </p>
              <p className="text-gray-400 text-xs mt-1">Most recent billing</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          {lastInvoice && invoiceStatus ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{lastInvoice.number}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(lastInvoice.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  ${lastInvoice.amount.toFixed(2)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${invoiceStatus.bg} ${invoiceStatus.text}`}
                >
                  {lastInvoice.status === 'paid' && (
                    <CheckCircle className={`w-3 h-3 ${invoiceStatus.icon}`} />
                  )}
                  {lastInvoice.status === 'pending' && (
                    <Clock className={`w-3 h-3 ${invoiceStatus.icon}`} />
                  )}
                  {lastInvoice.status === 'overdue' && (
                    <AlertCircle className={`w-3 h-3 ${invoiceStatus.icon}`} />
                  )}
                  {lastInvoice.status.charAt(0).toUpperCase() + lastInvoice.status.slice(1)}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors font-semibold text-purple-600 text-sm">
                  <span>View Invoice</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No invoices yet</p>
              <p className="text-gray-500 text-sm mt-1">Your invoices will appear here</p>
            </div>
          )}
        </div>

        {/* Last Uploaded File Card */}
        <div className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">
                Last Uploaded File
              </p>
              <p className="text-gray-400 text-xs mt-1">Recent document</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {lastFile ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 truncate">{lastFile.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(lastFile.uploadedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">File Type</p>
                  <p className="text-sm font-bold text-gray-900">{lastFile.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Size</p>
                  <p className="text-sm font-bold text-gray-900">{lastFile.size}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors font-semibold text-green-600 text-sm">
                  <span>Download</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold">No files uploaded</p>
              <p className="text-gray-500 text-sm mt-1">Upload a document to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="px-4 py-3 bg-white hover:bg-gray-50 rounded-lg font-semibold text-gray-700 text-sm transition-colors border border-gray-200">
            Schedule Appointment
          </button>
          <button className="px-4 py-3 bg-white hover:bg-gray-50 rounded-lg font-semibold text-gray-700 text-sm transition-colors border border-gray-200">
            Request Invoice
          </button>
          <button className="px-4 py-3 bg-white hover:bg-gray-50 rounded-lg font-semibold text-gray-700 text-sm transition-colors border border-gray-200">
            Upload Document
          </button>
          <button className="px-4 py-3 bg-white hover:bg-gray-50 rounded-lg font-semibold text-gray-700 text-sm transition-colors border border-gray-200">
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}
