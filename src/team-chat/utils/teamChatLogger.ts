const isDevelopment = import.meta.env.DEV

export const teamChatLogger = {
  info(message: string, details?: unknown) {
    if (!isDevelopment) return
    if (typeof details === 'undefined') {
      console.info(`[TeamChat] ${message}`)
      return
    }
    console.info(`[TeamChat] ${message}`, details)
  },
  warn(message: string, details?: unknown) {
    if (!isDevelopment) return
    if (typeof details === 'undefined') {
      console.warn(`[TeamChat] ${message}`)
      return
    }
    console.warn(`[TeamChat] ${message}`, details)
  },
  error(message: string, details?: unknown) {
    if (!isDevelopment) return
    if (typeof details === 'undefined') {
      console.error(`[TeamChat] ${message}`)
      return
    }
    console.error(`[TeamChat] ${message}`, details)
  },
}
