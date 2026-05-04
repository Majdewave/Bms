import axios from "axios";

export async function createCheckoutSession(plan: string) {
  const res = await axios.post("/api/stripe/create-checkout-session", { plan });
  return res.data;
}
