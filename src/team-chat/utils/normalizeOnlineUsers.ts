import type { TeamChatOnlineUser } from '../types/TeamChatOnlineUser'

const normalizeUser = (input: any): TeamChatOnlineUser | null => {
  if (!input || typeof input !== 'object') return null

  const userId = String(input.UserId ?? input.userId ?? '').trim()
  if (!userId) return null

  const fullName = String(input.FullName ?? input.fullName ?? '').trim() || 'Unknown User'
  const connectedAt = String(input.ConnectedAt ?? input.connectedAt ?? new Date(0).toISOString())

  return {
    UserId: userId,
    FullName: fullName,
    ConnectedAt: connectedAt,
  }
}

export const normalizeOnlineUsers = (payload: unknown): TeamChatOnlineUser[] => {
  if (!Array.isArray(payload)) return []

  const users = payload
    .map((entry) => normalizeUser(entry))
    .filter((entry): entry is TeamChatOnlineUser => Boolean(entry))

  users.sort((a, b) => a.FullName.localeCompare(b.FullName, undefined, { sensitivity: 'base' }))
  return users
}
