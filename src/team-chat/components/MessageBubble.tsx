import type { TeamChatMessage } from '../types/TeamChatMessage'

interface MessageBubbleProps {
  message: TeamChatMessage
  isOwnMessage: boolean
}

const formatTime = (sentAt: string) => {
  const parsedDate = new Date(sentAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return '--:--'
  }

  return parsedDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} py-0.5`}>
      <div
        className={`max-w-[76%] rounded-[18px] px-3.5 py-2.5 border shadow-[0_1px_0_rgba(15,23,42,0.04)] ${
          isOwnMessage
            ? 'bg-indigo-600 text-white border-indigo-500 rounded-br-[8px]'
            : 'bg-slate-100 text-slate-900 border-slate-200 rounded-bl-[8px]'
        }`}
      >
        <p className={`text-sm whitespace-pre-wrap break-words ${isOwnMessage ? 'text-white' : 'text-slate-900'}`}>
          {message.text}
        </p>
        <div className={`text-[11px] mt-1.5 ${isOwnMessage ? 'text-white/80' : 'text-slate-500'}`}>
          {formatTime(message.sentAt)}
        </div>
      </div>
    </div>
  )
}
