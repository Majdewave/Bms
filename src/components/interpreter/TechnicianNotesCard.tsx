import { FileText } from 'lucide-react'

export default function TechnicianNotesCard({
  title,
  notes,
  direction,
}: {
  title: string
  notes: string
  direction: 'ltr' | 'rtl'
}) {
  return (
    <section
      aria-label={title}
      dir={direction}
      className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-700" />
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <div
        data-testid="technician-notes-scroll-area"
        className="mt-3 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-amber-200/80 bg-white/80 p-3 sm:p-4"
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 [overflow-wrap:anywhere]">
          {notes}
        </p>
      </div>
    </section>
  )
}
