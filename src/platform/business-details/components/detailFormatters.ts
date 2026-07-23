export const formatDate = (value: string | null): string => {
  if (!value) return '-'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return '-'
  return timestamp.toLocaleDateString()
}

export const formatDateTime = (value: string | null): string => {
  if (!value) return '-'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return '-'
  return timestamp.toLocaleString()
}

export const formatText = (value: string | null): string => {
  if (!value || !value.trim()) return '-'
  return value
}

export const formatBoolean = (value: boolean | null): string => {
  if (value === null) return '-'
  return value ? 'Yes' : 'No'
}
