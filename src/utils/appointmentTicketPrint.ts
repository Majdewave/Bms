export const scheduleAppointmentTicketPrint = () => {
  return window.setTimeout(() => {
    window.print()
  }, 0)
}

export const formatAppointmentTicketDate = (value: string, locale?: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString(locale || undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export const formatAppointmentTicketTime = (value: string, locale?: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleTimeString(locale || undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
