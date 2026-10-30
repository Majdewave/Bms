type ApiErrorObject = Record<string, unknown>

const asObject = (value: unknown): ApiErrorObject | null =>
  value && typeof value === 'object' ? value as ApiErrorObject : null

export type AccountingApiErrorDetails = {
  code?: string
  providerCode?: string
  status?: number
  availableBalance?: number
}

export function getAccountingApiErrorDetails(error: unknown): AccountingApiErrorDetails {
  const root = asObject(error)
  const response = asObject(root?.response)
  const payload = asObject(response?.data) ?? response
  const nestedResponse = asObject(payload?.response)
  const document = asObject(payload?.document) ?? asObject(nestedResponse?.document)
  const nestedError = asObject(payload?.error)
  const details = asObject(payload?.details)
  const providerResponse = asObject(payload?.providerResponse)
  const code = [payload?.code, nestedResponse?.code, nestedError?.code, payload?.error, root?.code]
    .find((value): value is string => typeof value === 'string')
  const providerCode = [
    document?.providerResponseCode,
    payload?.providerResponseCode,
    payload?.providerCode,
    details?.providerResponseCode,
    providerResponse?.code,
    nestedError?.providerResponseCode,
    nestedError?.providerCode,
  ]
    .find((value): value is string => typeof value === 'string')
  const status = [root?.status, response?.status]
    .find((value): value is number => typeof value === 'number')
  const availableBalance = [payload?.availableBalance, nestedResponse?.availableBalance]
    .find((value): value is number => typeof value === 'number')

  return { code, providerCode, status, availableBalance }
}
