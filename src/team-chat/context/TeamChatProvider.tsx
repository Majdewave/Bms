import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useDepartmentFeatures } from '@/contexts/DepartmentFeatureContext'
import { TeamChatService } from '../services/TeamChatService'
import type { TeamChatConnectionState } from '../types/TeamChatConnectionState'
import type { TeamChatMessage } from '../types/TeamChatMessage'
import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'
import { buildDirectConversationId } from '../utils/conversationId'

const MAX_MESSAGES_PER_CONVERSATION = 100

interface TeamChatContextValue {
  onlineUsers: TeamChatOnlineUser[]
  selectedUser: TeamChatOnlineUser | null
  conversations: Map<string, TeamChatMessage[]>
  unreadCounts: Map<string, number>
  totalUnreadCount: number
  connectionState: TeamChatConnectionState
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  sendMessage: (recipientUserId: string, text: string) => Promise<void>
  getConversationIdForUser: (otherUserId: string) => string
  getConversationMessages: (conversationId: string) => TeamChatMessage[]
  markConversationAsRead: (conversationId: string) => void
  selectUser: (user: TeamChatOnlineUser) => void
  clearSelectedUser: () => void
}

export const TeamChatContext = createContext<TeamChatContextValue | undefined>(undefined)

export const TeamChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, getAccessToken } = useAuth()
  const { departmentFeatures } = useDepartmentFeatures()
  const [onlineUsers, setOnlineUsers] = useState<TeamChatOnlineUser[]>([])
  const [selectedUser, setSelectedUser] = useState<TeamChatOnlineUser | null>(null)
  const [conversations, setConversations] = useState<Map<string, TeamChatMessage[]>>(() => new Map())
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(() => new Map())
  const [connectionState, setConnectionState] = useState<TeamChatConnectionState>('Disconnected')

  const serviceRef = useRef<TeamChatService | null>(null)
  const previousUserIdRef = useRef<string | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const selectedUserIdRef = useRef<string | null>(null)

  if (!serviceRef.current) {
    const apiBase = ((import.meta as any).env.VITE_API_URL || '').replace(/\/$/, '')

    serviceRef.current = new TeamChatService({
      baseUrl: apiBase,
      accessTokenFactory: getAccessToken,
    })
  }

  const service = serviceRef.current
  const isTeamChatEnabled = departmentFeatures?.teamChatEnabled === true

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null
  }, [user?.id])

  useEffect(() => {
    selectedUserIdRef.current = selectedUser?.UserId ?? null
  }, [selectedUser?.UserId])

  const markConversationAsRead = useCallback((conversationId: string) => {
    if (!conversationId) {
      return
    }

    setUnreadCounts((previousMap) => {
      if (!previousMap.has(conversationId)) {
        return previousMap
      }

      const nextMap = new Map(previousMap)
      nextMap.delete(conversationId)
      return nextMap
    })
  }, [])

  const playIncomingMessageSound = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const audioContext = new window.AudioContext()
      const masterGain = audioContext.createGain()
      masterGain.connect(audioContext.destination)

      const scheduleBeep = (startAt: number, frequency: number, peak: number) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(frequency, startAt)

        gainNode.gain.setValueAtTime(0.0001, startAt)
        gainNode.gain.exponentialRampToValueAtTime(peak, startAt + 0.008)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.095)

        oscillator.connect(gainNode)
        gainNode.connect(masterGain)

        oscillator.start(startAt)
        oscillator.stop(startAt + 0.1)
      }

      const now = audioContext.currentTime
      scheduleBeep(now, 1080, 0.2)
      scheduleBeep(now + 0.11, 1320, 0.22)

      window.setTimeout(() => {
        void audioContext.close()
      }, 350)
    } catch {
      // Ignore blocked audio contexts (e.g., browser autoplay policy)
    }
  }, [])

  useEffect(() => {
    const unsubscribeUsers = service.subscribeOnlineUsers(setOnlineUsers)
    const unsubscribeMessages = service.subscribeMessages((message) => {
      const currentUserId = currentUserIdRef.current
      if (!currentUserId) return

      const isCurrentUserSender = message.senderUserId === currentUserId
      const isCurrentUserRecipient = message.recipientUserId === currentUserId

      if (!isCurrentUserSender && !isCurrentUserRecipient) {
        return
      }

      const conversationUserId = isCurrentUserSender
        ? message.recipientUserId
        : message.senderUserId

      if (!conversationUserId) return

      const conversationId = buildDirectConversationId(currentUserId, conversationUserId)
      if (!conversationId) return

      setConversations((previousMap) => {
        const previousMessages = previousMap.get(conversationId) ?? []

        if (previousMessages.some((existingMessage) => existingMessage.id === message.id)) {
          return previousMap
        }

        const nextMessages = [...previousMessages, message]
        const boundedMessages =
          nextMessages.length > MAX_MESSAGES_PER_CONVERSATION
            ? nextMessages.slice(nextMessages.length - MAX_MESSAGES_PER_CONVERSATION)
            : nextMessages

        const nextMap = new Map(previousMap)
        nextMap.set(conversationId, boundedMessages)
        return nextMap
      })

      if (isCurrentUserRecipient) {
        const selectedConversationId = selectedUserIdRef.current
          ? buildDirectConversationId(currentUserId, selectedUserIdRef.current)
          : ''

        if (selectedConversationId !== conversationId) {
          setUnreadCounts((previousMap) => {
            const nextMap = new Map(previousMap)
            const currentCount = nextMap.get(conversationId) ?? 0
            nextMap.set(conversationId, currentCount + 1)
            return nextMap
          })

          playIncomingMessageSound()
        }
      }
    })
    const unsubscribeState = service.subscribeConnectionState(setConnectionState)

    return () => {
      unsubscribeUsers()
      unsubscribeMessages()
      unsubscribeState()
    }
  }, [service, playIncomingMessageSound])

  const connect = useCallback(async () => {
    if (!isTeamChatEnabled) {
      return
    }
    await service.start()
  }, [isTeamChatEnabled, service])

  const disconnect = useCallback(async () => {
    await service.reset()
    setOnlineUsers([])
    setSelectedUser(null)
    setConversations(new Map())
    setUnreadCounts(new Map())
  }, [service])

  const sendMessage = useCallback(async (recipientUserId: string, text: string) => {
    const normalizedText = text.trim()

    if (!recipientUserId || !normalizedText) {
      return
    }

    await service.sendMessage(recipientUserId, normalizedText.slice(0, 1000))
  }, [service])

  const getConversationIdForUser = useCallback((otherUserId: string) => {
    const currentUserId = currentUserIdRef.current ?? ''
    return buildDirectConversationId(currentUserId, otherUserId)
  }, [])

  const getConversationMessages = useCallback((conversationId: string): TeamChatMessage[] => {
    if (!conversationId) {
      return []
    }

    return conversations.get(conversationId) ?? []
  }, [conversations])

  const selectUser = useCallback((nextUser: TeamChatOnlineUser) => {
    setSelectedUser(nextUser)

    const currentUserId = currentUserIdRef.current ?? ''
    const conversationId = buildDirectConversationId(currentUserId, nextUser.UserId)
    if (conversationId) {
      markConversationAsRead(conversationId)
    }
  }, [markConversationAsRead])

  const clearSelectedUser = useCallback(() => {
    setSelectedUser(null)
  }, [])

  useEffect(() => {
    let isDisposed = false

    const run = async () => {
      if (!user || user.role === 'client' || !isTeamChatEnabled) {
        previousUserIdRef.current = null
        await service.reset()
        if (!isDisposed) {
          setOnlineUsers([])
          setSelectedUser(null)
          setConversations(new Map())
          setUnreadCounts(new Map())
        }
        return
      }

      const previousUserId = previousUserIdRef.current
      const isNewLoginSession = !!previousUserId && previousUserId !== user.id

      if (isNewLoginSession) {
        await service.reset()
      }

      previousUserIdRef.current = user.id
      await service.start()
    }

    void run()

    return () => {
      isDisposed = true
    }
  }, [user?.id, user?.role, isTeamChatEnabled, service])

  useEffect(() => {
    if (!selectedUser) return

    const selectedOnlineUser = onlineUsers.find((onlineUser) => onlineUser.UserId === selectedUser.UserId)
    if (!selectedOnlineUser) {
      setSelectedUser(null)
      return
    }

    if (selectedOnlineUser.FullName !== selectedUser.FullName) {
      setSelectedUser(selectedOnlineUser)
    }
  }, [onlineUsers, selectedUser])

  const totalUnreadCount = useMemo(() => {
    let total = 0
    unreadCounts.forEach((count) => {
      total += count
    })
    return total
  }, [unreadCounts])

  useEffect(() => {
    return () => {
      void service.dispose()
    }
  }, [service])

  const value = useMemo<TeamChatContextValue>(
    () => ({
      onlineUsers,
      selectedUser,
      conversations,
      unreadCounts,
      totalUnreadCount,
      connectionState,
      connect,
      disconnect,
      sendMessage,
      getConversationIdForUser,
      getConversationMessages,
      markConversationAsRead,
      selectUser,
      clearSelectedUser,
    }),
    [onlineUsers, selectedUser, conversations, unreadCounts, totalUnreadCount, connectionState, connect, disconnect, sendMessage, getConversationIdForUser, getConversationMessages, markConversationAsRead, selectUser, clearSelectedUser]
  )

  return <TeamChatContext.Provider value={value}>{children}</TeamChatContext.Provider>
}
