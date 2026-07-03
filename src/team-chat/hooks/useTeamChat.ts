import { useContext } from 'react'
import { TeamChatContext } from '../context/TeamChatProvider'

export const useTeamChat = () => {
  const context = useContext(TeamChatContext)

  if (!context) {
    throw new Error('useTeamChat must be used within TeamChatProvider')
  }

  return {
    onlineUsers: context.onlineUsers,
    selectedUser: context.selectedUser,
    conversations: context.conversations,
    unreadCounts: context.unreadCounts,
    totalUnreadCount: context.totalUnreadCount,
    connectionState: context.connectionState,
    isConnected: context.connectionState === 'Connected',
    connect: context.connect,
    disconnect: context.disconnect,
    sendMessage: context.sendMessage,
    getConversationIdForUser: context.getConversationIdForUser,
    getConversationMessages: context.getConversationMessages,
    markConversationAsRead: context.markConversationAsRead,
    selectUser: context.selectUser,
    clearSelectedUser: context.clearSelectedUser,
  }
}
