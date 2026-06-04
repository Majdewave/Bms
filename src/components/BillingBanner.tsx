import { useTenant } from "@/hooks/useTenant";

import { useTenant } from "@/hooks/useTenant";

export default function BillingBanner() {
  const { tenant, daysLeft } = useTenant();

  if (!tenant) return null;

  const isCanceling =
    tenant.subscriptionStatus === "Active" &&
    tenant.subscriptionEndsAt &&
    new Date(tenant.subscriptionEndsAt) > new Date();

  if (tenant.subscriptionStatus === "Active") {
    return (
      <div
        className={`px-4 py-2 rounded-xl mb-4 border ${
          isCanceling
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-green-50 border-green-200 text-green-800"
        }`}
      >
        {isCanceling ? (
          <div className="flex flex-col gap-1">
            <span>⚠️ המנוי יבוטל בסוף התקופה</span>
            <span className="text-sm">
              פעיל עד{" "}
              {new Date(tenant.subscriptionEndsAt!).toLocaleDateString("he-IL")}
            </span>
          </div>
        ) : (
          <span>✅ Pro Plan Active</span>
        )}
      </div>
    );
  }

  if (tenant.trialEndsAt) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl mb-4 flex justify-between items-center">
        <span>Trial · {daysLeft} days left ⚡</span>

        <button
          onClick={() => (window.location.href = "/billing")}
          className="text-blue-600 font-semibold hover:underline"
        >
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-xl mb-4 flex justify-between items-center">
      <span>Subscription expired</span>

      <button
        onClick={() => (window.location.href = "/billing")}
        className="text-red-600 font-semibold hover:underline"
      >
        Upgrade
      </button>
    </div>
  );
}
