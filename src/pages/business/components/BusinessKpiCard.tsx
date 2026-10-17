import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  hint: string
  icon: LucideIcon
  tone?: 'slate' | 'primary' | 'emerald' | 'amber' | 'violet'
  // null renders the restricted state instead of a (misleading) zero.
  value: ReactNode | null
  unavailableText: string
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  slate: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-50 text-primary-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
}

export default function BusinessKpiCard({ label, hint, icon: Icon, tone = 'slate', value, unavailableText }: Props) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-slate-600">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {value === null ? (
        <p className="mt-3 text-lg font-semibold text-slate-400">{unavailableText}</p>
      ) : (
        <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 lg:text-[1.65rem]"><bdi>{value}</bdi></p>
      )}
      <p className="mt-2 text-xs leading-snug text-slate-500">{hint}</p>
    </div>
  )
}
