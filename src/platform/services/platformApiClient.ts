import { PLATFORM_TOKEN_STORAGE_KEY, isPlatformJwtValid } from '@/platform/auth/platformToken'

const getApiBaseUrl = () => {
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
  return (fromEnv ?? '').replace(/\/$/, '')
}

export class PlatformApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function platformRequest<T>(
  path: string,
  init: RequestInit = {},
  explicitToken?: string,
): Promise<T> {
  const token = explicitToken ?? localStorage.getItem(PLATFORM_TOKEN_STORAGE_KEY) ?? ''

  if (!token || !isPlatformJwtValid(token)) {
    throw new PlatformApiError('Platform session is invalid or expired. Please login again.', 401, 'INVALID_PLATFORM_TOKEN')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message = (payload && typeof payload.message === 'string' && payload.message) ||
      `Platform request failed (${response.status})`
    const code = payload && typeof payload.code === 'string' ? payload.code : undefined
    throw new PlatformApiError(message, response.status, code)
  }

  return payload as T
}
