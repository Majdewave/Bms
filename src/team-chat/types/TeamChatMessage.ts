export interface TeamChatMessage {
  id: string
  senderUserId: string
  senderName: string
  recipientUserId: string
  text: string
  sentAt: string
}