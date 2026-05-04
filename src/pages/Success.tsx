import { useEffect, useState } from "react";

export default function Success() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");

    if (!sessionId) {
      setError("Missing session_id in URL.");
      setLoading(false);
      return;
    }

    fetch(`https://clienta.digitalpenpro.com/api/stripe/confirm-session?session_id=${sessionId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to confirm session");
        return res.json();
      })
      .then(data => {
        if (data.token) {
          localStorage.setItem("authToken", data.token);

          //  UX קטן
          setTimeout(() => {
            window.location.href = "/admin/dashboard";
          }, 1500);
        } else {
          setError("No token returned from server.");
          setLoading(false);
        }
      })
      .catch(err => {
        setError(err.message || "Unknown error");
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 64 }}>
        <h2>✅ התשלום בוצע בהצלחה🎉</h2>
        <p>החשבון שלך בתהליך הגדרה...</p>
        <p>נשלח אליך מייל עם פרטים.</p>
      </div>
    );

  if (error)
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: 64 }}>
        <h2>❌ Error</h2>
        <p>{error}</p>
      </div>
    );

  return null;
}