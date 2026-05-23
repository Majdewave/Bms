import { useEffect, useState } from "react";

export type TenantInfo = {
  id: string;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt?: string;
  isSuspended: boolean;
};

export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tenant/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch tenant info");
        const data = await res.json();
        setTenant(data);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchTenant();
  }, []);

  const isTrial = tenant?.plan === "Trial";
  const isExpired =
    isTrial &&
    tenant?.trialEndsAt &&
    new Date(tenant.trialEndsAt) < new Date();
  const isPaid = tenant?.plan === "Pro" || tenant?.plan === "Basic";
  const daysLeft = tenant?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(tenant.trialEndsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return { tenant, isTrial, isExpired, isPaid, daysLeft, loading, error };
}
