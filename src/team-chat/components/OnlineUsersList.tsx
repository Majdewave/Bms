import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'
import OnlineUserCard from './OnlineUserCard'
import ChatEmptyState from './ChatEmptyState'

interface OnlineUsersListProps {
  users: TeamChatOnlineUser[]
  unreadCountsByUserId: Map<string, number>
  previewsByUserId: Map<string, string>
  selectedUserId?: string
  onSelectUser: (user: TeamChatOnlineUser) => void
}

export default function OnlineUsersList({
  users,
  unreadCountsByUserId,
  previewsByUserId,
  selectedUserId,
  onSelectUser,
}: OnlineUsersListProps) {
  if (users.length === 0) {
    return <ChatEmptyState />
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2">
      {users.map((user) => (
        <OnlineUserCard
          key={user.UserId}
          user={user}
          unreadCount={unreadCountsByUserId.get(user.UserId) ?? 0}
          lastMessagePreview={previewsByUserId.get(user.UserId)}
          isSelected={user.UserId === selectedUserId}
          onClick={() => onSelectUser(user)}
        />
      ))}
    </div>
  )
}
