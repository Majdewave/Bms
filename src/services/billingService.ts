import api from './axios';

// Values mirror Clienta.Api.Models.PlanType.
export enum PlanType {
  Trial = 0,
  Basic = 1,
  Pro = 2,
  Enterprise = 3,
}

export const createBillingPortal = async () => {
  const res = await api.post('/billing/portal');

  return res.data;
};





export const createCheckoutSession = async (
  planType: PlanType,
  billingCycle: 'Monthly' | 'Yearly'
) => {

  const res = await api.post(
    '/billing/upgrade',
    {
      planType,
      billingCycle: billingCycle === 'Monthly' ? 0 : 1
    }
  )

  return res.data
}

export type ChangePlanResult = {
  type: 'upgrade' | 'downgrade'
  currentPlan?: string
  newPlan?: string
  scheduledPlan?: string | null
  scheduledDate?: string | null
  effectiveImmediately: boolean
  message?: string
}

export const changePlan = async (
  planType: PlanType,
  billingCycle: 'Monthly' | 'Yearly'
): Promise<ChangePlanResult> => {
  const res = await api.post('/billing/change-plan', {
    newPlan: planType,
    newCycle: billingCycle === 'Monthly' ? 0 : 1,
  })

  return res.data
}






