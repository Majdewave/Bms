export const buildDirectConversationId = (userAId: string, userBId: string): string => {
  const first = (userAId || '').trim().toLowerCase()
  const second = (userBId || '').trim().toLowerCase()

  if (!first || !second) {
    return ''
  }

  return first < second ? `${first}_${second}` : `${second}_${first}`
}