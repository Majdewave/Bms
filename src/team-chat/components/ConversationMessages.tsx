import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import type { TeamChatMessage } from '../types/TeamChatMessage'
import MessageBubble from './MessageBubble'
import MessageDateSeparator from './MessageDateSeparator'

interface ConversationMessagesProps {
  messages: TeamChatMessage[]
  currentUserId: string
}

const SCROLL_BOTTOM_THRESHOLD_PX = 80

const toDayKey = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDateLabel = (dayKey: string) => {
  if (!dayKey) return ''

  const now = new Date()
  const todayKey = toDayKey(now.toISOString())
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yesterdayKey = toDayKey(yesterday.toISOString())

  if (dayKey === todayKey) {
    return 'היום'
  }

  if (dayKey === yesterdayKey) {
    return 'אתמול'
  }

  const parsed = new Date(`${dayKey}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return dayKey
  }

  return parsed.toLocaleDateString('en-GB')
}

export default function ConversationMessages({ messages, currentUserId }: ConversationMessagesProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null)
  const wasNearBottomRef = useRef(true)
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false)

  const isNearBottom = useCallback((element: HTMLDivElement) => {
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    return distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD_PX
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomAnchorRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  const rows = useMemo(() => {
    const items: Array<
      | { type: 'separator'; key: string; label: string }
      | { type: 'message'; key: string; message: TeamChatMessage }
    > = []

    let previousDayKey = ''

    messages.forEach((message) => {
      const dayKey = toDayKey(message.sentAt)

      if (dayKey && dayKey !== previousDayKey) {
        items.push({
          type: 'separator',
          key: `separator-${dayKey}`,
          label: getDateLabel(dayKey),
        })
      }

      items.push({ type: 'message', key: message.id, message })
      previousDayKey = dayKey || previousDayKey
    })

    return items
  }, [messages])

  const handleScroll = useCallback(() => {
    const element = scrollContainerRef.current
    if (!element) return

    const nearBottomNow = isNearBottom(element)
    wasNearBottomRef.current = nearBottomNow

    if (nearBottomNow) {
      setShowNewMessagesButton(false)
    }
  }, [isNearBottom])

  useEffect(() => {
    const element = scrollContainerRef.current
    if (!element) return

    if (wasNearBottomRef.current) {
      scrollToBottom('smooth')
      setShowNewMessagesButton(false)
      return
    }

    setShowNewMessagesButton(true)
  }, [messages, scrollToBottom])

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-sm">
        No messages yet. Start the conversation.
      </div>
    )
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-3 py-3"
        aria-label="Conversation messages"
      >
        <div className="space-y-1.5">
          {rows.map((row) => {
            if (row.type === 'separator') {
              return <MessageDateSeparator key={row.key} label={row.label} />
            }

            return (
              <MessageBubble
                key={row.key}
                message={row.message}
                isOwnMessage={row.message.senderUserId === currentUserId}
              />
            )
          })}
          <div ref={bottomAnchorRef} />
        </div>
      </div>

      {showNewMessagesButton && (
        <button
          type="button"
          onClick={() => {
            scrollToBottom('smooth')
            setShowNewMessagesButton(false)
          }}
          className="absolute bottom-3 inset-x-0 mx-auto w-fit flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/95 backdrop-blur px-3 py-1.5 text-xs text-indigo-700 shadow"
          aria-label="Scroll to new messages"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          הודעות חדשות
        </button>
      )}
    </div>
  )
}
