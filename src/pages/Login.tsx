import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { ClientaWordmark } from '@/components/Logo'


import { post } from "../api/apiClient";

interface FormErrors {
  email?: string
  password?: string
  submit?: string
}

interface FormData {
  email: string
  password: string
  rememberMe: boolean
}

export default function Login() {
  const navigate = useNavigate()
  const { login: authLogin, user } = useAuth()
  const { t, i18n } = useTranslation()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [successMessage, setSuccessMessage] = useState('')


  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: savedEmail,
        rememberMe: true,
      }))
    }
  }, [])

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return t('login.emailRequired')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return t('login.emailInvalid')
    }
    return undefined
  }

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return t('login.passwordRequired')
    }
    if (password.length < 6) {
      return t('login.passwordMin')
    }
    return undefined
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    const emailError = validateEmail(formData.email)
    if (emailError) {
      newErrors.email = emailError
    }

    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      newErrors.password = passwordError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))

    // Real-time validation for touched fields
    if (touched[name]) {
      if (name === 'email') {
        const error = validateEmail(value)
        setErrors((prev) => ({
          ...prev,
          email: error,
        }))
      } else if (name === 'password') {
        const error = validatePassword(value)
        setErrors((prev) => ({
          ...prev,
          password: error,
        }))
      }
    }

    // Clear submit error when user starts typing
    if (errors.submit) {
      setErrors((prev) => ({
        ...prev,
        submit: undefined,
      }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))

    // Validate on blur
    if (name === 'email') {
      const error = validateEmail(formData.email)
      setErrors((prev) => ({
        ...prev,
        email: error,
      }))
    } else if (name === 'password') {
      const error = validatePassword(formData.password)
      setErrors((prev) => ({
        ...prev,
        password: error,
      }))
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')

    // Validate form
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Use AuthContext login (sets user in context)
      type LoginResponse = {
      token: string;
      user: any;
    };

    await authLogin(formData.email, formData.password);
    navigate("/admin/dashboard", { replace: true });
    setSuccessMessage("Login successful");

      // Handle remember me
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      // Show success message
      setSuccessMessage(t('login.success'))
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: t('login.invalidCredentials'),
      }))
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.email && formData.password && !errors.email && !errors.password

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Modern SaaS Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        {/* Background - Dark Navy to Navy Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950"></div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          {/* Grid Pattern - Subtle Blue/Purple */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Floating Abstract Cards - Dashboard Elements */}
        <div className="absolute top-20 right-20 w-48 h-32 bg-gradient-to-br from-indigo-600/5 to-blue-600/5 rounded-lg backdrop-blur border border-indigo-500/15 shadow-xl transform -rotate-6 opacity-50"></div>
        <div className="absolute top-40 right-10 w-40 h-24 bg-gradient-to-br from-purple-600/5 to-indigo-600/5 rounded-lg backdrop-blur border border-purple-500/15 shadow-lg transform rotate-3 opacity-40"></div>
        
        {/* Middle Elements */}
        <div className="absolute top-1/2 left-20 w-56 h-40 bg-gradient-to-br from-indigo-600/5 to-slate-700/5 rounded-xl backdrop-blur border border-indigo-500/15 shadow-lg transform rotate-12 opacity-45"></div>
        
        {/* Bottom Elements */}
        <div className="absolute bottom-32 right-32 w-52 h-36 bg-gradient-to-br from-indigo-600/5 to-slate-700/5 rounded-lg backdrop-blur border border-indigo-500/15 shadow-xl transform -rotate-3 opacity-45"></div>
        <div className="absolute bottom-20 left-40 w-44 h-32 bg-gradient-to-br from-purple-600/5 to-indigo-600/5 rounded-xl backdrop-blur border border-purple-500/15 shadow-lg transform rotate-6 opacity-40"></div>

        {/* Glow Accents - Subtle Blue/Purple */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl opacity-15"></div>

        {/* Light rays / accent lines - Purple/Blue */}
        <div className="absolute top-0 right-1/3 w-1 h-64 bg-gradient-to-b from-indigo-500/20 to-transparent opacity-30"></div>
        <div className="absolute bottom-0 left-1/4 w-1 h-96 bg-gradient-to-t from-purple-500/20 to-transparent opacity-30"></div>

        {/* Content - Relative positioning */}
        <div className="relative z-10">
          <div className="mb-12">
            {/* Professional Logo */}
             <img src="/clienta-logo.png" alt="Clienta" className="h-10 mb-2" />
            <div className="text-xs text-gray-500 mb-8">A product of digitalpenpro.com</div>
          </div>

          {/* Divider */}
          <div className="w-16 h-0.5 bg-gradient-to-r from-indigo-400/50 to-transparent mb-8"></div>
          
          <h2 className="text-2xl font-semibold text-white mb-3 leading-tight">
            {t('login.productTitle')}
          </h2>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            {t('login.productDescription')}
          </p>

          {/* System Capabilities */}
          <div className="space-y-2.5">
            {[
              { key: 'clientData' },
              { key: 'workflows' },
              { key: 'analytics' },
              { key: 'security' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                <span className="text-slate-400">{t(`login.capabilities.${feature.key}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Relative */}
        <div className="relative z-10">
          <p className="text-slate-500 text-xs">
            {t('login.copyright')}
          </p>
        </div>
      </div>

      {/* Right Side - Login Form with UI Background */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle UI Background Elements */}
        <div className="absolute inset-0 bg-slate-50">
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-30">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="form-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(100, 116, 139, 0.08)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#form-grid)" />
            </svg>
          </div>

          {/* Translucent panel cards - like a dashboard */}
          <div className="absolute top-10 right-10 w-40 h-24 bg-white/40 backdrop-blur-sm border border-slate-200/50 rounded-lg shadow-sm"></div>
          <div className="absolute top-32 right-28 w-32 h-20 bg-white/30 backdrop-blur-sm border border-slate-200/40 rounded-lg shadow-sm"></div>
          <div className="absolute bottom-20 left-10 w-36 h-28 bg-white/40 backdrop-blur-sm border border-slate-200/50 rounded-lg shadow-sm"></div>
          <div className="absolute bottom-40 left-32 w-28 h-20 bg-white/30 backdrop-blur-sm border border-slate-200/40 rounded-lg shadow-sm"></div>
          
          {/* Accent glow */}
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-indigo-100/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-purple-100/15 rounded-full blur-3xl"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo - only visible on small screens */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 opacity-60"></div>
                <div className="relative text-xl font-bold">
                  <span className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 bg-clip-text text-transparent">C</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clienta</h1>
                <p className="text-xs text-slate-500 tracking-wide uppercase">{t('login.systemLabel')}</p>
              </div>
            </div>
          </div>

          {/* Login Card with Premium Feel */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 p-8 backdrop-blur-sm">
            {/* Headline */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">{t('login.accessTitle')}</h2>
              <p className="text-sm text-slate-600">{t('login.accessDescription')}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Success Message */}
              {successMessage && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Submit Error */}
            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-red-700">{errors.submit}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                {t('login.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="you@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    errors.email && touched.email
                      ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:ring-offset-red-50'
                      : 'border-slate-300 hover:border-slate-400 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                  }`}
                  required
                />
              </div>
              {errors.email && touched.email && (
                <p className="mt-1.5 text-sm font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-5">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                {t('login.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    errors.password && touched.password
                      ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:ring-offset-red-50'
                      : 'border-slate-300 hover:border-slate-400 focus:ring-indigo-500 focus:border-indigo-500 bg-white'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && touched.password && (
                <p className="mt-1.5 text-sm font-medium text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex justify-between items-center mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 font-medium">{t('login.rememberMe')}</span>
              </label>
              <a
                href="#"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                {t('login.forgotPassword')}
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mb-5 ${
                loading || !isFormValid
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('login.signingIn')}
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {t('login.signIn')}
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-600"></span>
              </div>
            </div>
          </form>
          </div>

          {/* Footer Link - Outside Card */}
          <p className="text-center text-slate-600 text-sm mt-6">
            {t('login.noAccount')}{' '}
            <a 
              href="mailto:support@clienta.com?subject=New Account Request" 
              className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {t('login.contactUs')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
