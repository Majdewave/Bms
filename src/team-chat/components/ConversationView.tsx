import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamChat } from '../hooks/useTeamChat'
import ConversationHeader from './ConversationHeader'
import ConversationMessages from './ConversationMessages'
import ConversationComposer from './ConversationComposer'
import TemporaryChatNotice from './TemporaryChatNotice'

interface ConversationViewProps {
  user: TeamChatOnlineUser
  onBack: () => void
  onClose: () => void
}

export default function ConversationView({ user, onBack, onClose }: ConversationViewProps) {
  const { user: authUser } = useAuth()
  const { getConversationIdForUser, getConversationMessages, sendMessage } = useTeamChat()
  const conversationId = getConversationIdForUser(user.UserId)
  const messages = getConversationMessages(conversationId)

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0">
        <ConversationHeader user={user} onBack={onBack} onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1 bg-white">
        <TemporaryChatNotice />
        <ConversationMessages
          messages={messages}
          currentUserId={authUser?.id ?? ''}
        />
      </div>

      <div className="shrink-0">
        <ConversationComposer
          onSend={(text) => sendMessage(user.UserId, text)}
        />
      </div>
    </div>
  )
}