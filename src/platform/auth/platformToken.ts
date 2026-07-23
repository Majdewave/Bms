export interface PlatformJwtPayload {
  exp?: number
  token_scope?: string
  role?: string
  [key: string]: unknown
}

export const PLATFORM_TOKEN_STORAGE_KEY = 'platform_token'

export function decodeJwtPayload(token: string): PlatformJwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const normalized = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const decoded = atob(normalized)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function isPlatformJwtValid(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload) return false

  if (payload.token_scope !== 'platform') return false

  if (typeof payload.exp !== 'number') return false

  const nowInSeconds = Math.floor(Date.now() / 1000)
  return payload.exp > nowInSeconds
}
