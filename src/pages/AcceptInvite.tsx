import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("קישור ההזמנה אינו תקין.");
      return;
    }

    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים.");
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/accept-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      if (!response.ok) {
        const message = await response.text();

        if (response.status === 400) {
          throw new Error(
            "קישור ההזמנה אינו תקין או שפג תוקפו. יש לבקש מהמרפאה הזמנה חדשה."
          );
        }

        throw new Error(message || "לא ניתן להפעיל את החשבון.");
      }

      navigate("/login?invite=success", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "אירעה שגיאה בהפעלת החשבון."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: 20,
        background: "#f5f7fa",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 30,
          borderRadius: 12,
          background: "white",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: 8 }}>הפעלת חשבון מפענח</h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: 24,
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          הגדר סיסמה כדי להפעיל את החשבון שלך ב-Clienta.
        </p>

        {!token ? (
          <p style={{ color: "#dc2626" }}>
            קישור ההזמנה אינו תקין.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label
              htmlFor="password"
              style={{ display: "block", marginBottom: 6 }}
            >
              סיסמה חדשה
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 14,
                padding: 11,
              }}
            />

            <label
              htmlFor="confirmPassword"
              style={{ display: "block", marginBottom: 6 }}
            >
              אימות סיסמה
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginBottom: 18,
                padding: 11,
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 11,
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "מפעיל חשבון..." : "הפעל חשבון"}
            </button>
          </form>
        )}

        {error && (
          <p
            role="alert"
            style={{
              color: "#dc2626",
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}