import { Info } from 'lucide-react'

export default function TemporaryChatNotice() {
  return (
    <div
      className="mx-3 mt-3 mb-1 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900"
      role="note"
      aria-label="Temporary chat notice"
    >
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
        <p className="leading-relaxed">
          הודעות בצ&apos;אט הן זמניות ואינן נשמרות לאחר רענון הדף או יציאה מהמערכת.
        </p>
      </div>
    </div>
  )
}