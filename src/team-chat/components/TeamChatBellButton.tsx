import { forwardRef } from 'react'
import { Bell } from 'lucide-react'

interface TeamChatBellButtonProps {
  isOpen: boolean
  onClick: () => void
  unreadCount?: number
}

const TeamChatBellButton = forwardRef<HTMLButtonElement, TeamChatBellButtonProps>(function TeamChatBellButton(
  { isOpen, onClick, unreadCount = 0 },
  ref
) {
  const shouldShowUnread = !isOpen && unreadCount > 0

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`relative p-1.5 md:p-2 rounded-lg transition-colors ${
        isOpen
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
      aria-label="Open Team Chat"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls="team-chat-panel"
    >
      <Bell className="w-4.5 h-4.5 md:w-5 md:h-5" />
      {shouldShowUnread && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[18px] font-bold text-center shadow-sm">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
})

export default TeamChatBellButton
