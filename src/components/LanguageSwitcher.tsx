import { useTranslation } from 'react-i18next'
import { Globe, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'he', label: 'עברית', short: 'HE' },
  { code: 'ar', label: 'العربية', short: 'AR' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium focus:outline-none"
        onClick={() => setOpen(v => !v)}
        aria-label="Language"
      >
        <Globe className="w-4 h-4 text-gray-500 hidden md:block" />
        {current.short}
        <ChevronDown className="w-3 h-3 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${i18n.language === lang.code ? 'font-semibold text-primary-700' : 'text-gray-700'}`}
              onClick={() => {
                i18n.changeLanguage(lang.code)
                setOpen(false)
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}