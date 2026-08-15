import { useEffect } from "react";

export default function BillingSuccess() {
  useEffect(() => {
    window.location.replace(`/success${window.location.search}`);
  }, []);

  return <div>Redirecting...</div>;
}