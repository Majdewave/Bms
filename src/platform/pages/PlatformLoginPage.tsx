import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePlatformAuth } from '@/platform/auth/PlatformAuthContext'

export default function PlatformLoginPage() {
  const { login } = usePlatformAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await login(email, password)
      const state = location.state as { from?: { pathname?: string; search?: string } } | null
      const returnPath = state?.from?.pathname
        ? `${state.from.pathname}${state.from.search || ''}`
        : '/platform/dashboard'
      navigate(returnPath, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-slate-200 rounded-lg p-6 bg-white">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Platform Login</h1>
          <p className="text-sm text-slate-600 mt-1">Sign in to manage Clienta platform operations.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="platform-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="platform-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="input"
            />
          </div>

          <div>
            <label htmlFor="platform-password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="platform-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="input"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
