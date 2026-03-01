import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

export default function BillingSuccess() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/dashboard'
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-12 max-w-md mx-auto text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Success!</h1>

        <p className="text-gray-600 mb-8">
          Your subscription has been activated. You'll be redirected to your dashboard in a moment.
        </p>

        <div className="flex justify-center">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Redirecting in 2 seconds...
        </p>

        <a
          href="/dashboard"
          className="block mt-8 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
        >
          Go to Dashboard Now
        </a>
      </div>
    </div>
  )
}
