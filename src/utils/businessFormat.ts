// Locale-aware formatting for the Business dashboard. Latin digits are forced so Hebrew/Arabic match the rest of the app.
const locale = (language: string) => `${language || 'en'}-u-nu-latn`

export const formatMoney = (value: number, currency: string, language: string) => {
  try {
    return new Intl.NumberFormat(locale(language), { style: 'currency', currency }).format(value)
  } catch {
    return `${new Intl.NumberFormat(locale(language), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${currency}`
  }
}

// Billing due dates are date-only values stored as UTC midnight, so format in UTC to avoid shifting the day.
export const formatDueDate = (iso: string, language: string) =>
  new Date(iso).toLocaleDateString(locale(language), { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
