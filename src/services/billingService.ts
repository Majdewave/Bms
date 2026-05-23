import api from './axios';


export const createBillingPortal = async () => {
  const res = await api.post('/billing/portal');

  return res.data;
};





export const createCheckoutSession = async (
  billingCycle: 'Monthly' | 'Yearly'
) => {

  const res = await api.post(
    '/billing/upgrade',
    {
      planType: 2,
      billingCycle: billingCycle === 'Monthly' ? 0 : 1
    }
  )

  return res.data
}






