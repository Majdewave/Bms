import { useEffect } from "react";

export default function BillingSuccess() {
  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id");

        if (!sessionId) {
          throw new Error("No session_id");
        }

        const res = await fetch(`/api/stripe/confirm-session?session_id=${sessionId}`);

        if (!res.ok) {
          throw new Error("Confirm failed");
        }

        const data = await res.json();

        // 👉 חשוב מאוד
        localStorage.setItem("token", data.token);

        window.location.href = "/dashboard";
      } catch (err) {
        console.error(err);
        alert("Payment confirmed but failed to sync. Please refresh.");
        window.location.href = "/dashboard";
      }
    };

    confirmPayment();
  }, []);

  return <div>Processing payment...</div>;
}