import { platformRequest } from '@/platform/services/platformApiClient'

export type BusinessPlanType = 'Trial' | 'Basic' | 'Pro'

export interface BusinessPlanConfiguration {
  productType: 'Business'
  planType: BusinessPlanType
  displayName: string
  description: string | null
  monthlyPrice: number | null
  annualPrice: number | null
  enabled: boolean
  availableForPurchase: boolean
  displayOrder: number
  capabilities: string[]
}

export type UpdateBusinessPlanConfiguration = Pick<
  BusinessPlanConfiguration,
  'displayName' | 'description' | 'monthlyPrice' | 'annualPrice' | 'enabled' | 'displayOrder'
>

export async function fetchBusinessPlanConfigurations(signal?: AbortSignal): Promise<BusinessPlanConfiguration[]> {
  return platformRequest<BusinessPlanConfiguration[]>('/api/platform/business-plans', { method: 'GET', signal })
}

export async function updateBusinessPlanConfiguration(
  planType: BusinessPlanType,
  payload: UpdateBusinessPlanConfiguration,
): Promise<BusinessPlanConfiguration> {
  return platformRequest<BusinessPlanConfiguration>(`/api/platform/business-plans/${planType}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}