import { useEffect, useState } from "react";

export type TenantInfo = {
  id: string;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  isSuspended: boolean;
};

type BillingStatus = {
  plan?: string;
  subscriptionStatus?: string;
  trialEndsAt?: string | null;
  isSuspended?: boolean;
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
        const token = localStorage.getItem("token");

        const [tenantResponse, billingResponse] = await Promise.allSettled([
          fetch("/api/tenant/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/billing/status", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (tenantResponse.status !== "fulfilled") {
          throw new Error("Failed to fetch tenant info");
        }

        const res = tenantResponse.value;
        if (!res.ok) throw new Error("Failed to fetch tenant info");
        const tenantData = (await res.json()) as TenantInfo;

        let mergedTenant: TenantInfo = tenantData;

        if (billingResponse.status === "fulfilled" && billingResponse.value.ok) {
          const billingData = (await billingResponse.value.json()) as BillingStatus;
          mergedTenant = {
            ...tenantData,
            plan: billingData.plan ?? tenantData.plan,
            subscriptionStatus:
              billingData.subscriptionStatus ?? tenantData.subscriptionStatus,
            trialEndsAt:
              typeof billingData.trialEndsAt === "string"
                ? billingData.trialEndsAt
                : tenantData.trialEndsAt,
            isSuspended:
              typeof billingData.isSuspended === "boolean"
                ? billingData.isSuspended
                : tenantData.isSuspended,
          };
        }

        setTenant(mergedTenant);
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
  const daysLeft = isTrial && tenant?.trialEndsAt
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
