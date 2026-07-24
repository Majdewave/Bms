const trimTrailingSlash = (value: string) => value.replace(/\/$/, '')

export const getApiBaseUrl = () => {
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
  if (fromEnv && fromEnv.trim().length > 0) {
    return trimTrailingSlash(fromEnv)
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const backendPort = port === '5173' || port === '5174' || port === '5175' ? '5000' : port
      return trimTrailingSlash(`${protocol}//${hostname}${backendPort ? `:${backendPort}` : ''}`)
    }

    return trimTrailingSlash(window.location.origin)
  }

  return ''
}