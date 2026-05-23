import api from './axios';

export const createBillingPortal = async () => {
  const res = await api.post('/billing/portal');

  return res.data;
};



