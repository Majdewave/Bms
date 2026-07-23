
import { useMemo, useState } from "react";
import { post } from "../api/apiClient";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { usePlatformConfig } from '@/hooks/usePlatformConfig'


export default function Register() {
  const { t, i18n } = useTranslation();
  const { config } = usePlatformConfig()
  const isRTL = i18n.dir() === 'rtl';
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const navigate = useNavigate();

  const { logout } = useAuth();

  type RegisterResponse = {
    success: boolean;
    message: string;
    status: string;
    tenantId: string;
  };



  // Robust error message extraction for backend and future errors
  const getErrorMessage = (apiError: any): string => {
    if (!apiError) return t('register.errors.registrationFailed');
    // Prefer code-based handling, fallback to message, then generic
    if (apiError.code) {
      switch (apiError.code) {
        case "FULL_NAME_REQUIRED":
          return t('register.errors.requiredField');
        case "BUSINESS_NAME_REQUIRED":
          return t('register.errors.requiredField');
        case "EMAIL_REQUIRED":
          return t('register.errors.requiredField');
        case "PASSWORD_REQUIRED":
          return t('register.errors.requiredField');
        case "PHONE_REQUIRED":
          return t('register.errors.phoneRequired');
        case "PHONE_INVALID":
          return t('register.errors.invalidPhone');
        case "PASSWORD_TOO_SHORT":
          return t('register.errors.passwordTooShort');
        case "PASSWORDS_DO_NOT_MATCH":
          return t('register.errors.passwordsDoNotMatch');
        case "USER_ALREADY_EXISTS":
          return t('register.errors.emailExists');
        case "DATABASE_ERROR":
          return t('register.errors.registrationFailed');
        case "UNKNOWN_ERROR":
          return t('register.errors.registrationFailed');
        // Add more known codes here as needed
        default:
          // If code is unknown, but message exists, show it
          return apiError.message || t('register.errors.registrationFailed');
      }
    }
    // If error is a string
    if (typeof apiError === "string") return apiError;
    // If error has a message
    if (apiError.message) return apiError.message;
    // If error has an error property
    if (apiError.error) return apiError.error;
    // Fallback
    return t('register.errors.registrationFailed');
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) return t('register.errors.requiredField');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return t('register.errors.invalidEmail');
    return null;
  };

  const validatePassword = (value: string) => {
    if (!value) return t('register.errors.requiredField');
    if (value.length < 6) return t('register.errors.passwordTooShort');
    return null;
  };

  const validatePhone = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return t('register.errors.phoneRequired');

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return t('register.errors.invalidPhone');
    }

    const phoneRegex = /^\+?[0-9()\-\s.]{7,20}$/;
    if (!phoneRegex.test(trimmed)) {
      return t('register.errors.invalidPhone');
    }

    return null;
  };

  const validateConfirmPassword = (value: string, basePassword: string) => {
    if (!value) return t('register.errors.requiredField');
    if (value !== basePassword) return t('register.errors.passwordsDoNotMatch');
    return null;
  };

  const fieldErrors = useMemo(
    () => ({
      businessName: !businessName.trim() ? t('register.errors.requiredField') : null,
      fullName: !fullName.trim() ? t('register.errors.requiredField') : null,
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword, password),
    }),
    [businessName, fullName, email, phone, password, confirmPassword, t]
  );

  const isFormValid = useMemo(
    () => Object.values(fieldErrors).every((error) => !error),
    [fieldErrors]
  );

  const getFieldError = (fieldName: keyof typeof fieldErrors) => {
    if (!submitAttempted && !touched[fieldName]) {
      return null;
    }

    return fieldErrors[fieldName];
  };

  const textAlignClass = isRTL ? 'text-right' : 'text-left';
  const iconButtonSideClass = isRTL ? 'left-3' : 'right-3';
  const passwordInputPaddingClass = isRTL ? 'pl-4 pr-12' : 'pl-4 pr-12';
  const trialDaysLabel = isRTL
    ? `${config.defaultTrialDays} ימי ניסיון חינם`
    : `${config.defaultTrialDays}-day free trial`;

  const handleFieldBlur = (fieldName: keyof typeof fieldErrors) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!isFormValid) {
      return;
    }

    setLoading(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      logout();
      const res = await post<RegisterResponse>("/api/auth/register", {
        businessName,
        email,
        phone,
        password,
        confirmPassword,
        language: i18n.language,
        timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
        fullName,
      });

      if (res.success) {
        setSuccessMessage(res.message);
        navigate('/login', { replace: true, state: { successMessage: res.message } });
      } else {
        setSubmitError(t('register.errors.registrationFailed'));
      }
    } catch (err: any) {
      // Try to extract error from known structure (apiClient throws ApiError)
      const apiError = err?.response || err;
      setSubmitError(getErrorMessage(apiError));
      // For future field-level error support:
      // if (apiError?.field) {
      //   setFieldError({ field: apiError.field, message: apiError.message });
      // }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center" dir={i18n.dir()}>
      <div className="flex flex-1 flex-col md:flex-row max-w-5xl mx-auto rounded-2xl overflow-hidden bg-white shadow-xl">
        {/* LEFT: Marketing/Branding */}
        <div className={`hidden md:flex flex-col justify-between p-10 w-1/2 bg-[linear-gradient(135deg,_#eff6ff,_#dbeafe)] relative ${textAlignClass}`}>
          <div>
            <img src="/clienta-logo.png" alt="Clienta" className="h-10 mb-2" />
            <div className="text-xs text-gray-500 mb-8">A product of digitalpenpro.com</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">{t('register.marketing.title')}</div>
            <div className="text-gray-700 mb-6">{t('register.marketing.subtitle')}</div>
            <ul className="mb-6 space-y-2">
              <li className={`flex items-center gap-2 text-gray-700 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500 text-lg">✔</span> {trialDaysLabel}</li>
              <li className={`flex items-center gap-2 text-gray-700 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500 text-lg">✔</span> {t('register.noCreditCardRequired')}</li>
              <li className={`flex items-center gap-2 text-gray-700 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500 text-lg">✔</span> {t('register.marketing.personalOnboardingAssistance')}</li>
            </ul>
            <div className="text-sm text-blue-900 font-medium mb-8">{t('register.marketing.trustedByPros')}</div>
            <div className="bg-white/90 rounded-xl p-4 border border-gray-200 mb-4">
              <div className="font-semibold text-gray-800 mb-1">{t('register.trialIncludes')}</div>
              <ul className="text-gray-700 text-sm space-y-1">
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.businessManagementTools')}</li>
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.clientManagement')}</li>
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.appointmentScheduling')}</li>
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.teamManagement')}</li>
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.documentsAndPdfs')}</li>
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.invoicing')}</li>
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.reportsAndDashboard')}</li>
                <li className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}><span className="text-green-500">✔</span> {t('register.features.fullSystemAccess')}</li>
              </ul>
            </div>
          </div>
          {/* Optional illustration or gradient */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-100 to-transparent pointer-events-none" />
        </div>

        {/* RIGHT: Registration Form */}
        <div className={`flex-1 flex flex-col justify-center p-8 sm:p-12 bg-white ${textAlignClass}`}>
          <div className="w-full max-w-md mx-auto mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <form onSubmit={handleSubmit} noValidate className={`w-full max-w-md mx-auto space-y-6 ${textAlignClass}`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('register.startFreeTrialTitle')}</h2>
            <div className="space-y-4">
              <div>
              <input
                className={`w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm ${textAlignClass}`}
                placeholder={t('register.businessName')}
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                onBlur={() => handleFieldBlur('businessName')}
                required
                autoFocus
              />
              {getFieldError('businessName') && <p className={`mt-1 text-sm text-red-600 ${textAlignClass}`}>{getFieldError('businessName')}</p>}
              </div>
              <div>
              <input
                className={`w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm ${textAlignClass}`}
                placeholder={t('register.fullName')}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => handleFieldBlur('fullName')}
                required
              />
              {getFieldError('fullName') && <p className={`mt-1 text-sm text-red-600 ${textAlignClass}`}>{getFieldError('fullName')}</p>}
              </div>
              <div>
              <input
                className={`w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm ${textAlignClass}`}
                placeholder={t('register.email')}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                required
              />
              {getFieldError('email') && <p className={`mt-1 text-sm text-red-600 ${textAlignClass}`}>{getFieldError('email')}</p>}
              </div>

              <div>
              <input
                className={`w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm ${textAlignClass}`}
                placeholder={t('register.phoneNumber')}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => handleFieldBlur('phone')}
                required
              />
              {getFieldError('phone') ? (
                <p className={`mt-1 text-sm text-red-600 ${textAlignClass}`}>{getFieldError('phone')}</p>
              ) : (
                <p className={`mt-1 text-xs text-gray-500 ${textAlignClass}`}>{t('register.phoneHelper')}</p>
              )}
              </div>

              <div>
              <div className="relative">
                <input
                  className={`w-full border border-gray-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm ${passwordInputPaddingClass} ${textAlignClass}`}
                  placeholder={t('register.password')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  required
                />
                <button
                  type="button"
                  className={`absolute ${iconButtonSideClass} top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700`}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {getFieldError('password') && <p className={`mt-1 text-sm text-red-600 ${textAlignClass}`}>{getFieldError('password')}</p>}
              </div>

              <div>
              <div className="relative">
                <input
                  className={`w-full border border-gray-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm ${passwordInputPaddingClass} ${textAlignClass}`}
                  placeholder={t('register.confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  required
                />
                <button
                  type="button"
                  className={`absolute ${iconButtonSideClass} top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700`}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {getFieldError('confirmPassword') && <p className={`mt-1 text-sm text-red-600 ${textAlignClass}`}>{getFieldError('confirmPassword')}</p>}
              </div>
            </div>
            {submitError && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 text-sm text-center mt-2">
                ⚠️ {submitError}
              </div>
            )}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 text-sm text-center mt-2">
                {successMessage}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#2563eb] hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 text-white font-semibold py-3 rounded-lg shadow transition text-lg mt-2"
              style={{transition: 'box-shadow 0.2s, transform 0.2s'}}
              disabled={loading}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px 0 #2563eb22'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              {loading ? t('register.creatingAccount') : t('register.startFreeTrial')}
            </button>
            <div className="text-xs text-gray-500 text-center mt-3">{t('register.noCreditCardRequired')}</div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {config.supportPhone || config.supportEmail}
            </div>
          </form>
          <div className="mt-10 text-center text-sm text-gray-600">
            {t('register.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-[#2563eb] font-semibold hover:underline">{t('register.login')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
