const trimTrailingSlash = (value: string) => value.replace(/\/$/, '')

export const getApiBaseUrl = () => {
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
  if (fromEnv && fromEnv.trim().length > 0) {
    return trimTrailingSlash(fromEnv)
  }

  if (typeof window !== 'undefined') {
    return trimTrailingSlash(window.location.origin)
  }

  return ''
}