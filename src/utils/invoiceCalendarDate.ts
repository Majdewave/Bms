const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const toInvoiceDateRequest = (value: string): string => value

export const toInvoiceDateInput = (value: string | null | undefined): string =>
  value ? value.slice(0, 10) : ''

export const getLocalInvoiceCalendarDate = (now = new Date()): string => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatInvoiceCalendarDate = (value: string, locale?: string): string => {
  const dateOnly = toInvoiceDateInput(value)
  const match = DATE_ONLY_PATTERN.exec(dateOnly)
  if (!match) return '-'

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale || 'en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
