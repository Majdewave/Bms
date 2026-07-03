export const TEAM_CHAT_HUB_PATH = '/hubs/team-chat'

export const TEAM_CHAT_RECONNECT_DELAYS_MS: number[] = [0, 2000, 5000, 10000, 30000]

export const TEAM_CHAT_EVENT_NAMES = {
  OnlineUsersChanged: 'OnlineUsersChanged',
  ReceiveMessage: 'ReceiveMessage',
} as const
