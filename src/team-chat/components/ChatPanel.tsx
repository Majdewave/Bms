import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { useTeamChat } from '../hooks/useTeamChat'
import { useAuth } from '@/contexts/AuthContext'
import OnlineUsersView from './OnlineUsersView'
import ConversationView from './ConversationView'
import ChatPanelSkeleton from './ChatPanelSkeleton'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatPanelSize {
  width: number
  height: number
}

interface ConversationListMeta {
  unreadCount: number
  hasMessages: boolean
  lastActivityTimestamp: number
  lastPreviewText: string
}

const CHAT_PANEL_SIZE_STORAGE_KEY = 'teamChat:panelSize'
const DEFAULT_PANEL_SIZE: ChatPanelSize = {
  width: 430,
  height: 620,
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const readSavedPanelSize = (): ChatPanelSize => {
  if (typeof window === 'undefined') return DEFAULT_PANEL_SIZE

  const raw = window.localStorage.getItem(CHAT_PANEL_SIZE_STORAGE_KEY)
  if (!raw) return DEFAULT_PANEL_SIZE

  try {
    const parsed = JSON.parse(raw) as Partial<ChatPanelSize>
    const width = clamp(Number(parsed.width) || DEFAULT_PANEL_SIZE.width, 360, 650)
    const maxHeight = Math.max(500, window.innerHeight - 96)
    const height = clamp(Number(parsed.height) || DEFAULT_PANEL_SIZE.height, 500, maxHeight)
    return { width, height }
  } catch {
    return DEFAULT_PANEL_SIZE
  }
}

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const {
    onlineUsers,
    selectedUser,
    selectUser,
    clearSelectedUser,
    conversations,
    unreadCounts,
    getConversationIdForUser,
    markConversationAsRead,
  } = useTeamChat()
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [panelSize, setPanelSize] = useState<ChatPanelSize>(readSavedPanelSize)
  const panelRef = useRef<HTMLElement | null>(null)
  const manualSelectionClearRef = useRef(false)
  const previousSelectedUserIdRef = useRef<string | null>(null)
  const isRTL = i18n.dir() === 'rtl'

  const usersWithoutCurrentUser = useMemo(
    () => onlineUsers.filter((onlineUser) => onlineUser.UserId !== user?.id),
    [onlineUsers, user?.id]
  )

  const conversationMetaByUserId = useMemo(() => {
    const nextMap = new Map<string, ConversationListMeta>()

    usersWithoutCurrentUser.forEach((onlineUser) => {
      const conversationId = getConversationIdForUser(onlineUser.UserId)
      const messages = conversationId ? conversations.get(conversationId) ?? [] : []
      const latestMessage = messages[messages.length - 1]
      const lastPreviewText = latestMessage?.text?.replace(/\s+/g, ' ').trim() ?? ''
      const parsedTimestamp = latestMessage?.sentAt ? Date.parse(latestMessage.sentAt) : 0

      nextMap.set(onlineUser.UserId, {
        unreadCount: conversationId ? unreadCounts.get(conversationId) ?? 0 : 0,
        hasMessages: messages.length > 0,
        lastActivityTimestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0,
        lastPreviewText,
      })
    })

    return nextMap
  }, [usersWithoutCurrentUser, getConversationIdForUser, conversations, unreadCounts])

  const sortedUsers = useMemo(() => {
    return [...usersWithoutCurrentUser].sort((a, b) => {
      const metaA = conversationMetaByUserId.get(a.UserId)
      const metaB = conversationMetaByUserId.get(b.UserId)

      const unreadA = (metaA?.unreadCount ?? 0) > 0
      const unreadB = (metaB?.unreadCount ?? 0) > 0

      if (unreadA !== unreadB) {
        return unreadA ? -1 : 1
      }

      const hasMessagesA = metaA?.hasMessages ?? false
      const hasMessagesB = metaB?.hasMessages ?? false
      const lastTimestampA = metaA?.lastActivityTimestamp ?? 0
      const lastTimestampB = metaB?.lastActivityTimestamp ?? 0

      if (unreadA && unreadB) {
        if (lastTimestampA !== lastTimestampB) {
          return lastTimestampB - lastTimestampA
        }
      } else {
        if (hasMessagesA !== hasMessagesB) {
          return hasMessagesA ? -1 : 1
        }

        if (hasMessagesA && hasMessagesB && lastTimestampA !== lastTimestampB) {
          return lastTimestampB - lastTimestampA
        }
      }

      return a.FullName.localeCompare(b.FullName, i18n.language || undefined, { sensitivity: 'base' })
    })
  }, [usersWithoutCurrentUser, conversationMetaByUserId, i18n.language])

  const unreadCountsByUserId = useMemo(() => {
    const nextMap = new Map<string, number>()

    sortedUsers.forEach((onlineUser) => {
      nextMap.set(onlineUser.UserId, conversationMetaByUserId.get(onlineUser.UserId)?.unreadCount ?? 0)
    })

    return nextMap
  }, [sortedUsers, conversationMetaByUserId])

  const previewsByUserId = useMemo(() => {
    const nextMap = new Map<string, string>()

    sortedUsers.forEach((onlineUser) => {
      const previewText = conversationMetaByUserId.get(onlineUser.UserId)?.lastPreviewText ?? ''
      if (previewText) {
        nextMap.set(onlineUser.UserId, previewText)
      }
    })

    return nextMap
  }, [sortedUsers, conversationMetaByUserId])

  useEffect(() => {
    const onWindowResize = () => {
      const nextIsMobile = window.innerWidth < 768
      setIsMobile(nextIsMobile)

      if (!nextIsMobile) {
        const maxHeight = Math.max(500, window.innerHeight - 96)
        setPanelSize((prev) => ({
          width: clamp(prev.width, 360, 650),
          height: clamp(prev.height, 500, maxHeight),
        }))
      }
    }

    onWindowResize()
    window.addEventListener('resize', onWindowResize)
    return () => {
      window.removeEventListener('resize', onWindowResize)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    setShowSkeleton(true)
    const skeletonTimeoutId = window.setTimeout(() => {
      setShowSkeleton(false)
    }, 220)

    return () => {
      window.clearTimeout(skeletonTimeoutId)
      setShowSkeleton(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    panelRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || isMobile || !panelRef.current) return

    const element = panelRef.current
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const maxHeight = Math.max(500, window.innerHeight - 96)
      const nextSize = {
        width: clamp(Math.round(entry.contentRect.width), 360, 650),
        height: clamp(Math.round(entry.contentRect.height), 500, maxHeight),
      }

      setPanelSize(nextSize)
      window.localStorage.setItem(CHAT_PANEL_SIZE_STORAGE_KEY, JSON.stringify(nextSize))
    })

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [isOpen, isMobile])

  useEffect(() => {
    const previousSelectedUserId = previousSelectedUserIdRef.current
    const currentSelectedUserId = selectedUser?.UserId ?? null

    if (currentSelectedUserId) {
      previousSelectedUserIdRef.current = currentSelectedUserId
      return
    }

    if (previousSelectedUserId && !manualSelectionClearRef.current) {
      toast.info('המשתמש התנתק.', { autoClose: 1800 })
    }

    previousSelectedUserIdRef.current = null
    manualSelectionClearRef.current = false
  }, [selectedUser])

  const handleClose = useCallback(() => {
    manualSelectionClearRef.current = true
    onClose()
  }, [onClose])

  const handleBackToOnlineUsers = useCallback(() => {
    manualSelectionClearRef.current = true
    clearSelectedUser()
  }, [clearSelectedUser])

  const handleSelectUser = useCallback((nextUser: (typeof sortedUsers)[number]) => {
    selectUser(nextUser)
  }, [selectUser])

  useEffect(() => {
    if (!isOpen || !selectedUser) {
      return
    }

    const conversationId = getConversationIdForUser(selectedUser.UserId)
    if (!conversationId) {
      return
    }

    markConversationAsRead(conversationId)
  }, [isOpen, selectedUser?.UserId, getConversationIdForUser, markConversationAsRead])

  useEffect(() => {
    if (!isOpen) return

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
    }
  }, [isOpen, handleClose])

  const desktopPanelStyle = !isMobile
    ? {
        width: `${panelSize.width}px`,
        height: `${panelSize.height}px`,
        minWidth: '360px',
        maxWidth: '650px',
        minHeight: '500px',
        maxHeight: 'calc(100vh - 96px)',
      }
    : undefined

  return (
    <>
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-slate-900/30 transition-opacity duration-200 z-40 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      <section
        ref={panelRef}
        id="team-chat-panel"
        role="dialog"
        aria-label="Team Chat Panel"
        tabIndex={-1}
        className={`fixed z-50 bg-white border border-slate-200 shadow-2xl transition-all duration-200 ease-out flex flex-col
          inset-x-0 bottom-0 top-3 rounded-t-2xl
          md:inset-auto md:top-20 md:bottom-auto md:w-[430px] md:rounded-2xl md:resize-both md:overflow-hidden
          ${isRTL ? 'md:left-6' : 'md:right-6'}
          ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-[0.985] pointer-events-none'}
        `}
        style={desktopPanelStyle}
        aria-hidden={!isOpen}
      >
        {showSkeleton ? (
          <ChatPanelSkeleton />
        ) : selectedUser ? (
          <ConversationView
            user={selectedUser}
            onBack={handleBackToOnlineUsers}
            onClose={handleClose}
          />
        ) : (
          <OnlineUsersView
            users={sortedUsers}
            unreadCountsByUserId={unreadCountsByUserId}
            previewsByUserId={previewsByUserId}
            selectedUserId={selectedUser?.UserId}
            onSelectUser={handleSelectUser}
            onClose={handleClose}
          />
        )}
      </section>
    </>
  )
}
