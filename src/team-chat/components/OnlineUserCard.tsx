import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'
import ChatAvatar from './ChatAvatar'
import { resolveDisplayName } from '../utils/displayName'

interface OnlineUserCardProps {
  user: TeamChatOnlineUser
  unreadCount?: number
  lastMessagePreview?: string
  isSelected?: boolean
  onClick: () => void
}

const MAX_PREVIEW_LENGTH = 40

const formatUnreadBadge = (count: number) => (count > 99 ? '99+' : String(count))

const trimPreview = (text: string) => {
  const compactText = text.replace(/\s+/g, ' ').trim()
  if (compactText.length <= MAX_PREVIEW_LENGTH) {
    return compactText
  }

  return `${compactText.slice(0, MAX_PREVIEW_LENGTH - 1)}…`
}

export default function OnlineUserCard({
  user,
  unreadCount = 0,
  lastMessagePreview,
  isSelected = false,
  onClick,
}: OnlineUserCardProps) {
  const displayName = resolveDisplayName(user.FullName)
  const hasUnread = unreadCount > 0
  const previewText = lastMessagePreview ? trimPreview(lastMessagePreview) : ''

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Select conversation with ${displayName}`}
      className={`w-full text-start p-3 rounded-xl border transition-colors duration-200 cursor-pointer ${
        isSelected
          ? 'border-indigo-300 bg-indigo-50/60'
          : hasUnread
            ? 'border-slate-200 bg-blue-50/70 hover:bg-blue-50 hover:border-slate-300'
          : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <ChatAvatar fullName={displayName} />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={`min-w-0 text-sm text-slate-900 truncate ${hasUnread ? 'font-bold' : 'font-semibold'}`}>
              {displayName}
            </div>

            {hasUnread ? (
              <span className="ms-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                {formatUnreadBadge(unreadCount)}
              </span>
            ) : null}
          </div>

          <div className="text-xs text-slate-500 truncate">
            {previewText || 'אין הודעות'}
          </div>
        </div>
      </div>
    </button>
  )
}
