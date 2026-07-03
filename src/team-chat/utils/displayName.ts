const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i

const isEmail = (value: string) => EMAIL_REGEX.test(value.trim())

const formatEmailLocalPart = (email: string) => {
  const localPart = email.split('@')[0]?.trim() ?? ''
  if (!localPart) return ''

  return localPart
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const resolveDisplayName = (fullNameOrEmail?: string, fallbackEmail?: string) => {
  const primary = (fullNameOrEmail ?? '').trim()
  if (primary && !isEmail(primary)) {
    return primary
  }

  if (primary && isEmail(primary)) {
    const fromLocalPart = formatEmailLocalPart(primary)
    if (fromLocalPart) {
      return fromLocalPart
    }
  }

  const fallback = (fallbackEmail ?? '').trim()
  if (fallback && !isEmail(fallback)) {
    return fallback
  }

  if (fallback && isEmail(fallback)) {
    const fromLocalPart = formatEmailLocalPart(fallback)
    if (fromLocalPart) {
      return fromLocalPart
    }

    return fallback
  }

  return primary || 'Team Member'
}