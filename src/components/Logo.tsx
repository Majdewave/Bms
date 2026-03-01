import { LucideProps } from 'lucide-react'

interface ClientaLogoProps {
  variant?: 'full' | 'icon' | 'compact'
  className?: string
  iconClassName?: string
  textClassName?: string
  subTextClassName?: string
}

// Dashboard grid icon - 3x3 panels representing a business management system
const DashboardIcon = (props: LucideProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Top row */}
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="13" y="3" width="8" height="7" rx="1" />
    
    {/* Bottom row */}
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="14" y="13" width="7" height="8" rx="1" />
  </svg>
)

export default function ClientaLogo({
  variant = 'full',
  className = '',
  iconClassName = '',
  textClassName = '',
  subTextClassName = '',
}: ClientaLogoProps) {
  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <DashboardIcon className={iconClassName || 'w-6 h-6 text-indigo-600'} />
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
          <DashboardIcon className="w-5 h-5 text-white" />
        </div>
        <span className={textClassName || 'text-lg font-bold text-slate-900'}>
          Clienta
        </span>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
        <DashboardIcon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className={textClassName || 'text-sm font-bold text-slate-900 leading-none'}>
          Clienta
        </p>
        <p className={subTextClassName || 'text-xs text-slate-500 mt-1'}>
          Business System
        </p>
      </div>
    </div>
  )
}

// Wordmark-only version for login page
export function ClientaWordmark({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${
        dark ? 'bg-white' : 'bg-gradient-to-br from-indigo-600 to-indigo-700'
      }`}>
        <DashboardIcon className={`w-6 h-6 ${dark ? 'text-indigo-600' : 'text-white'}`} />
      </div>
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${dark ? 'text-slate-900' : 'text-white'}`}>
          Clienta
        </h1>
      </div>
    </div>
  )
}
