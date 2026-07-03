import type { TeamChatOnlineUser } from './TeamChatOnlineUser'
import type { TeamChatMessage } from './TeamChatMessage'

export interface TeamChatEvents {
  OnlineUsersChanged: TeamChatOnlineUser[]
  ReceiveMessage: TeamChatMessage
}
