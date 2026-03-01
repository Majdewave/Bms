import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import he from './he.json'
import ar from './ar.json'

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en'
  return localStorage.getItem('language') || 'en'
}

const setDocumentDirection = (lng: string) => {
  if (typeof document === 'undefined') return
  const isRtl = lng === 'ar' || lng === 'he'
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      ar: { translation: ar },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

setDocumentDirection(i18n.language)

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lng)
  }
  setDocumentDirection(lng)
})

export default i18n
