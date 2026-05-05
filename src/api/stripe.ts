import axios from "axios";

export async function createCheckoutSession(data: { plan: string; tenantId: string }) {
const res = await axios.post(
  "/api/stripe/create-checkout-session",
  data,
  { withCredentials: true }
);
    return res.data;
}