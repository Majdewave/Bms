import type { TeamChatMessage } from '../types/TeamChatMessage'

const readString = (value: unknown): string => (typeof value === 'string' ? value : '')

export const normalizeTeamChatMessage = (payload: unknown): TeamChatMessage | null => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const source = payload as Record<string, unknown>
  const id = readString(source.id ?? source.Id)
  const senderUserId = readString(source.senderUserId ?? source.SenderUserId)
  const senderName = readString(source.senderName ?? source.SenderName)
  const recipientUserId = readString(source.recipientUserId ?? source.RecipientUserId)
  const text = readString(source.text ?? source.Text)
  const sentAt = readString(source.sentAt ?? source.SentAt)

  if (!id || !senderUserId || !senderName || !recipientUserId || !text || !sentAt) {
    return null
  }

  return {
    id,
    senderUserId,
    senderName,
    recipientUserId,
    text,
    sentAt,
  }
}