import { X } from 'lucide-react'

interface ChatHeaderProps {
  subtitle: string
  onClose: () => void
}

export default function ChatHeader({ subtitle, onClose }: ChatHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white rounded-t-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-indigo-50 drop-shadow-[0_1px_1px_rgba(15,23,42,0.65)]">Team Chat</h3>
          <p className="text-xs text-slate-200 mt-0.5">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center justify-center"
          aria-label="Close Team Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
