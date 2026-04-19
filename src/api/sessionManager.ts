// sessionManager.ts
// Handles session activity, idle timeout, and token refresh logic

let lastActivity = Date.now()

export function updateLastActivity() {
  lastActivity = Date.now()
}

export function getLastActivity() {
  return lastActivity
}

export function isSessionExpired(timeoutMs = 60 * 60 * 1000) {
  return Date.now() - lastActivity > timeoutMs
}

export function resetSession() {
  lastActivity = 0
}
