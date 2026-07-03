import { ArrowLeft, X } from 'lucide-react'
import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'
import ChatAvatar from './ChatAvatar'
import { resolveDisplayName } from '../utils/displayName'

interface ConversationHeaderProps {
  user: TeamChatOnlineUser
  onBack: () => void
  onClose: () => void
}

export default function ConversationHeader({ user, onBack, onClose }: ConversationHeaderProps) {
  const displayName = resolveDisplayName(user.FullName)

  return (
    <div className="px-4 py-3 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 text-white">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white flex items-center justify-center"
          aria-label="Back to online users"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative shrink-0">
            <ChatAvatar fullName={displayName} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-tight truncate">{displayName}</div>
            <div className="text-xs text-slate-200 leading-tight mt-0.5">Online</div>
          </div>
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