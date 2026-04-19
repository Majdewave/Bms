import { useTenant } from "@/hooks/useTenant";

export default function BillingBanner() {
  const { tenant, daysLeft } = useTenant();

  if (!tenant) return null;

  if (tenant.subscriptionStatus === "Active") {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-xl mb-4">
        ✅ Pro Plan Active
      </div>
    );
  }

  if (tenant.trialEndsAt) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-xl mb-4 flex justify-between items-center">
        <span>Trial · {daysLeft} days left ⚡</span>

        <button
          onClick={() => window.location.href = "/billing"}
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
        onClick={() => window.location.href = "/billing"}
        className="text-red-600 font-semibold hover:underline"
      >
        Upgrade
      </button>
    </div>
  );
}
