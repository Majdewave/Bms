interface MessageDateSeparatorProps {
  label: string
}

export default function MessageDateSeparator({ label }: MessageDateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-2" role="separator" aria-label={label}>
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}