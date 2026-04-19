import { useTranslation } from "react-i18next";
import { useTenant } from "@/hooks/useTenant";

export default function BillingPage() {
  const { t } = useTranslation();
  const { tenant, isTrial, isExpired, isPaid, daysLeft, loading, error } = useTenant();

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!res.ok) throw new Error("Failed to create checkout session");

      const data = await res.json();

      if (!data.url) throw new Error("No checkout URL returned");

      window.location.href = data.url;
    } catch (err) {
      console.error("Stripe checkout error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-red-600 text-lg">Unable to load billing info.</div>
      </div>
    );
  }

  // ✅ ACTIVE
  if (tenant.subscriptionStatus === "Active") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-green-700 mb-2">Pro Plan Active</h1>
          <p className="text-gray-600">Your Pro subscription is active.</p>
        </div>
      </div>
    );
  }

  // ⏳ TRIAL
  if (tenant.trialEndsAt) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-bold text-center mb-4">
              🚨 Trial · {daysLeft} days left
            </h1>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/stripe/create-checkout-session", {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                  });
                  if (!res.ok) throw new Error("Failed to create checkout session");
                  const data = await res.json();
                  if (!data.url) throw new Error("No checkout URL returned");
                  window.location.href = data.url;
                } catch (err) {
                  alert("Something went wrong. Please try again.");
                }
              }}
              className="mt-6 w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-semibold"
            >
              🚀 Upgrade
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ❌ EXPIRED
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <h1 className="text-3xl font-bold text-red-700 mb-2">
          Subscription expired
        </h1>
        <button
          onClick={async () => {
            try {
              const res = await fetch("/api/stripe/create-checkout-session", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
              });
              if (!res.ok) throw new Error("Failed to create checkout session");
              const data = await res.json();
              if (!data.url) throw new Error("No checkout URL returned");
              window.location.href = data.url;
            } catch (err) {
              alert("Something went wrong. Please try again.");
            }
          }}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Upgrade now
        </button>
      </div>
    </div>
  );
}