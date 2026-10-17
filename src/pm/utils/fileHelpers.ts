import { ApiError } from '@/api/apiClient'

export const formatFileSize = (bytes: number) => {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export const fileExtension = (fileName: string) => {
  const index = fileName.lastIndexOf('.')
  return index >= 0 ? fileName.slice(index + 1).toUpperCase() : ''
}

export const displayTitle = (file: { title?: string | null; fileName: string }) =>
  file.title && file.title.trim() ? file.title : file.fileName

// Maps an API failure to a pm.files.errors.* key; never surfaces raw server text.
export const fileErrorKey = (error: unknown, fallback: 'upload' | 'rename' | 'delete' | 'download'): string => {
  const status = error instanceof ApiError ? error.status : 0
  if (status === 400) return fallback === 'upload' ? 'pm.files.errors.invalidFile' : 'pm.files.errors.invalidTitle'
  if (status === 401) return 'pm.files.errors.session'
  if (status === 403) return 'pm.files.errors.forbidden'
  if (status === 404) return 'pm.files.errors.notFound'
  if (status === 409) return 'pm.files.errors.conflict'
  return `pm.files.errors.${fallback}`
}

export const saveBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
