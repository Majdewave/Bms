import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'
import ChatHeader from './ChatHeader'
import OnlineUsersList from './OnlineUsersList'

interface OnlineUsersViewProps {
  users: TeamChatOnlineUser[]
  unreadCountsByUserId: Map<string, number>
  previewsByUserId: Map<string, string>
  selectedUserId?: string
  onSelectUser: (user: TeamChatOnlineUser) => void
  onClose: () => void
}

export default function OnlineUsersView({
  users,
  unreadCountsByUserId,
  previewsByUserId,
  selectedUserId,
  onSelectUser,
  onClose,
}: OnlineUsersViewProps) {
  const subtitle =
    users.length === 0
      ? 'אין אנשי צוות מחוברים'
      : `${users.length} אנשי צוות מחוברים`

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0">
        <ChatHeader subtitle={subtitle} onClose={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-white">
        <OnlineUsersList
          users={users}
          unreadCountsByUserId={unreadCountsByUserId}
          previewsByUserId={previewsByUserId}
          onSelectUser={onSelectUser}
          selectedUserId={selectedUserId}
        />
      </div>
    </div>
  )
}